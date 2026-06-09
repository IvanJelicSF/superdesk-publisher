import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import _ from "lodash";

import Listing from "./Listing";
import ManualList from "./Manual/Manual";
import PreviewPane from "./PreviewPane";
import Webhooks from "./Webhooks/Webhooks";

// Window event the Angular controller bridges Superdesk websocket
// notifications onto (see WebPublisherContentListsController). Carries the
// content_list:* events fired when a list is created/renamed/deleted by
// anyone, so the listing grid can live-update.
const SD_NOTIFICATION_EVENT = "publisher:content-notification";

class ContentLists extends React.Component {
  constructor(props) {
    super(props);

    this._isMounted = false;

    this.state = {
      loading: true,
      lists: [],
      selectedList: null,
      filtersOpen: false,
      previewOpen: false,
      previewItem: null,
      settingsOpen: false,
    };
  }

  componentDidMount() {
    this._isMounted = true;
    // Content lists are served by the Superdesk internal API which uses the
    // existing session cookie — no Publisher auth bootstrap needed. Calling
    // pubapi.setToken() here would 401 and trigger session.expire(), logging
    // the user out, whenever Publisher isn't available.
    this._getLists();
    window.addEventListener(SD_NOTIFICATION_EVENT, this.handleNotification);
  }

  componentWillUnmount() {
    this._isMounted = false;
    window.removeEventListener(SD_NOTIFICATION_EVENT, this.handleNotification);
    this.refreshListsDebounced.cancel();
  }

  handleNotification = (e) => {
    const event = e && e.detail && e.detail.event;

    // A list was created/renamed/deleted by someone (possibly another tab).
    // Refresh the collection so the listing grid and the list dropdown stay
    // current. Item-level changes (content_list:items_updated) are handled by
    // the open ManualList, not here.
    if (
      event === "content_list:created" ||
      event === "content_list:updated" ||
      event === "content_list:deleted"
    ) {
      this.refreshListsDebounced();
    }
  };

  // Re-query the lists collection in place. Deliberately does NOT replace
  // `selectedList`: that object is the open editor's working copy (it may hold
  // unsaved item edits), and swapping its identity would reset ManualList and
  // clobber those edits. We only drop it if the open list was deleted.
  refreshLists = () => {
    if (!this._isMounted) return;

    this.props.publisher.queryLists().then((lists) => {
      lists = lists.filter((l) => l.type === "manual");
      lists = _.orderBy(lists, "name", "asc");

      let selectedList = this.state.selectedList;
      if (selectedList && !lists.find((l) => l.id === selectedList.id)) {
        selectedList = null;
      }

      if (this._isMounted) this.setState({ lists, selectedList });
    });
  };

  // Debounced so a burst of notifications (and Superdesk's slight delay between
  // pushing an event and the data being queryable) collapses into one query.
  refreshListsDebounced = _.debounce(() => this.refreshLists(), 1000);

  listEdit = (list) =>
    this.setState({
      selectedList: list,
      filtersOpen: false,
    });

  cancelListEdit = () =>
    this.setState({
      selectedList: null,
      filtersOpen: false,
      previewOpen: false,
    });

  _getLists = () => {
    this.setState({ loading: true }, () => {
      return this.props.publisher.queryLists().then((lists) => {
        // Superdesk internal API only exposes manual content lists; keep
        // the filter defensive in case other types ever appear.
        lists = lists.filter((l) => l.type === "manual");

        let selectedList = null;

        if (this.props.list) {
          let list = lists.find((l) => l.id === this.props.list);
          if (list) selectedList = list;
        }

        lists = _.orderBy(lists, "name", "asc");

        if (this._isMounted)
          this.setState({
            lists,
            loading: false,
            selectedList,
            filtersOpen: false,
          });
      });
    });
  };

  onListDelete = (id) => {
    let lists = [...this.state.lists];
    let index = lists.findIndex((list) => list.id === id);

    if (index < 0) {
      index = lists.findIndex((list) => typeof list.id === "undefined");
    }

    if (index > -1) {
      lists.splice(index, 1);
      this.setState({ lists });
    }
  };

  onListUpdate = (updatedList) => {
    let lists = [...this.state.lists];
    let index = lists.findIndex((list) => list.id === updatedList.id);
    let selectedList = { ...this.state.selectedList };

    if (selectedList.id === updatedList.id) {
      selectedList = updatedList;
    }

    if (index > -1) {
      lists[index] = updatedList;
    }

    this.setState({
      lists,
      selectedList: selectedList.id !== undefined ? selectedList : null,
    });
  };

  onListCreated = (newList) => {
    let lists = [...this.state.lists];
    let oldIndex = lists.findIndex((list) => typeof list.id === "undefined");

    if (oldIndex > -1) {
      lists.splice(oldIndex, 1);
    }

    lists.unshift(newList);

    this.setState({ lists });
  };

  toggleFilters = () => this.setState({ filtersOpen: !this.state.filtersOpen });

  openPreview = (item) =>
    this.setState({ previewOpen: true, previewItem: item });
  closePreview = () => this.setState({ previewOpen: false, previewItem: null });

  addList = () => {
    const list = {
      name: "",
      type: "manual",
    };

    this.setState({ lists: [list, ...this.state.lists] });
  };

  render() {
    if (this.state.settingsOpen) {
      return (
        <div className="sd-page-content__content-block">
          <Webhooks
            publisher={this.props.publisher}
            api={this.props.api}
            onClose={() => this.setState({ settingsOpen: false })}
          />
        </div>
      );
    }

    return (
      <React.Fragment>
        {this.state.loading && <div className="sd-loader" />}
        <div
          className={classNames("sd-page-content__content-block", {
            "sd-page-content__content-block--double-sidebar": this.state
              .selectedList,
            "open-filters": this.state.filtersOpen,
            "open-preview": this.state.previewOpen,
          })}
        >
          <div className="subnav">
            <h3 className="subnav__page-title">Content Lists</h3>
            <span className="subnav__stretch-bar" />
            <button
              className="icn-btn"
              title="Settings"
              onClick={() => this.setState({ settingsOpen: true })}
            >
              <i className="icon-settings" />
            </button>
          </div>
          <div className="sd-column-box--3 content-nav-closed">
            {!this.state.selectedList && (
              <Listing
                lists={this.state.lists}
                publisher={this.props.publisher}
                onListDelete={(id) => this.onListDelete(id)}
                onListCreated={(list) => this.onListCreated(list)}
                onListUpdate={(list) => this.onListUpdate(list)}
                addList={() => this.addList()}
                listEdit={(list) => this.listEdit(list)}
              />
            )}

            {this.state.selectedList && (
              <ManualList
                list={this.state.selectedList}
                lists={this.state.lists}
                publisher={this.props.publisher}
                listEdit={(list) => this.listEdit(list)}
                onEditCancel={this.cancelListEdit}
                onListUpdate={(list) => this.onListUpdate(list)}
                toggleFilters={this.toggleFilters}
                openPreview={(item) => this.openPreview(item)}
                previewItem={this.state.previewItem}
                filtersOpen={this.state.filtersOpen}
                api={this.props.api}
                isLanguagesEnabled={this.props.isLanguagesEnabled}
                languages={this.props.languages}
                site={{}}
                config={this.props.config}
              />
            )}

            <PreviewPane
              article={
                this.state.previewItem && this.state.previewItem.content
                  ? this.state.previewItem.content
                  : this.state.previewItem
              }
              close={this.closePreview}
            />
          </div>
        </div>
      </React.Fragment>
    );
  }
}

ContentLists.propTypes = {
  list: PropTypes.string,
  publisher: PropTypes.object.isRequired,
  api: PropTypes.func.isRequired,
  isLanguagesEnabled: PropTypes.bool.isRequired,
  languages: PropTypes.array.isRequired,
  config: PropTypes.object,
};

export default ContentLists;
