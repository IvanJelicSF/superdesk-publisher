import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import _ from "lodash";

import { Button } from "superdesk-ui-framework/react";
import DropdownScrollable from "../../UI/DropdownScrollable";
import SearchBar from "../../UI/SearchBar";
import ArticleItem from "./ArticleItem";
import Loading from "../../UI/Loading/Loading";
import LanguageSelect from "../../UI/LanguageSelect";
import SourceSelect from "../../UI/SourceSelect";

// Window event the Angular controller bridges Superdesk websocket
// notifications onto (see WebPublisherContentListsController). Fired whenever
// an article is published/edited/spiked/etc., so we can live-refresh the lists.
const SD_NOTIFICATION_EVENT = "publisher:content-notification";

// a little function to help us with reordering the result
const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

/**
 * Moves an item from one list to another list.
 */
const move = (source, destination, droppableSource, droppableDestination) => {
  const sourceClone = Array.from(source);
  const destClone = Array.from(destination);
  const [removed] = sourceClone.splice(droppableSource.index, 1);

  destClone.splice(droppableDestination.index, 0, removed);

  const result = {};
  result[droppableSource.droppableId] = sourceClone;
  result[droppableDestination.droppableId] = destClone;

  return result;
};

class Manual extends React.Component {
  constructor(props) {
    super(props);

    this._isMounted = false;
    this._isDragging = false;
    this.listScroll = React.createRef();
    this.articlesScroll = React.createRef();

    this.state = {
      list: {
        items: [],
        page: 0,
        totalPages: 1,
        loading: false,
      },
      articles: {
        items: [],
        page: 0,
        totalPages: 1,
        loading: false,
      },
      listSearchQuery: "",
      articlesFilters: {},
      changesRecord: [],
      // Available-articles panel always queries Superdesk now.
      source: { id: 'published', name: 'Published articles', label: 'Published' },
    };
  }

  componentDidUpdate(prevProps) {
    if (!_.isEqual(this.props.list, prevProps.list)) {
      this.setState(
        {
          list: {
            items: [],
            page: 0,
            totalPages: 1,
            loading: false,
          },
          articles: {
            items: [],
            page: 0,
            totalPages: 1,
            loading: false,
          },
          listSearchQuery: "",
          articlesFilters: {},
          changesRecord: [],
          source: { id: 'published', name: 'Published articles', label: 'Published' },
        },
        this._loadData
      );
    }
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadData();
    this.attachScrollEvents();
    window.addEventListener(SD_NOTIFICATION_EVENT, this.handleNotification);
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.detachScrollEvents();
    window.removeEventListener(SD_NOTIFICATION_EVENT, this.handleNotification);
    this.refreshListDebounced.cancel();
    this.refreshArticlesDebounced.cancel();
  }

  handleNotification = (e) => {
    const detail = (e && e.detail) || {};
    const event = detail.event;

    // Another user changed this list's items (add/move/remove). Only refresh
    // when it's the list currently open here; other lists are irrelevant.
    if (event === "content_list:items_updated") {
      const extra = detail.extra || {};
      if (String(extra.list_id) === String(this.props.list.id)) {
        this.refreshListDebounced();
      }
      return;
    }

    // List collection/metadata events (created/updated/deleted) don't change
    // the open list's items — the parent ContentLists handles those.
    if (typeof event === "string" && event.indexOf("content_list:") === 0) {
      return;
    }

    // Article content changed somewhere (publish/correction/spike/move). Either
    // pane can be affected. The individual refreshers apply their own guards
    // (unsaved edits / drag), so just trigger both — they're debounced and
    // reload in place.
    this.refreshListDebounced();
    this.refreshArticlesDebounced();
  };

  refreshList = () => {
    // Skip while the user has unsaved edits or is mid-drag — a reload would
    // clobber pending reordering/pin/remove changes that aren't saved yet.
    if (!this._isMounted || this._isDragging || this.state.changesRecord.length)
      return;

    // Reload every currently shown item in one page so nothing visibly drops.
    const limit = Math.max(25, this.state.list.items.length);
    this._queryListArticles(true, limit);
  };

  // Debounced so a burst of events (and Superdesk's own slight delay between
  // pushing an event and the data being queryable) collapses into one reload.
  refreshListDebounced = _.debounce(() => this.refreshList(), 1000);

  refreshArticles = () => {
    // Don't yank the picker out from under an in-progress drag.
    if (!this._isMounted || this._isDragging) return;

    // Reload every currently shown article in one request so the pane updates
    // in place (matching results keep their DOM node, so scroll is preserved).
    this._querySuperdeskArticles(
      this.state.source.id,
      true,
      this.state.articles.items.length
    );
  };

  refreshArticlesDebounced = _.debounce(() => this.refreshArticles(), 1000);

  scrollListener = (e, list) => {
    if (e.type !== "scroll") return;
    let el = null;

    if (list === "articles") {
      el = this.articlesScroll.current;
    } else {
      el = this.listScroll.current;
    }

    let listEl = el.querySelector(".sd-list-item-group");

    if (listEl.scrollHeight - el.scrollTop - el.clientHeight < 100) {
      if (list === "articles") {
        this._querySuperdeskArticles();
      } else {
        this._queryListArticles();
      }
    }
  };

  scrollListenerList = _.debounce((e) => this.scrollListener(e, "list"), 150);
  scrollListenerArticles = _.debounce(
    (e) => this.scrollListener(e, "articles"),
    150
  );

  attachScrollEvents = () => {
    this.listScroll.current.addEventListener(
      "scroll",
      this.scrollListenerList,
      false
    );

    this.articlesScroll.current.addEventListener(
      "scroll",
      this.scrollListenerArticles,
      false
    );
  };

  detachScrollEvents = () => {
    this.listScroll.current.removeEventListener(
      "scroll",
      this.scrollListenerList,
      false
    );

    this.articlesScroll.current.removeEventListener(
      "scroll",
      this.scrollListenerArticles,
      false
    );
  };

  _loadData = () => {
    this._querySuperdeskArticles(this.state.source.id, true);
    this._queryListArticles(true);
  };

  _queryListArticles = (reset = false, limit = 25) => {
    let list = this.state.list;
    if (list.loading || (list.page === list.totalPages && !reset)) return;

    if (reset) {
      list = {
        items: [],
        page: 0,
        totalPages: 1,
        loading: false,
      };
    }

    list.loading = true;
    this.setState({ list }, () => {
      const params = {
        limit,
        page: this.state.list.page + 1,
      };

      this.props.publisher
        .queryListArticlesWithDetails(this.props.list.id, params)
        .then((response) => {
          const newItems = [
            ...this.state.list.items,
            ...response._embedded._items,
          ];
          // Server returns items in arbitrary order; UI relies on the array
          // being position-sorted because drag indices use array position.
          newItems.sort((a, b) => (a.position || 0) - (b.position || 0));

          const newList = {
            page: response.page,
            totalPages: response.pages,
            items: newItems,
            loading: false,
          };
          if (this._isMounted) this.setState({ list: newList });
        })
        .catch(() => {
          this.props.api.notify.error("Cannot load list items.");
          const newList = { ...this.state.list, loading: false };
          if (this._isMounted) this.setState({ list: newList });
        });
    });
  };

  // sizeOverride (used by the live refresh) reloads the first N already-loaded
  // items in a single request instead of one 20-item page, so an in-place
  // refresh keeps every visible article. It is rounded up to a multiple of the
  // 20-item page size so infinite scroll continues from a clean page boundary.
  _querySuperdeskArticles = (
    state = this.state.source.id,
    reset = false,
    sizeOverride = null
  ) => {
    let articles = this.state.articles;
    if (articles.loading || (articles.page === articles.totalPages && !reset))
      return;

    if (reset) {
      articles = {
        items: [],
        page: 0,
        totalPages: 1,
        loading: false,
      };
    }

    articles.loading = true;
    this.setState({ articles }, () => {
      const size = sizeOverride
        ? Math.max(20, Math.ceil(sizeOverride / 20) * 20)
        : 20;
      const from = sizeOverride ? 0 : this.state.articles.page * 20;
      const term = this.state.articlesFilters && this.state.articlesFilters.term
        ? this.state.articlesFilters.term
        : null;

      const isPublished = state === 'published';
      let query;

      if (isPublished) {
        // The /published collection keeps every published version of a story
        // (the original plus each correction), and a correction's state becomes
        // "corrected" rather than "published" — so we can't filter on
        // state === 'published' (that only matches the stale original). Instead
        // drop superseded versions via last_published_version and exclude
        // killed/recalled, yielding one current entry per story (matching how
        // Superdesk's own published view behaves).
        //
        // Use a plain bool query (NOT the deprecated `filtered`, removed in ES5)
        // since eve_elastic passes source.query straight through to ES.
        const must = [{ term: { type: 'text' } }];

        if (term) {
          must.push({
            query_string: { query: term, lenient: true, default_operator: 'AND' },
          });
        }

        query = {
          query: {
            bool: {
              must,
              must_not: [
                { term: { last_published_version: false } },
                { terms: { state: ['killed', 'recalled'] } },
              ],
            },
          },
          from,
          size,
          sort: [{ versioncreated: 'desc' }],
        };
      } else {
        query = {
          query: {
            filtered: {
              filter: {
                and: [{ term: { state } }, { term: { type: 'text' } }],
              },
            },
          },
          from,
          size,
          sort: [{ versioncreated: 'desc' }],
        };

        if (term) {
          query.query.filtered.query = {
            query_string: { query: term, lenient: true, default_operator: 'AND' },
          };
        }
      }

      // Published items come from the dedicated /published endpoint; everything
      // else (scheduled, in_progress, draft, ...) lives in the archive search.
      const request = isPublished
        ? this.props.publisher.searchPublishedArticles(query)
        : this.props.publisher.searchSuperdeskArticles(query, { repo: 'archive' });

      request
        .then((response) => {
          const labelMap = {
            published: 'Published',
            scheduled: 'Scheduled',
            in_progress: 'In progress',
          };
          const sourceLabel =
            (this.state.source && this.state.source.label) ||
            labelMap[state] ||
            state;

          const articleItemsMapped = response._items.map((article) => {
            const {
              _id,
              guid,
              authors,
              body_html,
              headline,
              versioncreated,
              firstcreated,
              _updated,
              _created,
              publish_schedule,
              associations,
              anpa_category,
              service,
              state: docState,
            } = article;

            const category =
              (anpa_category && anpa_category[0] && anpa_category[0].name) ||
              (service && service[0] && service[0].name) ||
              null;

            return {
              id: guid || _id,
              authors,
              body: body_html,
              title: headline,
              published_at: versioncreated,
              updated_at: _updated || versioncreated,
              created_at: _created || firstcreated || versioncreated,
              publish_schedule,
              status: docState || sourceLabel,
              category,
              associations,
            };
          });

          const total = (response._meta && response._meta.total) || 0;
          const items = sizeOverride
            ? articleItemsMapped
            : [...this.state.articles.items, ...articleItemsMapped];
          // On a sizeOverride reload we fetched several pages at once, so derive
          // the page cursor from how many items we actually have.
          const page = sizeOverride
            ? Math.ceil(articleItemsMapped.length / 20)
            : this.state.articles.page + 1;
          const newArticles = {
            page,
            totalPages: Math.ceil(total / 20) || 1,
            items,
            loading: false,
          };

          if (this._isMounted) this.setState({ articles: newArticles });
        })
        .catch((err) => {
          console.error('Failed to query Superdesk articles:', err);
          const newArticles = { ...this.state.articles, loading: false };
          if (this._isMounted) this.setState({ articles: newArticles });
        });
    });
  };

  handleSourceChange = (source) => {
    this._querySuperdeskArticles(source.id, true);
  };

  handleListSearch = (query) => {
    this.setState(
      {
        listSearchQuery: query,
      },
      () => this._queryListArticles(true, 99999)
    );
  };

  handleArticlesSearch = (query) => {
    let articlesFilters = { ...this.state.articlesFilters };
    articlesFilters.term = query;
    this.setState(
      {
        articlesFilters,
      },
      () => this._querySuperdeskArticles(this.state.source.id, true)
    );
  };

  filterArticles = (filters) =>
    this.setState({ articlesFilters: filters }, () =>
      this._querySuperdeskArticles(this.state.source.id, true)
    );

  pinUnpin = (id) => {
    let list = { ...this.state.list };
    let index = list.items.findIndex((item) => {
      let itemId = item.content ? item.content.id : item.id;
      return itemId === id;
    });

    if (index > -1) {
      let changesRecord = [...this.state.changesRecord];
      let item = list.items[index];

      let change = {
        content_id: id,
        action: "move",
        position: index,
        sticky: !item.sticky,
      };

      changesRecord.push(change);
      changesRecord = this.updatePositions(changesRecord, list.items);
      list.items[index] = {
        ...item,
        sticky: !item.sticky,
        sticky_position: index,
      };

      this.setState({ changesRecord, list });
    }
  };

  removeItem = (id) => {
    let list = { ...this.state.list };
    let index = list.items.findIndex((item) => {
      let itemId = item.content ? item.content.id : item.id;
      return itemId === id;
    });

    if (index > -1) {
      this.recordChange("delete", index, [...list.items]);
      list.items.splice(index, 1);
      list.items = this.fixPinnedItemsPosition(list.items);
      this.setState({ list });
    }
  };

  save = () => {
    this.props.publisher
      .saveManualList(
        {
          items: this.state.changesRecord,
          // The Superdesk items endpoint uses content_list_items_updated_at
          // as its optimistic-concurrency token; first save sends null.
          updated_at: this.props.list.content_list_items_updated_at,
        },
        this.props.list.id
      )
      .then((savedList) => {
        // Parent's onListUpdate triggers componentDidUpdate, which resets
        // changesRecord and reloads items from scratch.
        this.props.onListUpdate(savedList);
      })
      .catch((err) => {
        if (err.status === 409) {
          this.props.api.notify.error(
            "Cannot save. List has been already modified by another user"
          );

          let list = { items: [], page: 0, totalPages: 1, loading: false };
          this.setState({ list, changesRecord: [] });
          this._queryListArticles();
        } else {
          let message = err.message
            ? err.message
            : "Something went wrong. Try again.";
          this.props.api.notify.error(message);
        }
      });
  };

  /**
   * A semi-generic way to handle multiple lists. Matches
   * the IDs of the droppable container to the names of the
   * source arrays stored in the state.
   */
  id2List = {
    contentList: "list",
    articles: "articles",
  };

  getList = (id) => this.state[this.id2List[id]].items;

  getIndexInList = (list, draggableId) => {
    const ids = draggableId.split('_');
    const id = ids[ids.length - 1];

    return list.findIndex(item => {
      const itemId = item.content ? item.content.id : item.id;
      return itemId === id;
    });
  }

  onDragStart = () => {
    this._isDragging = true;
  };

  onDragEnd = (result) => {
    this._isDragging = false;
    const { source, destination, draggableId } = result;

    // dropped outside the list
    if (!destination) {
      return;
    }

    let list = { ...this.state.list };

    if (source.droppableId === destination.droppableId) {
      let items = reorder(
        this.getList(source.droppableId),
        source.index,
        destination.index
      );

      items = this.fixPinnedItemsPosition(items);

      list.items = items;
      this.recordChange("move", this.getIndexInList(list.items, draggableId), [...list.items]);
      this.setState({ list });
    } else {
      const result = move(
        this.getList(source.droppableId),
        this.getList(destination.droppableId),
        source,
        destination
      );

      let articles = { ...this.state.articles };

      list.items = this.fixPinnedItemsPosition(result.contentList);
      articles.items = result.articles;

      this.recordChange("add", this.getIndexInList(list.items, draggableId), [...list.items]);
      this.setState({
        list,
        articles,
      });
    }
  };

  fixPinnedItemsPosition = (items) => {
    items.forEach((item, index) => {
      if (item.sticky) {
        items = reorder(items, index, item.sticky_position);
      }
    });

    return items;
  };

  // action = move, add, delete
  // index - new index in list
  // list - updated list
  recordChange = (action, index, list) => {
    let changesRecord = [...this.state.changesRecord];
    let item = list[index];

    let change = {
      content_id: item.content ? item.content.id : item.id,
      action: action,
      position: index,
    };

    if (action === "delete") delete change.position;

    changesRecord.push(change);
    changesRecord = this.updatePositions(changesRecord, list);
    this.setState({ changesRecord });
  };

  updatePositions = (changesRecord, list) => {
    for (let i = 0; i < changesRecord.length; i++) {
      let itemIndex = list.findIndex((item) => {
        let itemId = item.content ? item.content.id : item.id;
        return itemId === changesRecord[i].content_id;
      });

      if (changesRecord[i].action !== "delete") {
        changesRecord[i].position = itemIndex;
      }
    }

    return changesRecord;
  };

  markDuplicates = (list) => {
    list.forEach((el) => {
      let elId = el.content ? el.content.id : el.id;
      let result = list.filter((element) => {
        let elementId = element.content ? element.content.id : element.id;
        return elId === elementId;
      });
      if (el.content) {
        el.content.isDuplicate = result.length > 1 ? true : false;
      } else {
        el.isDuplicate = result.length > 1 ? true : false;
      }
    });

    return list;
  };

  getDraggableId = (item) =>
    item.content
      ? "draggable_" + item.id + "_" + item.content.id
      : "draggable_" + item.id;

  render() {
    let filteredContentListItems = this.markDuplicates([
      ...this.state.list.items,
    ]);

    if (this.state.listSearchQuery) {
      filteredContentListItems = filteredContentListItems.filter((item) =>
        item.content
          ? item.content.title
            .toLowerCase()
            .includes(this.state.listSearchQuery.toLowerCase())
          : item.title
            .toLowerCase()
            .includes(this.state.listSearchQuery.toLowerCase())
      );
    }

    return (
      <div className="flex-grid flex-grid--grow flex-grid--small-2">
        <DragDropContext
          onDragStart={this.onDragStart}
          onDragEnd={this.onDragEnd}
        >
          <div className="flex-grid__item flex-grid__item--d-flex flex-grid__item--column panel-border-right">
            <div className="subnav subnav--lower-z-index subnav--dark-blue-grey" data-theme="dark-ui">
              <button
                className="navbtn navbtn--left"
                onClick={this.props.onEditCancel}
              >
                <i className="icon-th" />
              </button>
              <SearchBar
                value={this.state.listSearchQuery}
                onChange={(value) => this.handleListSearch(value)}
                style="dark"
              />
              <DropdownScrollable
                button={
                  <button className="dropdown__toggle navbtn navbtn--text-only dropdown-toggle">
                    {this.props.list.name}
                    <span className="dropdown__caret" />
                  </button>
                }
              >
                <li>
                  <div className="dropdown__menu-label">{this.props.label}</div>
                </li>
                {this.props.lists.map((item) => (
                  <li key={"dropdownElement" + item.id}>
                    <button onClick={() => this.props.listEdit(item)}>
                      {item.name}
                    </button>
                  </li>
                ))}
              </DropdownScrollable>
              <div className="subnav__stretch-bar" />
              <span className="margin--right">
                <Button
                  text="Save"
                  type="primary"
                  onClick={this.save}
                  disabled={this.state.changesRecord.length ? false : true}
                />
              </span>
            </div>

            <div className="sd-column-box--3">
              <div
                className={classNames(
                  "sd-column-box__main-column relative dropZone",
                  {
                    "dropZone--empty":
                      !this.state.list.loading && !this.state.list.items.length,
                  }
                )}
                ref={this.listScroll}
              >
                {!this.state.list.items.length && !this.state.list.loading && (
                  <h2 className="dropZone__heading">Drag your Articles here</h2>
                )}
                <Droppable droppableId="contentList">
                  {(provided, snapshot) => (
                    <ul
                      className="sd-list-item-group sd-shadow--z2"
                      ref={provided.innerRef}
                      style={
                        !this.state.list.items.length &&
                          !this.state.list.loading
                          ? { height: "calc(100% - 50px)" }
                          : {}
                      }
                    >
                      {filteredContentListItems.map((item, index) => {
                        let retArray = [];

                        if (index && index === this.props.list.limit) {
                          retArray.push(
                            <li
                              key={"limitnotification"}
                              className="listLimitNotification"
                            >
                              This list is limited to {this.props.list.limit}{" "}
                              items. Articles below will be removed.
                            </li>
                          );
                        }

                        retArray.push(
                          <Draggable
                            key={"list" + item.id + "" + index}
                            draggableId={this.getDraggableId(item)}
                            index={index}
                            isDragDisabled={item.sticky ? true : false}
                          >
                            {(provided, snapshot) => (
                              <li
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={provided.draggableProps.style}
                              >
                                <ArticleItem
                                  item={
                                    item.content
                                      ? { ...item.content, sticky: item.sticky }
                                      : item
                                  }
                                  openPreview={(item) =>
                                    this.props.openPreview(item)
                                  }
                                  previewItem={this.props.previewItem}
                                  index={index}
                                  showExtras={true}
                                  remove={(id) => this.removeItem(id)}
                                  pinUnpin={(id) => this.pinUnpin(id)}
                                  willBeTrimmed={
                                    this.props.list.limit &&
                                    index &&
                                    this.props.list.limit <= index
                                  }
                                />
                              </li>
                            )}
                          </Draggable>
                        );
                        return retArray;
                      })}
                      {provided.placeholder}

                      {this.state.list.loading && (
                        <li>
                          <Loading />
                        </li>
                      )}
                    </ul>
                  )}
                </Droppable>
              </div>
            </div>
          </div>

          <div className="flex-grid__item flex-grid__item--d-flex flex-grid__item--column">
            <div className="subnav subnav--lower-z-index">
              <SearchBar
                value={
                  this.state.articlesFilters.term
                    ? this.state.articlesFilters.term
                    : ""
                }
                onChange={(value) => this.handleArticlesSearch(value)}
              />
              <SourceSelect
                sources={[
                  { id: 'published', name: 'Published Articles', label: 'Published' },
                  { id: 'scheduled', name: 'Scheduled Articles', label: 'Scheduled' },
                  { id: 'in_progress', name: 'Articles in progress', label: 'In progress' },
                ]}
                selectedSource={this.state.source}
                setSource={(source) => {
                  this.setState({ source }, () => {
                    this.handleSourceChange(source);
                  });
                }}
              />
              {this.props.isLanguagesEnabled && (
                <LanguageSelect
                  languages={this.props.languages}
                  selectedLanguageCode={this.state.articlesFilters.language}
                  setLanguage={(lang) => {
                    this.filterArticles({
                      ...this.state.articlesFilters,
                      language: lang,
                    });
                  }}
                />
              )}
            </div>
            <div className="sd-column-box--3">
              <div
                className="sd-column-box__main-column relative"
                ref={this.articlesScroll}
              >
                <Droppable droppableId="articles" isDropDisabled={true}>
                  {(provided, snapshot) => (
                    <ul
                      className="sd-list-item-group sd-shadow--z2"
                      ref={provided.innerRef}
                    >
                      {this.state.articles.items.map((item, index) => (
                        <Draggable
                          key={"article" + item.id}
                          draggableId={this.getDraggableId(item)}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <li
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={provided.draggableProps.style}
                            >
                              <ArticleItem
                                item={item.content ? item.content : item}
                                openPreview={(item) =>
                                  this.props.openPreview(item)
                                }
                                previewItem={this.props.previewItem}
                              />
                            </li>
                          )}
                        </Draggable>
                      ))}

                      {provided.placeholder}
                      {this.state.articles.loading && (
                        <li>
                          <Loading />
                        </li>
                      )}
                      {!this.state.articles.items.length &&
                        !this.state.articles.loading && (
                          <li>
                            <div className="alert alert-error alert-block">
                              <h4>No results</h4>
                            </div>
                          </li>
                        )}
                    </ul>
                  )}
                </Droppable>
              </div>

            </div>
          </div>
        </DragDropContext>
      </div>
    );
  }
}

Manual.propTypes = {
  list: PropTypes.object.isRequired,
  lists: PropTypes.array.isRequired,
  publisher: PropTypes.object.isRequired,
  listEdit: PropTypes.func,
  onEditCancel: PropTypes.func,
  onListUpdate: PropTypes.func.isRequired,
  toggleFilters: PropTypes.func,
  openPreview: PropTypes.func,
  previewItem: PropTypes.object,
  filtersOpen: PropTypes.bool,
  api: PropTypes.func.isRequired,
  isLanguagesEnabled: PropTypes.bool.isRequired,
  languages: PropTypes.array.isRequired,
  site: PropTypes.object.isRequired,
  config: PropTypes.object,
};

export default Manual;
