import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import _ from "lodash";

import Listing from "./Listing";
import ManualList from "./Manual/Manual";
import PreviewPane from "./PreviewPane";

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
    };
  }

  componentDidMount() {
    this._isMounted = true;
    // Content lists are served by the Superdesk internal API which uses the
    // existing session cookie — no Publisher auth bootstrap needed. Calling
    // pubapi.setToken() here would 401 and trigger session.expire(), logging
    // the user out, whenever Publisher isn't available.
    this._getLists();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

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
            <a
              href="#/publisher"
              className="navbtn navbtn--left"
              sd-tooltip="Dashboard"
              flow="right"
            >
              <i className="icon-arrow-left" />
            </a>
            <h3 className="subnav__page-title">Content Lists</h3>
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
