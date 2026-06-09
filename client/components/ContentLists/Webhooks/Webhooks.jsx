import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";

import WebhookItem from "./WebhookItem";
import WebhookEditPanel from "./WebhookEditPanel";
import Modal from "../../UI/Modal";
import { Button } from "superdesk-ui-framework/react";

/**
 * Settings screen for content list webhooks, reached from the gear button in
 * the Content Lists subnav. Reuses the Publisher settings webhook UI (list of
 * cards + slide-in edit panel) but talks to the Superdesk `content_list_webhooks`
 * resource. A webhook fires for every content list except the ones listed in
 * its `excluded_lists`.
 */
class Webhooks extends React.Component {
  constructor(props) {
    super(props);

    this._isMounted = false;

    this.state = {
      loading: true,
      saving: false,
      webhooks: [],
      lists: [],
      paneOpen: false,
      // original record currently being edited (holds id/_etag); null when adding
      selectedWebhook: null,
      // working copy bound to the edit panel
      form: null,
      // webhook pending delete confirmation
      confirmDelete: null,
    };
  }

  componentDidMount() {
    this._isMounted = true;
    this._load();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  _load = () => {
    this.setState({ loading: true });
    Promise.all([
      this.props.publisher.queryContentListWebhooks(),
      this.props.publisher.queryLists(),
    ])
      .then(([webhooks, lists]) => {
        if (!this._isMounted) return;
        // Only active lists can be excluded; a disabled list is effectively gone.
        const activeLists = lists.filter((l) => l.enabled !== false);
        this.setState({ webhooks, lists: activeLists, loading: false });
      })
      .catch(() => {
        if (!this._isMounted) return;
        this.setState({ loading: false });
        this._notifyError();
      });
  };

  _refreshWebhooks = () => {
    return this.props.publisher
      .queryContentListWebhooks()
      .then((webhooks) => {
        if (this._isMounted) this.setState({ webhooks });
      });
  };

  _notifyError = (message) => {
    const notify = this.props.api && this.props.api.notify;
    if (notify) notify.error(message || "Something went wrong. Try again.");
  };

  openCreate = () => {
    this.setState({
      selectedWebhook: null,
      form: { enabled: true, url: "", excluded_lists: [] },
      paneOpen: true,
    });
  };

  openEdit = (webhook) => {
    this.setState({
      selectedWebhook: webhook,
      form: {
        ...webhook,
        excluded_lists: [...(webhook.excluded_lists || [])],
      },
      paneOpen: true,
    });
  };

  closePane = () => {
    this.setState({ paneOpen: false, selectedWebhook: null, form: null });
  };

  updateForm = (patch) => {
    this.setState({ form: { ...this.state.form, ...patch } });
  };

  save = () => {
    const { form, selectedWebhook } = this.state;
    this.setState({ saving: true });

    this.props.publisher
      .manageContentListWebhook(form, selectedWebhook && selectedWebhook.id)
      .then(() => this._refreshWebhooks())
      .then(() => {
        if (!this._isMounted) return;
        this.setState({ saving: false, paneOpen: false, selectedWebhook: null, form: null });
      })
      .catch((err) => {
        if (!this._isMounted) return;
        this.setState({ saving: false });
        this._notifyError(
          err && err.data && err.data._error && err.data._error.message
        );
      });
  };

  remove = () => {
    const webhook = this.state.confirmDelete;
    if (!webhook) return;

    this.props.publisher
      .removeContentListWebhook(webhook.id, webhook._etag)
      .then(() => {
        this.setState({ confirmDelete: null });
        // Close the edit pane if the deleted webhook was open in it.
        if (
          this.state.selectedWebhook &&
          this.state.selectedWebhook.id === webhook.id
        ) {
          this.closePane();
        }
        return this._refreshWebhooks();
      })
      .catch((err) => {
        this.setState({ confirmDelete: null });
        this._notifyError(
          err && err.data && err.data._error && err.data._error.message
        );
      });
  };

  render() {
    const { webhooks, lists, loading, paneOpen, form, selectedWebhook } = this.state;

    const listsById = lists.reduce((acc, list) => {
      acc[list.id] = list;
      return acc;
    }, {});

    return (
      <React.Fragment>
        <div
          className={classNames("sd-page-content__content-block", {
            "open-preview": paneOpen,
          })}
        >
          <div className="subnav">
            <button
              className="icn-btn"
              title="Back to content lists"
              onClick={this.props.onClose}
            >
              <i className="icon-arrow-left" />
            </button>
            <h3 className="subnav__page-title">Settings</h3>
            <span className="subnav__stretch-bar" />
            <Button
              text="Add new"
              type="primary"
              icon="plus-sign"
              onClick={this.openCreate}
            />
          </div>

          <ul className="nav-tabs">
            <li className="nav-tabs__tab nav-tabs__tab--active">
              <button className="nav-tabs__link">Webhooks</button>
            </li>
          </ul>

          <div className="sd-column-box--3 content-nav-closed">
            <div className="sd-column-box__main-column relative">
              {loading && <div className="sd-loader" />}

              {!loading && !webhooks.length && (
                <div className="panel-info">
                  <div className="panel-info__icon">
                    <i className="big-icon--publisher" />
                  </div>
                  <h3 className="panel-info__heading">No webhooks so far.</h3>
                  <p className="panel-info__description">
                    Be the first one...
                  </p>
                </div>
              )}

              {!loading && !!webhooks.length && (
                <div className="sd-list-item-group sd-shadow--z2">
                  {webhooks.map((webhook) => (
                    <WebhookItem
                      key={webhook.id}
                      webhook={webhook}
                      listsById={listsById}
                      selected={
                        !!selectedWebhook && selectedWebhook.id === webhook.id
                      }
                      onEdit={this.openEdit}
                      onRemove={(w) => this.setState({ confirmDelete: w })}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Mounted only while open — matching the Content Lists preview
                pane. A permanently-rendered, off-canvas sd-preview-panel adds
                its width to the page and overflows the viewport on the right. */}
            {paneOpen && form && (
              <div className="sd-preview-panel">
                <div className="side-panel side-panel--shadow-right">
                  <WebhookEditPanel
                    value={form}
                    lists={lists}
                    onChange={this.updateForm}
                    onSave={this.save}
                    onCancel={this.closePane}
                    saving={this.state.saving}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <Modal isOpen={!!this.state.confirmDelete}>
          <div className="modal__header">
            <h3>Confirm</h3>
          </div>
          <div className="modal__body">
            Please confirm you want to delete webhook.
          </div>
          <div className="modal__footer">
            <Button
              text="Cancel"
              onClick={() => this.setState({ confirmDelete: null })}
            />
            <Button text="Ok" type="primary" onClick={this.remove} />
          </div>
        </Modal>
      </React.Fragment>
    );
  }
}

Webhooks.propTypes = {
  publisher: PropTypes.object.isRequired,
  // Angular `api` service (a function with attached helpers, incl. notify)
  api: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  onClose: PropTypes.func.isRequired,
};

export default Webhooks;
