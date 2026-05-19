import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import moment from "moment";
import helpers from "../../services/helpers.js";
import { Button, Label, IconButton } from "superdesk-ui-framework/react";
import Dropdown from "../UI/Dropdown";
import Modal from "../UI/Modal";

class ListCard extends React.Component {
  constructor(props) {
    super(props);

    this._isMounted = false;

    this.state = {
      list: { ...props.list },
      isEditing: this.props.list.name ? false : true,
      loading: false,
      modalType: null,
    };
  }

  modalClose = () => {
    this.setState({ modalType: null });
  };

  save = () => {
    let body;

    if (this.state.list.id) {
      body = helpers.getUpdatedValues(this.state.list, this.props.list);
      // _etag must be sent (as If-Match) on every update; getUpdatedValues
      // omits unchanged keys.
      body._etag = this.state.list._etag;
    } else {
      body = { name: this.state.list.name, type: "manual" };
    }

    this.props.publisher
      .manageList(body, this.state.list.id)
      .then((res) => {
        let list = { ...res };
        this.modalClose();
        this.editClose();
        if (this.state.list.id) {
          this.props.onListUpdate(list);
        } else {
          this.props.onListCreated(list);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  };

  deleteConfirm = () => {
    this.setState({ modalType: "delete" });
  };

  deleteList = () => {
    this.props.publisher
      .removeList(this.state.list.id, this.state.list._etag)
      .then(() => this.props.onListDelete(this.state.list.id));

    this.modalClose();
  };

  handleInputChange = (e) => {
    const { name, value } = e.target;
    const list = { ...this.state.list, [name]: value };
    this.setState({ list });
  };

  edit = () => {
    this.setState({ isEditing: true });
  };

  editClose = () => {
    this.setState({ isEditing: false });
  };

  cancelEditing = () => {
    if (typeof this.props.list.id === "undefined") {
      this.props.onListDelete(this.state.list.id);
    } else {
      this.setState({ list: this.props.list, isEditing: false });
    }
  };

  render() {
    let { list, modalType } = this.state;
    let modalContent = "";

    if (modalType === "delete") {
      modalContent = (
        <React.Fragment>
          <div className="modal__header ">
            <h3>Confirm</h3>
          </div>
          <div className="modal__body ">
            Please confirm you want to delete list.
          </div>
          <div className="modal__footer">
            <Button text="Cancel" onClick={this.modalClose} />
            <Button text="Ok" type="primary" onClick={this.deleteList} />
          </div>
        </React.Fragment>
      );
    }

    return (
      <React.Fragment>
        <div className="sd-card flexGrow">
          <div
            data-theme="dark-ui"
            className={classNames("sd-card__header", {
              "sd-card__header--secondary-color": list.type === "automatic",
            })}
          >
            {this.state.isEditing ? (
              <React.Fragment>
                <div className="sd-card__heading sd-card__heading--editable">
                  <div class="sd-input sd-input--medium sd-input--boxed-style sd-input sd-input--inline-label">
                    <input
                      type="text"
                      name="name"
                      onChange={this.handleInputChange}
                      value={this.state.list.name}
                      className="sd-input__input"
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <div className="button-group button-group--compact button-group--end sd-margin-r--1">
                  <IconButton
                    icon="close-small"
                    ariaValue="Cancel"
                    onClick={this.cancelEditing} 
                  />
                  <IconButton
                    icon="ok"
                    ariaValue="Save"
                    onClick={this.save} 
                  /> 
                </div>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <div className="sd-card__heading sd-card__heading--editable" onClick={this.edit}>
                  <div className="sd-card__heading-dummy-input" title="Click to rename">{list.name}</div>
                </div>
                <div className="sd-card__actions-group">
                  <Button
                    text="Edit"
                    style="hollow"
                    size="small"
                    theme="dark"
                    onClick={() => this.props.listEdit(list)}
                  />

                  <Dropdown
                    button={
                      <button className="dropdown__toggle icn-btn">
                        <i className="icon-dots-vertical" />
                      </button>
                    }
                  >
                    <li>
                      <button onClick={this.deleteConfirm} title="Remove list">
                        <i className="icon-trash" />
                        Remove
                      </button>
                    </li>
                  </Dropdown>
                </div>
              </React.Fragment>
            )}
          </div>
          <div className="sd-card__content sd-card__content--scrollable relative">
            <ul className="sd-card__content-list">
              {this.state.loading && <div className="sd-loader" />}
              {!this.state.loading && (
                <div className="sd-card__content-list-item sd-card__content-list-item--small">
                  <span>
                    {list.content_list_items_updated_at
                      ? "Items last updated " +
                        moment(list.content_list_items_updated_at).fromNow()
                      : "No articles in this list"}
                  </span>
                </div>
              )}
            </ul>
          </div>
          <div className="sd-card__footer sd-card__footer--spread">
            <div>
              <span className="sd-text__info">Last modified: </span>
              <span>{moment(list.updated_at).fromNow()}</span>
            </div>
            {list.enabled && (
              <Label text="active" type="success" style="translucent" />
            )}
          </div>
        </div>

        <Modal isOpen={this.state.modalType ? true : false}>
          {modalContent}
        </Modal>
      </React.Fragment>
    );
  }
}

ListCard.propTypes = {
  list: PropTypes.object.isRequired,
  publisher: PropTypes.object.isRequired,
  listEdit: PropTypes.func.isRequired,
  onListCreated: PropTypes.func.isRequired,
  onListUpdate: PropTypes.func.isRequired,
};

export default ListCard;
