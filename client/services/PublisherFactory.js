/**
 * @ngdoc service
 * @module superdesk.apps.web_publisher
 * @name publisher
 * @requires pubapi
 * @description Publisher service
 */
PublisherFactory.$inject = ["pubapi"];
export function PublisherFactory(pubapi) {
  class Publisher {
    /**
     * @ngdoc method
     * @name publisher#setToken
     * @returns {Promise}
     * @description Sets token
     */
    setToken() {
      return pubapi.setToken();
    }

    /**
     * @ngdoc method
     * @name publisher#getToken
     * @returns {String}
     * @description Gets token
     */
    getToken() {
      return pubapi._token;
    }

    /**
     * @ngdoc method
     * @name publisher#setTenant
     * @param {String} site
     * @returns {Object}
     * @description Change the tenant we are using the api for
     */
    setTenant(site) {
      pubapi.setTenant(site);
      return this;
    }

    /**
     * @ngdoc method
     * @name publisher#checkIfPublisher
     * @param {String} url
     * @returns {Bolean}
     * @description Checks if there is publisher under given url
     */
    checkIfPublisher(url) {
      return pubapi.checkIfPublisher(url);
    }

    /**
     * @ngdoc method
     * @name publisher#manageSite
     * @param {Object} site - site which is edited
     * @param {String} code - code of site which is edited
     * @returns {Promise}
     * @description Add or edit site
     */
    manageSite(site, code) {
      return pubapi.save("tenants", site, code);
    }

    /**
     * @ngdoc method
     * @name publisher#removeSite
     * @param {String} code - code of site which is deleted
     * @param {Object} params
     * @returns {Promise}
     * @description Delete site
     */
    removeSite(code, params) {
      return pubapi.remove("tenants", code, params);
    }

    /**
     * @ngdoc method
     * @name publisher#querySites
     * @param {Bool} withRoutes - should include routes
     * @param {Bool} withContentLists - should include content lists
     * @returns {Promise}
     * @description List all sites in publisher
     */
    querySites(withRoutes = false, withContentLists = false) {
      let params = {
        limit: 1000,
        "sorting[name]": "asc"
      };

      if (withContentLists) params.withContentLists = true;
      if (withRoutes) params.withRoutes = true;

      return pubapi.query("tenants", params);
    }

    /**
     * @ngdoc method
     * @name publisher#manageRoute
     * @param {Object} route - route which is edited
     * @param {String} id - id of route which is edited
     * @returns {Promise}
     * @description Add or edit route
     */
    manageRoute(route, id) {
      return pubapi.save("content/routes", route, id);
    }

    /**
     * @ngdoc method
     * @name publisher#removeRoute
     * @param {String} id - id of route which is deleted
     * @returns {Promise}
     * @description Delete route
     */
    removeRoute(id) {
      return pubapi.remove("content/routes", id);
    }

    /**
     * @ngdoc method
     * @name publisher#queryRoutes
     * @param {Object} type - which routes to query (collection or content)
     * @returns {Promise}
     * @description List all routes for defined type
     */
    queryRoutes(type) {
      let params = type ? type : {};

      params["sorting[position]"] = "asc";
      params.limit = 1000;
      return pubapi.query("content/routes", params);
    }


    /**
     * @ngdoc method
     * @name publisher#manageRedirect
     * @param {Object} redirect - redirect which is edited
     * @param {String} id - id of redirect which is edited
     * @returns {Promise}
     * @description Add or edit route
     */
    manageRedirect(redirect, id) {
      return pubapi.save("redirects", redirect, id);
    }

    /**
     * @ngdoc method
     * @name publisher#removeRedirect
     * @param {String} id - id of redirect which is deleted
     * @returns {Promise}
     * @description Delete route
     */
    removeRedirect(id) {
      return pubapi.remove("redirects", id);
    }

    /**
    * @ngdoc method
    * @name publisher#queryRedirects
    * @returns {Promise}
    * @description List all redirects
    */
    queryRedirects(params) {
      if (!params) {
        params = {
          limit: 100000,
          "sorting[createdAt]": "desc"
        }
      }

      return pubapi.queryWithDetails("redirects", params);
    }

    /**
     * @ngdoc method
     * @name publisher#getMenu
     * @param {String} id - id of menu to get
     * @returns {Promise}
     * @description Get a single menu by id
     */
    getMenu(id) {
      return pubapi.get("menus", id);
    }

    /**
     * @ngdoc method
     * @name publisher#manageMenu
     * @param {Object} menu - menu which is edited
     * @param {String} id - id of menu which is edited
     * @returns {Promise}
     * @description Create or update a menu
     */
    manageMenu(menu, id) {
      return pubapi.save("menus", menu, id);
    }

    /**
     * @ngdoc method
     * @name publisher#removeMenu
     * @param {String} id - id of menu which is deleted
     * @returns {Promise}
     * @description Remove a menu in the system.
     */
    removeMenu(id) {
      return pubapi.remove("menus", id);
    }

    /**
     * @ngdoc method
     * @name publisher#reorderMenu
     * @param {Object} menu - menu which is moved
     * @param {String} id - id of menu which is moved
     * @returns {Promise}
     * @description Move menu to different position
     */
    reorderMenu(menu, id) {
      return pubapi.patch("menus/" + id + "/move", menu);
    }

    /**
     * @ngdoc method
     * @name publisher#reorderRoute
     * @param {Object} route - route which is moved
     * @param {String} id - id of route which is moved
     * @returns {Promise}
     * @description Move menu to different position
     */
    reorderRoute(route, id) {
      return pubapi.save("content/routes", route, id);
    }

    /**
     * @ngdoc method
     * @name publisher#queryMenus
     * @returns {Promise}
     * @description List all menus
     */
    queryMenus(params) {
      let newParams = { ...params };

      if (!newParams.limit) {
        newParams.limit = 99999;
      }
      return pubapi.query("menus", newParams);
    }

    /**
     * @ngdoc method
     * @name publisher#getThemeSettings
     * @returns {Promise}
     * @description List theme settings
     */
    getThemeSettings() {
      return pubapi.get("theme/settings");
    }

    /**
     * @description Maps a content list record from the Superdesk internal
     * API to the shape the Publisher UI expects.
     */
    _mapSdContentList(sdList) {
      if (!sdList) return sdList;
      return {
        ...sdList,
        id: sdList._id,
        _etag: sdList._etag,
        updated_at: sdList._updated,
        created_at: sdList._created,
      };
    }

    /**
     * @description Maps a content list item from the Superdesk internal API
     * to the shape ArticleItem / Manual.jsx expect (with a `content`
     * sub-object representing the related article).
     */
    _mapSdContentListItem(sdItem) {
      if (!sdItem) return sdItem;
      const articleContent = sdItem.article_content || {};
      const thumb = articleContent.thumbnail;

      let featureMedia = null;
      if (thumb && thumb.href) {
        featureMedia = {
          renditions: [
            { name: "thumbnail", href: thumb.href },
            { name: "original", href: thumb.href },
          ],
        };
      }

      const category =
        (articleContent.anpa_category &&
          articleContent.anpa_category[0] &&
          articleContent.anpa_category[0].name) ||
        null;

      return {
        id: sdItem._id,
        _etag: sdItem._etag,
        list_id: sdItem.list_id,
        enabled: sdItem.enabled,
        sticky: !!sdItem.sticky,
        sticky_position: sdItem.position,
        position: sdItem.position,
        content: {
          id: sdItem.content,
          title: articleContent.title,
          status: articleContent.state,
          category,
          updated_at: articleContent._updated,
          created_at: articleContent._created,
          feature_media: featureMedia,
        },
      };
    }

    /**
     * @ngdoc method
     * @name publisher#getList
     * @param {String} id
     * @returns {Promise}
     * @description Get content list from Superdesk internal API
    */
    getList(id) {
      return pubapi
        .superdeskApiRequest({
          method: "GET",
          path: "/content_lists/" + id,
        })
        .then((res) => this._mapSdContentList(res));
    }

    /**
     * @ngdoc method
     * @name publisher#manageList
     * @param {Object} list - list which is edited
     * @param {String} id - id of list which is edited (omit to create)
     * @returns {Promise}
     * @description Create or update a content list via Superdesk internal API.
     * For updates, list._etag is required and is sent as the If-Match header.
     */
    manageList(list, id) {
      const isUpdate = !!id;
      const body = { ...list };

      // Strip fields that the Superdesk API rejects or that we control
      // separately (etag is sent as If-Match instead of in the body).
      delete body._id;
      delete body._etag;
      delete body._created;
      delete body._updated;
      delete body._links;
      delete body._type;
      delete body.id;
      delete body.updated_at;
      delete body.created_at;
      delete body.content_list_items_updated_at;

      const requestConfig = {
        method: isUpdate ? "PATCH" : "POST",
        path: isUpdate ? "/content_lists/" + id : "/content_lists",
        data: body,
      };

      if (isUpdate && list._etag) {
        requestConfig.headers = { "If-Match": list._etag };
      }

      return pubapi
        .superdeskApiRequest(requestConfig)
        .then((res) => this._mapSdContentList(res));
    }

    /**
     * @ngdoc method
     * @name publisher#removeList
     * @param {String} id - id of list which is deleted
     * @param {String} etag - current _etag of the list (required by SD API)
     * @returns {Promise}
     * @description Remove a content list via Superdesk internal API
     */
    removeList(id, etag) {
      return pubapi.superdeskApiRequest({
        method: "DELETE",
        path: "/content_lists/" + id,
        headers: etag ? { "If-Match": etag } : undefined,
      });
    }

    /**
     * @ngdoc method
     * @name publisher#queryLists
     * @param {Object} params - additional query params (e.g. max_results, page)
     * @returns {Promise}
     * @description List all content lists from Superdesk internal API
     */
    queryLists(params) {
      const newParams = { max_results: 200, ...(params || {}) };
      return pubapi
        .superdeskApiRequest({
          method: "GET",
          path: "/content_lists",
          params: newParams,
        })
        .then((response) =>
          (response._items || []).map((l) => this._mapSdContentList(l))
        );
    }

    /**
     * @description Maps a content list webhook from the Superdesk internal
     * API to the shape the Publisher UI expects (adds the `id` alias).
     */
    _mapSdContentListWebhook(sdWebhook) {
      if (!sdWebhook) return sdWebhook;
      return {
        ...sdWebhook,
        id: sdWebhook._id,
        excluded_lists: (sdWebhook.excluded_lists || []).map((id) =>
          String(id)
        ),
      };
    }

    /**
     * @ngdoc method
     * @name publisher#queryContentListWebhooks
     * @returns {Promise}
     * @description List all content list webhooks via Superdesk internal API
     */
    queryContentListWebhooks() {
      return pubapi
        .superdeskApiRequest({
          method: "GET",
          path: "/content_list_webhooks",
          params: { max_results: 200 },
        })
        .then((response) =>
          (response._items || []).map((w) => this._mapSdContentListWebhook(w))
        );
    }

    /**
     * @ngdoc method
     * @name publisher#manageContentListWebhook
     * @param {Object} webhook - { url, name, enabled, excluded_lists, _etag }
     * @param {String} id - id of the webhook to update (omit to create)
     * @returns {Promise}
     * @description Create or update a content list webhook via the Superdesk
     * internal API. For updates, webhook._etag is sent as the If-Match header.
     */
    manageContentListWebhook(webhook, id) {
      const isUpdate = !!id;
      const body = {
        url: webhook.url,
        name: webhook.name || null,
        enabled: webhook.enabled !== false,
        excluded_lists: webhook.excluded_lists || [],
      };

      const requestConfig = {
        method: isUpdate ? "PATCH" : "POST",
        path: isUpdate
          ? "/content_list_webhooks/" + id
          : "/content_list_webhooks",
        data: body,
      };

      if (isUpdate && webhook._etag) {
        requestConfig.headers = { "If-Match": webhook._etag };
      }

      return pubapi
        .superdeskApiRequest(requestConfig)
        .then((res) => this._mapSdContentListWebhook(res));
    }

    /**
     * @ngdoc method
     * @name publisher#removeContentListWebhook
     * @param {String} id - id of the webhook to delete
     * @param {String} etag - current _etag of the webhook (required by SD API)
     * @returns {Promise}
     * @description Delete a content list webhook via Superdesk internal API
     */
    removeContentListWebhook(id, etag) {
      return pubapi.superdeskApiRequest({
        method: "DELETE",
        path: "/content_list_webhooks/" + id,
        headers: etag ? { "If-Match": etag } : undefined,
      });
    }

    /**
     * @ngdoc method
     * @name publisher#queryListArticlesWithDetails
     * @param {String} id - id of content list
     * @param {Object} params - { page, limit, ... }
     * @returns {Promise}
     * @description List items of a content list via Superdesk internal API.
     * The response is shaped to look like the previous Publisher API
     * response (page / pages / _embedded._items) so the UI doesn't need
     * to know which backend served it.
     */
    queryListArticlesWithDetails(id, params) {
      const p = { ...(params || {}) };
      const max_results = p.limit || 25;
      const page = p.page || 1;

      // Sort by position ascending. Mongo-style sort string.
      const queryParams = {
        max_results,
        page,
        sort: "position",
      };

      return pubapi
        .superdeskApiRequest({
          method: "GET",
          path: "/content_lists/" + id + "/items",
          params: queryParams,
        })
        .then((response) => {
          const meta = response._meta || {};
          const total = meta.total || 0;
          const pages = max_results > 0 ? Math.ceil(total / max_results) : 1;
          const items = (response._items || []).map((i) =>
            this._mapSdContentListItem(i)
          );

          return {
            page: meta.page || page,
            pages: pages || 1,
            total,
            _embedded: { _items: items },
          };
        });
    }

    /**
     * @ngdoc method
     * @name publisher#saveManualList
     * @param {Object} list - { items: [{content_id, action, position, sticky}], updated_at }
     * @param {String} listId
     * @returns {Promise}
     * @description Bulk-patch items in a manual content list via the
     * Superdesk internal API. Translates the Publisher field names
     * (content_id / updated_at) into the SD ones (contentId / updatedAt).
     */
    saveManualList(list, listId) {
      const items = (list.items || []).map((change) => {
        const out = {
          action: change.action,
          contentId: change.content_id,
        };
        if (change.action !== "delete") {
          out.position = change.position;
          if (typeof change.sticky !== "undefined") out.sticky = change.sticky;
        }
        return out;
      });

      const data = {
        updatedAt: list.updated_at || null,
        items,
      };

      return pubapi
        .superdeskApiRequest({
          method: "PATCH",
          path: "/content_lists/" + listId + "/items",
          data,
        })
        .then((res) => this._mapSdContentList(res));
    }

    /**
     * @ngdoc method
     * @name publisher#queryTenantArticles
     * @param {String} articleStatus - params passed to API (limit, status, route)
     * @returns {Promise}
     * @description List all articles for selected tenant
     */
    queryTenantArticles(articleStatus) {
      return pubapi.queryWithDetails("content/articles", articleStatus);
    }

    /**
     * @ngdoc method
     * @name publisher#searchSuperdeskArticles
     * @param {Object} query - search query with filter, page, max_results, sort
     * @returns {Promise}
     * @description Search articles in Superdesk
     */
    searchSuperdeskArticles(query, extraParams = {}) {
      const source = JSON.stringify(query);
      return pubapi.superdeskApiRequest({
        method: 'GET',
        path: '/search',
        params: { source, ...extraParams },
      });
    }

    /**
     * @ngdoc method
     * @name publisher#searchPublishedArticles
     * @param {Object} query - ES query with filter, from/size, sort
     * @returns {Promise}
     * @description Query the dedicated /published endpoint. Unlike the /search
     * repo=published view, this is the published collection, so corrections
     * (state "corrected") are included; callers should filter to the latest
     * version via last_published_version. Response shape matches /search
     * (_items / _meta).
     */
    searchPublishedArticles(query) {
      const source = JSON.stringify(query);
      return pubapi.superdeskApiRequest({
        method: 'GET',
        path: '/published',
        params: { source },
      });
    }

    /**
     * @ngdoc method
     * @name publisher#exportFromSuperdesk
     * @param {Array} itemIds - array of article GUIDs
     * @returns {Promise}
     * @description Export articles from Superdesk using the /export endpoint with NINJSFormatter
     */
    exportFromSuperdesk(itemIds) {
      return pubapi.superdeskApiRequest({
        method: 'POST',
        path: '/export',
        data: {
          item_ids: itemIds,
          validate: false,
          inline: true,
          format_type: 'NINJSFormatter',
        },
      });
    }

    /**
     * @ngdoc method
     * @name publisher#getArticle
     * @param {String} articleId - id of package
     * @returns {Promise}
     * @description gets article
     */
    getArticle(articleId) {
      return pubapi.get("content/articles", articleId, );
    }

    /**
     * @ngdoc method
     * @name publisher#getArticleByCode
     * @param {String} articleCode - id of package
     * @returns {Promise}
     * @description gets article by code
     */
    getArticleByCode(code) {
      return pubapi.get("content/article", 'search-code', {code: code});
    }

    /**
     * @ngdoc method
     * @name publisher#pushArticle
     * @param {String} article - ninjs of article
     * @returns {Promise}
     * @description push article to publsiher
     */
    publishSuperdeskArticle(status, article) {
      return pubapi.publish(`content/push-with-options?status=${status}`, article);
    }

    /**
     * @ngdoc method
     * @name publisher#queryMonitoringArticles
     * @param {String} articleStatus - status of articles (new, published, unpublished, canceled)
     * @returns {Promise}
     * @description List all articles for monitoring view
     */
    queryMonitoringArticles(articleStatus) {
      return pubapi.queryWithDetails("packages", articleStatus);
    }

    /**
     * @ngdoc method
     * @name publisher#getPackage
     * @param {String} packageId - id of package
     * @returns {Promise}
     * @description List all articles for monitoring view
     */
    getPackage(packageId, withRoutes = false, withContentLists = false) {
      let params = {};

      if (withContentLists) params.withContentLists = true;
      if (withRoutes) params.withRoutes = true;

      return pubapi.get("packages", packageId, params);
    }

    /**
     * @ngdoc method
     * @name publisher#queryRelatedArticlesStatus
     * @param {Number} articleId
     * @returns {Promise}
     * @description List availability of related articles to given article/package
     */
    queryRelatedArticlesStatus(articleId) {
      return pubapi.get("packages/" + articleId + "/related");
    }

    /**
     * @ngdoc method
     * @name publisher#removeArticle
     * @param {Object} update - contains status of article
     * @param {String} articleId - id of article
     * @returns {Promise}
     * @description Remove article from incoming list
     */
    removeArticle(update, articleId) {
      return pubapi.patch("packages/" + articleId, update);
    }

    /**
     * @ngdoc method
     * @name publisher#publishArticle
     * @param {Object} destinations - contains array of destionations where to publish article
     * @param {String} articleId - id of article
     * @returns {Promise}
     * @description Publish article to different tenants
     */
    publishArticle(destinations, articleId) {
      return pubapi.save("packages/" + articleId + "/publish", destinations);
    }

    /**
     * @ngdoc method
     * @name publisher#unPublishArticle
     * @param {String} tenants - containts array of tenants from wchic to unpublish article
     * @param {String} articleId - id of article
     * @returns {Promise}
     * @description Unpublish article from different tenants
     */
    unPublishArticle(tenants, articleId) {
      return pubapi.save("packages/" + articleId + "/unpublish", tenants);
    }

    /**
     * @ngdoc method
     * @name publisher#getSettings
     * @returns {Promise}
     * @description Gets Publisher settings
     */
    getSettings() {
      return pubapi.get("settings");
    }

    /**
     * @ngdoc method
     * @name publisher#saveSettings
     * @returns {Promise}
     * @description Saves Publisher settings
     */
    saveSettings(settings) {
      return pubapi.patch("settings/bulk", settings);
    }

    /**
     * @ngdoc method
     * @name publisher#queryOrganizationRules
     * @returns {Promise}
     * @description Loads Organization Rules
     */
    queryOrganizationRules(params) {
      return pubapi.query("organization/rules", params);
    }

    /**
   * @ngdoc method
   * @name publisher#getAnalyticsReports
   * @returns {Promise}
   * @description List all webhooks
   */
    getAnalyticsReports(params) {
      return pubapi.queryWithDetails("export/analytics", params);
    }

    /**
     * @ngdoc method
     * @name publisher#queryTenantRules
     * @returns {Promise}
     * @description Loads Tenant Rules
     */
    queryTenantRules(params) {
      return pubapi.query("rules", params);
    }

    /**
     * @ngdoc method
     * @name publisher#removeOrganizationRule
     * @param {Number} ruleId - id of rule which is deleted
     * @returns {Promise}
     * @description Delete organization rule
     */
    removeOrganizationRule(ruleId) {
      return pubapi.remove("organization/rules", ruleId);
    }

    /**
     * @ngdoc method
     * @name publisher#manageOrganizationRule
     * @param {Object} rule - rule which is edited
     * @param {String} id - id of rule which is edited
     * @returns {Promise}
     * @description Add or edit organization rule
     */
    manageOrganizationRule(rule, id) {
      return pubapi.save("organization/rules", rule, id);
    }

    /**
     * @ngdoc method
     * @name publisher#removeTenantRule
     * @param {Number} ruleId - id of rule which is deleted
     * @returns {Promise}
     * @description Delete tenant rule
     */
    removeTenantRule(ruleId) {
      return pubapi.remove("rules", ruleId);
    }

    /**
     * @ngdoc method
     * @name publisher#manageTenantRule
     * @param {Object} rule - rule which is edited
     * @param {String} id - id of rule which is edited
     * @returns {Promise}
     * @description Add or edit tenant rule
     */
    manageTenantRule(rule, id) {
      return pubapi.save("rules", rule, id);
    }

    /**
     * @ngdoc method
     * @name publisher#getOrganizationThemes
     * @returns {Promise}
     * @description Gets available themes
     */
    getOrganizationThemes() {
      return pubapi.get("organization/themes");
    }

    /**
     * @ngdoc method
     * @name publisher#uploadOrganizationTheme
     * @param {Object} themeUpload - object with file
     * @returns {Promise}
     * @description Uploads organization theme
     */
    uploadOrganizationTheme(themeUpload) {
      return pubapi.upload("organization/themes", themeUpload);
    }

    /**
     * @ngdoc method
     * @name publisher# uploadMetaImage
     * @param {Object}  imageUpload - object with file
     * @param {String}  slug - article slug
     * @returns {Promise}
     * @description Uploads meta data image
     */
    uploadMetaImage(imageUpload, slug) {
      return pubapi.upload("upload/seo_image", imageUpload, slug);
    }

    /**
     * @ngdoc method
     * @name publisher# uploadThemeLogo
     * @param {Object}  logoUpload - object with file
     * @param {String}  type - type of logo (theme_logo, theme_logo_second etc)
     * @returns {Promise}
     * @description Uploads theme logo
     */
    uploadThemeLogo(logoUpload, type) {
      return pubapi.upload("theme/logo_upload", logoUpload, type);
    }

    /**
     * @ngdoc method
     * @name publisher#installTenantTheme
     * @param {Object} themeInstall - object with params to save
     * @returns {Promise}
     * @description Installs theme on given tenant
     */
    installTenantTheme(themeInstall) {
      return pubapi.save("themes", themeInstall);
    }

    /**
     * @ngdoc method
     * @name publisher#settingsRevert
     * @param {String} scope - scope
     * @returns {Promise}
     * @description Reverts settings by scope
     */
    settingsRevert(scope) {
      return pubapi.post("settings/revert", scope);
    }

    /**
     * @ngdoc method
     * @name publisher#getWebhooks
     * @returns {Promise}
     * @description List all webhooks
     */
    getWebhooks() {
      let params = {
        limit: 9999
      };

      return pubapi.query("webhooks", params);
    }

    /**
    * @ngdoc method
    * @name publisher#manageWebhook
    * @param {Object} webhook - webhook which is edited
    * @param {String} id - id of webhook which is edited
    * @returns {Promise}
    * @description Add or edit tenant rule
    */
    manageWebhook(webhook, id) {
      return pubapi.save("webhooks", webhook, id);
    }

    /**
     * @ngdoc method
     * @name publisher#removeWebhook
     * @param {String} id - id of webhook which is deleted
     * @param {Object} params
     * @returns {Promise}
     * @description Delete webhook
     */
    removeWebhook(id, params) {
      return pubapi.remove("webhooks", id, params);
    }

    /**
     * @ngdoc method
     * @name publisher#manageOrganizationRule
     * @param {Object} data - meta data which is edited
     * @param {String} slug - article slug
     * @returns {Promise}
     * @description Save article meta data
     */
    saveArticleMetaData(data, slug) {
      return pubapi.save("content/articles", { seo_metadata: data }, slug);
    }

    /**
     * @ngdoc method
     * @name publisher#generateAnalyticsReport
     * @param {Object} filters
     * @returns {Promise}
     * @description Save article meta data
     */
    generateAnalyticsReport(filters) {
      return pubapi.save("export/analytics", filters);
    }

    /**
     * @ngdoc method
     * @name publisher#getFailedQueue
     * @param {Object} params
     * @returns {Promise}
     * @description Get failed queue items
     */
    getFailedQueue(params) {
      return pubapi.queryWithDetails("failed_queue", params);
    }


    /**
   * @ngdoc method
   * @name publisher#queryAuthors
   * @returns {Promise}
   * @description Queries authors
   */
    queryAuthors(params) {
      return pubapi.queryWithDetails("authors", params);
    }
  }

  return new Publisher();
}
