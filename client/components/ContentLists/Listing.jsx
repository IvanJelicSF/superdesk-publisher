import React from "react";
import PropTypes from "prop-types";

import ListCard from "./ListCard";
import SearchBar from "../UI/SearchBar";
import { Button } from "superdesk-ui-framework/react";

class Listing extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      search: "",
    };
  }

  addList = () => {
    this.props.addList("manual");
  };

  render() {
    let lists = [...this.props.lists];

    if (this.state.search)
      lists = lists.filter((list) =>
        list.name.toLowerCase().includes(this.state.search)
      );

    const newListIndex = lists.findIndex(
      (list) => typeof list.id === "undefined"
    );
    const addButtonDisabled = newListIndex > -1;

    return (
      <div className="sd-column-box__main-column relative sd-display-flex-column">
        <div className="subnav subnav--lower-z-index">
          <SearchBar
            value={this.state.search}
            onChange={(value) => this.setState({ search: value.toLowerCase() })}
            debounceTime={1}
          />

          <div className="subnav__stretch-bar" />
          <Button
            text="New manual list"
            type="primary"
            icon="plus-sign"
            onClick={this.addList}
            disabled={addButtonDisabled}
          />
        </div>
        <div className="sd-display-flex-column">
          <div className="sd-grid-list sd-grid-list--large">
            {lists.map((list, index) => (
              <ListCard
                key={list.id + "listCard"}
                list={list}
                publisher={this.props.publisher}
                onListDelete={(id) => this.props.onListDelete(id)}
                onListCreated={(list) => this.props.onListCreated(list)}
                onListUpdate={(list) => this.props.onListUpdate(list)}
                listEdit={(list) => this.props.listEdit(list)}
              />
            ))}
          </div>
        </div>
        {this.props.lists && !this.props.lists.length ? (
          <div className="panel-info">
            <div className="panel-info__icon">
              <i className="big-icon--add-to-list" />
            </div>
            <h3 className="panel-info__heading">No Content Lists</h3>
            <p className="panel-info__description">Create the first one...</p>
          </div>
        ) : null}
      </div>
    );
  }
}

Listing.propTypes = {
  lists: PropTypes.array.isRequired,
  publisher: PropTypes.object.isRequired,
  onListDelete: PropTypes.func.isRequired,
  onListCreated: PropTypes.func.isRequired,
  onListUpdate: PropTypes.func.isRequired,
  addList: PropTypes.func.isRequired,
  listEdit: PropTypes.func.isRequired,
};

export default Listing;
