# n8n-nodes-adaptlypost

n8n community node for [AdaptlyPost](https://adaptlypost.com). Publish and schedule posts to Instagram, TikTok, YouTube, X, Facebook, LinkedIn, Pinterest, Threads, Bluesky and Mastodon from a workflow, and start workflows when a post publishes or fails.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation. The package name is `n8n-nodes-adaptlypost`.

## Nodes

### AdaptlyPost

| Resource | Operations |
| --- | --- |
| Post | Create, Get, Get Many, Get Results, Publish Draft, Retry Failed Platforms, Unschedule, Delete |
| Account | Get Many |
| Analytics | Get Overview, Get Timeseries, Get Platform Breakdown, Get Post Analytics |
| Recurring Post | Get, Get Many, Pause, Resume, Delete |

Create takes the accounts to post from (a multi-select loaded from your workspace), the text, and media URLs. Media is copied from the URL you give into AdaptlyPost storage before the post is created, so any public JPEG, PNG, WebP, MP4 or QuickTime link works. TikTok privacy, Pinterest board, Instagram and Facebook post type, YouTube title and privacy, and LinkedIn document title live under Additional Fields.

Repeat on Create turns the post into a recurring post. Pick a Frequency (daily, weekly or monthly), Repeat Every N days, weeks or months (1 to 30), Weekdays for a weekly post, and when it Ends: never, on an End Date, or after a Number of Posts (2 to 365). A recurring post needs a future Scheduled At, which becomes the first post and sets the time of day. It cannot be saved as a draft or include a TikTok account. X and LinkedIn reject identical text, so use spintax such as `{Hi|Hello}` to vary each post. The response carries `recurringPostId`, and every post it creates carries `recurringPostId` and `occurrenceAt`.

Only the next post of an active recurring post exists as a scheduled post. Pause stops the series and deletes that upcoming post; Resume continues from the next date after now and skips the dates missed while paused. Delete stops the series and keeps the posts that already went out. Deleting the single upcoming post with Post > Delete skips that date only. A series pauses itself after 3 failed posts in a row, when the subscription lapses, when its creator loses workspace access, when one of its accounts is disconnected, or when a platform rejects the content; `pauseReason` says which.

The Document content type is LinkedIn only: it publishes exactly one PDF, PPT, PPTX, DOC or DOCX file (max 100 MB, 300 pages), given as the single Media URL, as a LinkedIn document post. LinkedIn shows the file name as the title unless you set LinkedIn Document Title.

### AdaptlyPost Trigger

Registers a webhook with AdaptlyPost and fires on the events you pick:

- Post Published
- Post Partially Failed
- Post Failed
- Post Scheduled
- Account Disconnected

Every delivery is checked against the `x-adaptly-signature` header with the secret AdaptlyPost returned when the webhook was registered.

## Credentials

Create a workspace token at [app.adaptlypost.com/api-tokens](https://app.adaptlypost.com/api-tokens). It starts with `adaptly_` and is scoped to one workspace. Paste it into the AdaptlyPost API credential in n8n. n8n tests the credential with a request to `GET /social-accounts`.

A token carries the role chosen when it was created, and never does more than the member who created it:

| Role | Can |
| --- | --- |
| Admin | Everything, including connecting accounts |
| Editor | Create, schedule, publish, retry and delete posts; manage webhooks |
| Contributor | Create and edit its own drafts, upload media |
| Viewer | Read posts and analytics |

Create takes any key but only an Editor or Admin key can publish or schedule; with a Contributor key turn on Save as Draft. Publish Draft and Retry Failed Platforms need an Editor or Admin key. The AdaptlyPost Trigger registers a webhook when the workflow is activated, which needs an Editor or Admin key. When a key lacks a permission the node fails with the server's message, the required permission and the key's role; a new key of the same role or a retry will not change the answer. `GET /me` returns the role and permissions of the key in hand.

## Compatibility

Tested with n8n 1.100 and later.

## Resources

- [AdaptlyPost API reference](https://adaptlypost.com/docs/api-introduction)
- [AdaptlyPost webhooks](https://adaptlypost.com/docs/webhooks)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
