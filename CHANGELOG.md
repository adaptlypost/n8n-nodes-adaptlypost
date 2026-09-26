# Changelog

## 0.4.0

- Post Get Many and Recurring Post Get Many send Statuses and Platforms as repeated query keys, so the filters work. Before, n8n sent `statuses[0]=`, which the API rejected with a 400, and analytics silently ignored the Platforms filter.
- Analytics Timeseries sends the granularity the API reads (`granularity=DAILY|WEEKLY|MONTHLY`). Before, the setting was ignored and every result came back daily. Saved workflows keep working.
- Post Analytics caps Limit at 100 and gains Return All, which pages until there are no more posts.
- The trigger rejects deliveries that are missing the signature or timestamp header when a signing secret is stored.
- A 403 names the key's role, and says so when the key's creator was demoted and the key holds only that member's permissions.
- The account picker lists disconnected accounts last and marks them, and Create Post refuses them before calling the API.

## 0.3.0

- Create post takes Instagram Trial Reel under Additional Fields, sent as `instagramConfigs[].trialGraduation` for every selected Instagram account. You Share It From the Instagram App sends `MANUAL`, Instagram Shares It If It Performs Well sends `SS_PERFORMANCE`, and No Trial sends nothing. Only a single video posted as a Reel or Feed video can be a trial; a Story, image or carousel is rejected with a 400. Post responses may carry `instagramTrialGraduation` on the Instagram platform entry.

## 0.2.0

- Create post takes a Repeat option group: Frequency (Daily, Weekly, Monthly), Repeat Every (1 to 30), Weekdays for weekly posts, and Ends (Never, On Date with End Date, After Number of Posts with Number of Posts from 2 to 365). It is sent as `recurrence` only when a Frequency is set, with the end date as YYYY-MM-DD. A recurring post needs a future Scheduled At and cannot be a draft or include TikTok. The response carries `recurringPostId`.
- New Recurring Post resource with Get, Get Many (Return All, Limit, Statuses filter), Pause, Resume and Delete.
- Post objects may carry `recurringPostId` and `occurrenceAt`.

## 0.1.5

- Create post and the account lists take Google Business Profile locations. Additional Fields set the post type (Standard, Event, Offer), the button and its link, the event or offer title and local start and end, and the offer's coupon code, redeem link and terms. Get Many and the analytics platform filter take Google Business Profile too.
- Retry Failed Platforms works again: the API now retries every failed platform of the post when the request names none.
- API keys now carry a workspace role (Admin, Editor, Contributor, Viewer). A 403 `permission_denied` response shows the server message, the required permission and the key's role instead of a generic HTTP error, and never asks you to reconnect. With Continue On Fail the output item carries `code`, `requiredPermission` and `role`.
- A 401 `token_issuer_lost_access` response explains that the key was revoked because its creator left the workspace.
- Create post takes the Document content type for LinkedIn document posts: exactly one PDF, PPT, PPTX, DOC or DOCX file (max 100 MB, 300 pages) in Media URLs. Media URLs now accept those file types, and the uploaded file keeps its extension.
- Create post takes LinkedIn Document Title under Additional Fields, sent as `linkedinConfigs[].documentTitle` for every selected LinkedIn account (up to 100 characters, defaults to the file name, ignored for other content types). Post responses may carry `linkedinDocumentTitle` on the LinkedIn platform entry.
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
