# Changelog

## Unreleased

- Retry Failed Platforms works again: the API now retries every failed platform of the post when the request names none.
- API keys now carry a workspace role (Admin, Editor, Contributor, Viewer). A 403 `permission_denied` response shows the server message, the required permission and the key's role instead of a generic HTTP error, and never asks you to reconnect. With Continue On Fail the output item carries `code`, `requiredPermission` and `role`.
- A 401 `token_issuer_lost_access` response explains that the key was revoked because its creator left the workspace.
- Credential and field text say that scheduling, publishing and retrying need an Editor or Admin key, that a Contributor key can only save drafts, and that the trigger node needs an Editor or Admin key to register its webhook.

## 0.1.4

- Post gains an Unschedule operation that turns a scheduled or dated draft post back into an undated draft.

## 0.1.3

- Create post and the account lists take Mastodon accounts on any server.

## 0.1.2

- Create post takes Image Alt Texts, one line per image, sent to the platforms that support alt text.

## 0.1.1

- First release published from GitHub Actions with npm provenance.

## 0.1.0

- Initial release.
