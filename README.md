# n8n-nodes-adaptlypost

n8n community node for [AdaptlyPost](https://adaptlypost.com). Publish and schedule posts to Instagram, TikTok, YouTube, X, Facebook, LinkedIn, Pinterest, Threads, Bluesky, Mastodon and Google Business Profile from a workflow, and start workflows when a post publishes or fails.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation. The package name is `n8n-nodes-adaptlypost`.

## Nodes

### AdaptlyPost

| Resource | Operations |
| --- | --- |
| Post | Create, Validate, Get, Get Many, Get Results, Publish Draft, Retry Failed Platforms, Unschedule, Delete |
| Account | Get Many, Get Pinterest Boards, Remove, Search Instagram Audio |
| Analytics | Get Overview, Get Timeseries, Get Platform Breakdown, Get Post Analytics |
| Recurring Post | Get, Get Many, Pause, Resume, Delete |

Create takes the accounts to post from (a multi-select loaded from your workspace), the text, and media URLs. Media is copied from the URL you give into AdaptlyPost storage before the post is created, so any public JPEG, PNG, WebP, MP4 or QuickTime link works. TikTok privacy, Pinterest board, Instagram and Facebook post type, YouTube title and privacy, and LinkedIn document title live under Additional Fields.

Additional Fields also hold the options below. Each one applies to every selected account of its platform.

- First Comments: one comment per platform, posted from the same account about 10 seconds after the post goes out (60 seconds on YouTube). Works on LinkedIn, X, Threads, Bluesky, Mastodon and YouTube. A failed comment never fails the post; the platform entry carries `firstCommentStatus` and `firstCommentError`.
- Video Thumbnails: a thumbnail per platform for a video post. YouTube, Facebook and LinkedIn take an image, TikTok takes a video frame, and Instagram and Pinterest take either.
- Image Shape: reframes every image of an image or carousel post to square, portrait, vertical or landscape on Instagram or TikTok, by cropping from the center or padding with a blurred copy.
- Instagram Share to Story and Facebook Share to Story: also publish the same media as a story. The story is its own entry in the post's platforms.
- Instagram Collaborators: up to 3 usernames, one per line.
- Instagram AI Generated: Instagram shows its "AI info" label on the post. Works on images, carousels, reels and stories.
- Pinterest Board: a dropdown of the boards of the selected Pinterest accounts, also available as Account > Get Pinterest Boards. Leave it empty to pin to a board named AdaptlyPost, which is created on the Pinterest account the first time. With several Pinterest accounts, the board is used for the account that owns it.
- Pinterest Board Name: picks the board by name instead, for when the name comes from an earlier node. AdaptlyPost looks it up among the account's boards when the post is created: an exact match wins, otherwise a single match that ignores case. A name that matches no board, or more than one, fails the item. Set Pinterest Board or Pinterest Board Name, not both.
- Instagram Audio: music or an original sound added to a Reel. Get the Audio ID from Account > Search Instagram Audio, which needs an Instagram account connected through Facebook. Leave Search Query empty to get trending audio.
- Facebook Text Background ID: a colored background for a short text post with no media.
- Facebook Image Layout: Grid (the default) shows the images as a photo grid. Carousel shows them as swipeable cards, each opening its own link, and needs 2 to 5 images, no videos and Facebook Post Type Feed.
- Facebook Carousel Cards: one card per image, in the same order as Media URLs, up to 5, each with a link and an optional title and description. Facebook shows the card image and title only for links to a website the page owns; for other links the post fails with an explanation.
- YouTube AI Generated: YouTube shows its "Altered or synthetic content" label on the video. Use it for realistic content that was generated or altered, such as an AI voice, an AI avatar or edited footage that looks real. Works on videos and Shorts.
- X Keep Links Clickable: only for AppSumo lifetime deals. By default AdaptlyPost breaks links in X text, because X charges far more for a post with a link.

Google Business Profile locations show up in the account picker. A Google Business Profile post is text or one JPEG or PNG image, up to 1500 characters. Without settings a location gets a standard update. Add Google Business Profile under Additional Fields to post an event or an offer, or to add a button such as Book or Call. Event dates are in the business's local time, written as `2026-10-01` or `2026-10-01T18:00`.

Create answers as soon as AdaptlyPost queues the post, and the post publishes afterwards. By default the node succeeds even when a platform rejects the post later. Turn on Wait for Result under Additional Fields to wait for the outcome. The node then reads `GET /social-posts/{id}/results` every 5 seconds until the post is `COMPLETED`, `PARTIAL_FAILURE` or `FAILED`, for up to Wait Timeout (Seconds), which is 300 unless you change it.

- Completed: the output keeps the fields Create returns and gains `status` and `results`, one result per account with `platform`, `accountName`, `status`, `platformPostId`, `errorMessage` and `publishedAt`.
- Failed on one or more accounts: the item fails with each failed account and its error, for example `Publishing failed on TikTok (radiogyan): TikTok needs a video between 23 and 60 frames per second`.
- Still publishing at the timeout: the item fails with the post ID. The post keeps publishing, and Post > Get Results returns the outcome later.
- With On Error set to Continue, a failed or timed out item is returned with `error`, `status` and `results` and the workflow goes on. With Continue (using error output) it goes to the error output.
- A draft or a scheduled post returns right away. Use the AdaptlyPost Trigger to react when a scheduled post publishes or fails.

Leave Retry On Fail off when Wait for Result is on. Running the node again creates a second post. Retry the failed accounts of the first one with Post > Retry Failed Platforms.

Validate takes the same fields as Create and creates nothing. It sends the post to `POST /social-posts/validate`, which runs every check Create runs, plus the ones that usually fail only at publish time: TikTok creator limits and video length, the YouTube upload quota, expired Instagram and Threads tokens, Mastodon attachment limits, Pinterest boards and X credits. Media URLs are copied into AdaptlyPost storage first, as Create does, so the server can inspect them. The output is the report:

- `valid` is false when any issue is an `ERROR`, which means Create would refuse the post.
- `outcome` is what Create would do: `PUBLISH_NOW`, `SCHEDULED` or `DRAFT`.
- `accounts` has one entry per selected account with its `status` (`READY`, `WARNING` or `BLOCKED`) and `issues`. A warning lets the post through.
- `issues` holds problems with the post as a whole. Each issue has a `code`, a `severity` and a translated `message`.
- `notChecked` lists what only the platform can decide at publish time, so a valid report is not a guarantee.

Put an IF node on `valid` between Validate and Create to stop a post that would fail. Any key that can save drafts may run Validate. When Create itself refuses a post for its content, the error lists every issue with its account, and On Error > Continue returns them in `issues`.

On LinkedIn, mention a company page in the text with `@[Page Name](urn:li:organization:12345)`, using the page name exactly as LinkedIn shows it.

Repeat on Create turns the post into a recurring post. Pick a Frequency (daily, weekly, monthly or yearly), Repeat Every N days, weeks, months or years (1 to 30), Weekdays for a weekly post, and when it Ends: never, on an End Date, or after a Number of Posts (2 to 365). A recurring post needs a future Scheduled At, which becomes the first post and sets the time of day. It cannot be saved as a draft or include a TikTok account. X and LinkedIn reject identical text, so use spintax such as `{Hi|Hello}` to vary each post. The response carries `recurringPostId`, and every post it creates carries `recurringPostId` and `occurrenceAt`.

Only the next post of an active recurring post exists as a scheduled post. Pause stops the series and deletes that upcoming post; Resume continues from the next date after now and skips the dates missed while paused. Delete stops the series and keeps the posts that already went out. Deleting the single upcoming post with Post > Delete skips that date only. A series pauses itself after 3 failed posts in a row, when the subscription lapses, when its creator loses workspace access, when one of its accounts is disconnected, or when a platform rejects the content; `pauseReason` says which.

The Document content type is LinkedIn only: it publishes exactly one PDF, PPT, PPTX, DOC or DOCX file (max 100 MB, 300 pages), given as the single Media URL, as a LinkedIn document post. LinkedIn shows the file name as the title unless you set LinkedIn Document Title.

### AdaptlyPost Trigger

Registers a webhook with AdaptlyPost and fires on the events you pick:

- Post Published
- Post Partially Failed
- Post Failed
- Post Scheduled
- Account Disconnected

Account > Remove disconnects an account from the workspace, disconnected ones included, and returns `id`, `platform`, `displayName`, `pageId` for Facebook pages and `removed: true`. Feed it the account ID from Account Disconnected to drop accounts nobody will reconnect. Pending and recurring posts stop publishing to the account, and only a workspace Admin token can remove one.

Every delivery is checked against the `x-adaptly-signature` and `x-adaptly-timestamp` headers with the secret AdaptlyPost returned when the webhook was registered. A request with a missing or wrong signature is answered with 401 and does not start the workflow. Each active trigger registers its own webhook, and a workspace can have at most 10.

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
