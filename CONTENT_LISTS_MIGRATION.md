# Content Lists Migration: Publisher API → Superdesk Internal API

## Overview

Migrated the manual content lists portion of the Superdesk Publisher client component to use the Superdesk internal `/content_lists` API. The available-articles panel (right side of the manual list editor) now also fetches all article states — including published — directly from Superdesk's `/search` endpoint instead of the Publisher tenant articles endpoint.

Automatic lists are explicitly out of scope: they are filtered out of the listing view and the "Automatic" creation option has been removed from the UI.

## Endpoint mapping

| UI action | Old (Publisher) | New (Superdesk) |
|---|---|---|
| List content lists | `GET content/lists` | `GET /content_lists` |
| Get one list | `GET content/lists/:id` | `GET /content_lists/:id` |
| Create list | `POST content/lists` | `POST /content_lists` |
| Update list | `PATCH content/lists/:id` | `PATCH /content_lists/:id` + `If-Match: <_etag>` |
| Delete list | `DELETE content/lists/:id` | `DELETE /content_lists/:id` + `If-Match: <_etag>` |
| List items | `GET content/lists/:id/items` | `GET /content_lists/:id/items?sort=position` |
| Bulk patch items | `PATCH content/lists/:id/items` | `PATCH /content_lists/:id/items` (new body shape) |
| Available articles | `GET content/articles` (Publisher) | `GET /search?repo=published` (Superdesk) |
| Scheduled / in-progress | `GET /search?repo=archive` (Superdesk) | `GET /search?repo=archive` (Superdesk) — unchanged |

## Data-shape translations

The service layer adapts SD payloads to the shape the UI already speaks so the components didn't need to change wholesale.

### List

| SD field | UI field |
|---|---|
| `_id` | `id` |
| `_etag` | `_etag` (still kept for `If-Match`) |
| `_updated` | `updated_at` |
| `_created` | `created_at` |
| `content_list_items_updated_at` | preserved (used as items concurrency token) |

### List item

| SD field | UI field |
|---|---|
| `_id` | `id` (the content-list-item id) |
| `content` (GUID) | `content.id` |
| `article_content.title` | `content.title` |
| `article_content.state` | `content.status` |
| `article_content.thumbnail` | `content.feature_media.renditions[*]` |
| `position`, `sticky` | `position`, `sticky` (+ `sticky_position`) |

### Bulk patch items body

| UI sends | Service translates to |
|---|---|
| `{ items: [{ content_id, action, position, sticky }], updated_at }` | `{ items: [{ contentId, action, position, sticky }], updatedAt }` |

## Files changed

### `client/services/PubAPIFactory.js`
- `superdeskApiRequest` now merges per-call `headers` so callers can attach `If-Match` etc.

### `client/services/PublisherFactory.js`
- Added internal mappers `_mapSdContentList` and `_mapSdContentListItem`.
- Rewrote: `getList`, `manageList`, `removeList`, `queryLists`, `queryListArticlesWithDetails`, `saveManualList` to hit the Superdesk internal API and emit the legacy shape.
- `searchSuperdeskArticles(query, extraParams)` now accepts extra params, used to send `repo=published` or `repo=archive`.
- Removed the now-obsolete `queryListArticles` / `pinArticle` Publisher helpers (`pinArticle` was only used by Automatic).

### `client/components/ContentLists/ContentLists.jsx`
- `_getLists` filters out non-manual types.
- List id matching no longer `parseInt`s the URL param — SD ids are hex strings.
- `addList` always creates a manual list (no `cache_life_time` default).

### `client/components/ContentLists/Listing.jsx`
- Removed the All/Automatic/Manual radio filter.
- Replaced the create-list dropdown with a single "New manual list" button.

### `client/components/ContentLists/ListCard.jsx`
- Removed the Settings modal — the SD API does not expose `description`, `limit`, or `cache_life_time`.
- Save sends only the diffed fields plus `_etag`; delete forwards `_etag`.
- Card body no longer expects `latest_items` / `content_list_items_count` — instead shows the items-updated-at relative time.

### `client/components/ContentLists/Manual/Manual.jsx`
- Default source is now Published. SourceSelect lists Published / Scheduled / In progress, all served by `/search`.
- Available-articles panel always uses `searchSuperdeskArticles`, with `repo=published` for published items and `repo=archive` for the others.
- Removed `_queryArticles`, `_enrichNewItemsFromSuperdesk`, `publishItemFromSuperdesk`, `attemptFetch`, and the drag-end "push article to Publisher" branch — the SD lists API accepts the article GUID directly regardless of state.
- `save()` sends `content_list_items_updated_at` as the optimistic-concurrency token.
- After each items page load, items are sorted client-side by `position`.

### `client/components/ContentLists/Manual/ArticleItem.jsx`
- Friendly labels for SD states (`in_progress` → "In progress", `scheduled` → "Scheduled", etc.); `corrected` treated as published (no badge).

## Verification

- All edited `.js` / `.jsx` files parse cleanly via `@babel/parser` (jsx + classProperties + flow plugins).
- Jest could not be run locally — `node_modules` was empty and the npm registry was unreachable from this sandbox. The existing Jest snapshots for `Listing`, `ListCard`, and `ContentLists` will almost certainly need regenerating; please run `npm install && npm test -- -u` once in your environment.

## Follow-up: remove the Publisher-API dependency from the page

After the initial migration, visiting `/#/publisher/content_lists` still logged the user out because `pubapi.req()`'s 401 handler calls `session.expire()`, and the page was bootstrapping Publisher auth + Publisher-only widgets before anything Superdesk-related happened. The page now talks to Superdesk only.

### Root cause

- `PubAPIFactory.req()` has a generic 401/403 handler that calls `session.expire()` and re-authenticates. Any Publisher-API call that 401s on the content-lists path logs the user out.
- `ContentLists.componentDidMount` was calling `publisher.setToken()` → `publisher.querySites()` (Publisher endpoints) before doing anything Superdesk-related, so an unavailable Publisher backend immediately triggered the logout.
- Two more Publisher entry points were on this path: `PreviewPane.loadArticle` (`publisher.setTenant` + `publisher.getArticle`) and `Manual/FilterPanel.componentDidMount` (`publisher.queryRoutes`).
- The Superdesk internal API calls we added go through `pubapi.superdeskApiRequest`, which uses `$http` directly with `session.token` and does NOT trigger `session.expire()` on 401 — so once the page no longer touches `pubapi.req`, a Publisher outage cannot log the user out.

### Changes

#### `client/components/ContentLists/ContentLists.jsx`
- `componentDidMount` no longer calls `publisher.setToken()` / `publisher.querySites()` / `publisher.setTenant()`. It calls `_getLists()` directly (Superdesk internal API uses the existing session cookie).
- Removed `SitesSideNav`, `selectedSite`, `tenantsNavOpen`, `toggleTenantsNav`, and the `AutomaticList` import/branch — none are reachable now.
- The header no longer renders `/ <site name>`; the `tenant` and `vocabularies` props were removed from propTypes (controller still passes them as extras, harmless).

#### `client/components/ContentLists/PreviewPane.jsx`
- Rewrote as a stateless functional component. No more `publisher.setTenant` / `publisher.getArticle` round-trip — it just renders whatever article payload the parent passed in (SD list-item content or SD search result).
- `publisher` prop dropped; `ContentLists.jsx` no longer passes it.

#### `client/components/ContentLists/Manual/Manual.jsx`
- Removed the `FilterPanel` import, the filter toggle button, and the `<FilterPanel>` JSX block. `Manual/FilterPanel.jsx` was the last Publisher-API entry point on this path (`publisher.queryRoutes` on mount). Filters were already to be ignored per the original brief, so this just stops it from auto-firing a Publisher request.

### Verification

- `grep -nE "publisher\.(setToken|querySites|setTenant|getArticle|queryTenantArticles|queryRoutes|getPackage|getArticleByCode|exportFromSuperdesk|publishSuperdeskArticle|queryAuthors)" client/components/ContentLists -r` now returns no hits in any file rendered on this route (the remaining hit lives in `Manual/FilterPanel.jsx`, which is no longer imported anywhere on this path).
- All edited files parse cleanly via `@babel/parser`.

## Known limitations / follow-ups

- **Automatic and FilterPanel components left in the tree.** `Automatic/Automatic.jsx`, `Automatic/FilterPanel.jsx`, and `Manual/FilterPanel.jsx` are no longer imported anywhere reachable from the content-lists route, but their files still exist. Safe to delete in a follow-up commit.
- **`LanguageSelect` still rendered.** It's still shown in `Manual.jsx`'s available-articles header, but its value is no longer applied to `/search`. Remove or wire up to a SD search filter as desired.
- **`limit`-trim notification dead code.** The list-limit warning in `Manual.jsx` references `this.props.list.limit`, which the SD API never returns; the condition is therefore always false. Left in place to minimise the diff, but it can be removed once you confirm.
- **`sort=position` syntax.** Sent as a hint to the API; items are additionally sorted client-side, so this is safe even if the server ignores the parameter.
- **Jest snapshots will need regenerating.** Existing snapshots for `Listing`, `ListCard`, and `ContentLists` reflect the old UI structure (radio filter, SitesSideNav, etc.). Run `npm install && npm test -- -u` once you're in an environment with deps installed.
