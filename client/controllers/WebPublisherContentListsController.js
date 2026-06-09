/**
 * @ngdoc controller
 * @module superdesk.apps.web_publisher
 * @name WebPublisherContentListsController
 * @requires publisher
 * @requires modal
 * @requires https://docs.angularjs.org/api/ng/type/$rootScope.Scope $scope
 * @description WebPublisherContentListsController holds a set of functions used for web publisher content lists management
 */
import React from "react";
import ReactDOM from "react-dom";
import ContentLists from "../components/ContentLists/ContentLists";

WebPublisherContentListsController.$inject = [
  "$scope",
  "publisher",
  "$route",
  "api",
  "vocabularies",
  "notify",
  "config"
];
export function WebPublisherContentListsController(
  $scope,
  publisher,
  $route,
  api,
  vocabularies,
  notify,
  config
) {
  class WebPublisherContentLists {
    constructor() {
      this.tenant = $route.current.params._tenant;
      this.list = $route.current.params._list;
      this.publisher = publisher;
      // a little hack to avoid too many props
      api.notify = notify;
      this.api = api;

      // Superdesk pushes article changes over its websocket and re-broadcasts
      // them on the Angular root scope. The content-lists UI is React and has
      // no scope access, so bridge the relevant events to a window event it
      // listens for, to live-refresh lists when a visible article changes.
      // ($scope.$on receives $rootScope.$broadcast and auto-deregisters when
      // the route's scope is destroyed.)
      const SD_NOTIFICATION_EVENTS = [
        "content:update",
        "item:publish",
        "item:correction",
        "item:spike",
        "item:unspike",
        "item:move",
        // List-structure changes pushed by the content_lists backend service:
        // another user adding/moving/removing items, renaming a list, changing
        // its limit, or creating/deleting a list. Bridged here so the React UI
        // can live-refresh the open list and the listing grid.
        "content_list:items_updated",
        "content_list:created",
        "content_list:updated",
        "content_list:deleted",
      ];

      SD_NOTIFICATION_EVENTS.forEach((evt) => {
        $scope.$on(evt, (e, extra) => {
          window.dispatchEvent(
            new CustomEvent("publisher:content-notification", {
              detail: { event: evt, extra },
            })
          );
        });
      });

      let isLanguagesEnabled = false;

      let vocabulariesList = [];

      vocabularies.getVocabularies().then(res => {
        vocabulariesList = res;
        let languages = res.find(v => v._id === "languages");
        languages = languages && languages.items ? languages.items.filter(l => l.is_active) : [];

        if (languages.length > 1) {
          isLanguagesEnabled = true;
        }

        ReactDOM.render(
          <ContentLists
            tenant={this.tenant}
            publisher={this.publisher}
            list={this.list}
            api={this.api}
            isLanguagesEnabled={isLanguagesEnabled}
            languages={languages}
            vocabularies={vocabulariesList}
            config={config}
          />,
          document.getElementById("sp-content-lists-react-app")
        );
      });
    }
  }

  return new WebPublisherContentLists();
}
