import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";

import Dropdown from "../../UI/Dropdown";

/**
 * A single content list webhook card in the settings list. Shows the target
 * URL, the names of any excluded content lists (as red labels), the
 * enabled/disabled state and an actions menu (edit / remove).
 */
const WebhookItem = ({ webhook, listsById, selected, onEdit, onRemove }) => {
  // excluded_lists holds content list ids; resolve them to names. A list that
  // no longer exists (deleted) is skipped rather than shown as a raw id.
  const excludedNames = (webhook.excluded_lists || [])
    .map((id) => listsById[id] && listsById[id].name)
    .filter(Boolean);

  return (
    <div
      className={classNames("sd-list-item sd-shadow--z1", {
        "sd-list-item--activated": selected,
      })}
    >
      <div className="sd-list-item__border" />
      <div className="sd-list-item__column sd-list-item__column--grow sd-list-item__column--no-border">
        <div className="sd-list-item__row">
          <div className="sd-overflow-ellipsis sd-list-item--element-grow">
            <strong>{webhook.url}</strong>
          </div>
        </div>
        <div className="sd-list-item__row">
          <span className="sd-overflow-ellipsis sd-list-item--element-grow">
            {excludedNames.map((name, index) => (
              <span key={index} className="label label--alert">
                {name}
              </span>
            ))}
          </span>

          {webhook.enabled ? (
            <span className="label label--success">enabled</span>
          ) : (
            <span className="label label--alert label--hollow">disabled</span>
          )}
        </div>
      </div>
      <div className="sd-list-item__action-menu">
        <Dropdown
          button={
            <button className="dropdown__toggle icn-btn">
              <i className="icon-dots-vertical" />
            </button>
          }
        >
          <li>
            <button onClick={() => onEdit(webhook)}>
              <i className="icon-pencil" />
              Edit
            </button>
          </li>
          <li>
            <button onClick={() => onRemove(webhook)}>
              <i className="icon-trash" />
              Remove
            </button>
          </li>
        </Dropdown>
      </div>
    </div>
  );
};

WebhookItem.propTypes = {
  webhook: PropTypes.object.isRequired,
  // map of content list id -> list, used to resolve excluded list names
  listsById: PropTypes.object.isRequired,
  selected: PropTypes.bool,
  onEdit: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default WebhookItem;
