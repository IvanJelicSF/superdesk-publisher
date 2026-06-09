import React from "react";
import PropTypes from "prop-types";

import { MultiSelect, Checkbox } from "superdesk-ui-framework/react";

/**
 * Slide-in panel for creating / editing a content list webhook. Fully
 * controlled: the working copy lives in the parent `Webhooks` component and is
 * passed in as `value`, every change is reported back through `onChange`.
 */
const WebhookEditPanel = ({ value, lists, onChange, onSave, onCancel, saving }) => {
  const isUpdate = !!value.id;

  // MultiSelect works with full option objects, but the webhook stores excluded
  // lists as ids; translate between the two on the way in and out.
  const selectedLists = lists.filter((l) =>
    (value.excluded_lists || []).includes(l.id)
  );

  const handleExcludedChange = (selected) => {
    onChange({ excluded_lists: (selected || []).map((l) => l.id) });
  };

  const canSave = !!(value.url && value.url.trim());

  return (
    <React.Fragment>
      <div className="side-panel__header side-panel__header--border-b side-panel__header--has-close">
        <div className="side-panel__header-wrapper">
          <div className="side-panel__header-inner">
            <h3 className="side-panel__heading">
              {isUpdate ? "Edit Webhook" : "Add Webhook"}
            </h3>
          </div>
          <div className="button-group button-group--end button-group--no-space side-panel__btn-group">
            <a className="icn-btn side-panel__close" onClick={onCancel}>
              <i className="icon-close-small" />
            </a>
          </div>
        </div>
      </div>

      <div className="side-panel__content">
        <div className="side-panel__content-block">
          <form className="flat">
            <fieldset className="label-light">
              <div className="form__row">
                <div className="sd-line-input sd-line-input--no-margin sd-padding-t--0">
                  <MultiSelect
                    label="Excluded lists"
                    options={lists}
                    optionLabel={(option) => option.name}
                    value={selectedLists}
                    onChange={handleExcludedChange}
                    emptyFilterMessage="No content lists found"
                  />
                </div>
              </div>

              <div className="form__row">
                <div className="sd-line-input sd-line-input--no-margin">
                  <label className="sd-line-input__label" htmlFor="webhook-url">
                    URL
                  </label>
                  <input
                    type="text"
                    className="sd-line-input__input"
                    id="webhook-url"
                    value={value.url || ""}
                    onChange={(e) => onChange({ url: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form__row">
                <Checkbox
                  label={{ text: value.enabled ? "Enabled" : "Disabled" }}
                  checked={value.enabled !== false}
                  onChange={(checked) => onChange({ enabled: checked })}
                />
              </div>
            </fieldset>
          </form>
        </div>
      </div>

      <div className="side-panel__footer side-panel__footer--button-box">
        <div className="button-group button-group--end button-group--comfort">
          <a className="btn btn--hollow" onClick={onCancel}>
            Cancel
          </a>
          <button
            className="btn btn--primary"
            disabled={!canSave || saving}
            onClick={onSave}
          >
            Save
          </button>
        </div>
      </div>
    </React.Fragment>
  );
};

WebhookEditPanel.propTypes = {
  // working copy of the webhook being edited/created
  value: PropTypes.object.isRequired,
  // all active content lists, used as excluded-list options
  lists: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  saving: PropTypes.bool,
};

export default WebhookEditPanel;
