# n8n-nodes-adaptlypost

n8n community node for [AdaptlyPost](https://adaptlypost.com). Publish and schedule posts to Instagram, TikTok, YouTube, X, Facebook, LinkedIn, Pinterest, Threads, Bluesky, Mastodon, Google Business Profile, Telegram, Tumblr and WordPress from a workflow, read and answer comments, mentions, direct messages and Google reviews, and start workflows when a post publishes or fails or when something new reaches the inbox.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation. The package name is `n8n-nodes-adaptlypost`.

## Nodes

### AdaptlyPost

| Resource | Operations |
| --- | --- |
| Post | Create, Validate, Get, Get Many, Get Results, Publish Draft, Retry Failed Platforms, Unschedule, Delete |
| Account | Check, Get Many, Get Pinterest Boards, Get WordPress Categories, Look Up LinkedIn Company Page, Remove, Search Instagram Audio |
| Analytics | Get Overview, Get Timeseries, Get Platform Breakdown, Get Post Analytics |
| Inbox | Get Summary, Refresh, Get Many Comments, Get Comment, Reply to Comment, Hide Comment, Unhide Comment, Like Comment, Unlike Comment, Delete Comment, Get Many Mentions, Reply to Mention, Get Many Conversations, Get Conversation, Send Message, Get Many Reviews, Reply to Review, Delete Review Reply, Set Status |
| Recurring Post | Get, Get Many, Pause, Resume, Delete |

Create takes the accounts to post from (a multi-select loaded from your workspace), the text, and media URLs. Media is copied from the URL you give into AdaptlyPost storage before the post is created, so any public JPEG, PNG, WebP, GIF, MP4 or QuickTime link works. GIF images post to Facebook, X, Bluesky, Mastodon, LinkedIn and Tumblr; other platforms refuse them. TikTok privacy, title, caption and interaction settings, Pinterest board and title, Instagram and Facebook post type, Facebook video title, YouTube title, privacy, audio language, tags, license, category and playlist, LinkedIn document title, Tumblr tags, title and source URL, and WordPress title, excerpt, categories and tags live under Additional Fields.

Additional Fields also hold the options below. Each one applies to every selected account of its platform.

- Platform Texts: a different text for one platform, one entry per platform. A platform without an entry uses Text.
- First Comments: one comment per platform, posted from the same account about 10 seconds after the post goes out (60 seconds on YouTube). Works on LinkedIn (1250 characters), X (280), Threads (500), Bluesky (300), Mastodon (500), YouTube (10000), Facebook (8000) and Instagram (2200), not on stories. On X, Threads, Bluesky and Mastodon the comment is a reply. A failed comment never fails the post; the platform entry carries `firstCommentStatus` and `firstCommentError`.
- Thread Replies: turns the post into a thread on X, Threads, Bluesky or Mastodon, one entry per platform. The post opens the thread, and each reply goes out from the same account as a reply to the one before, up to 25 replies. A reply holds up to 300 characters on Bluesky, 500 on Threads, 500 on Mastodon (or the instance's limit) and 280 on X (more on X Premium). Each reply takes up to 4 JPEG, PNG, GIF or WebP image URLs, one per line, copied into AdaptlyPost storage like the post's media; a reply with images may leave its text empty. A platform can have a thread or a first comment, not both. A failed thread never fails the post; Post > Get returns `threadReplies`, `threadReplyMediaUrls`, `threadStatus` (`PENDING`, `PUBLISHED` or `FAILED`), `threadReplyIds`, `threadError` and `threadPublishedAt` on each platform entry.
- Video Thumbnail URL and Video Thumbnail Frame (Ms): a thumbnail for the video on every platform that takes one, as an image or a frame. The image wins everywhere except TikTok.
- Video Thumbnails: a thumbnail per platform for a video post, overriding the two fields above. YouTube, Facebook, Instagram, LinkedIn, Pinterest and Telegram take an image or a video frame, and TikTok takes only a video frame.
- Platform Media: different media for one platform, for when the post media does not fit it, such as a video too long for TikTok or a carousel with more images than X takes. Each entry picks a platform and lists its Media URLs one per line, with optional Image Alt Texts one line per file. A platform without an entry uses Media URLs. The entry must match Content Type and is checked against its own platform only. A platform with an entry does not use Video Thumbnail URL or Video Thumbnail Frame, so give it one under Video Thumbnails. Post > Get returns `mediaOverrideUrls` and `mediaOverrideAltTexts` on each platform entry, empty when that platform uses the post media.
- Image Shape: reframes every image of an image or carousel post to square, portrait, vertical or landscape on Instagram or TikTok, by cropping from the center or padding with a blurred copy.
- Instagram Share to Story and Facebook Share to Story: also publish the same media as a story. The story is its own entry in the post's platforms.
- Instagram Collaborators: up to 3 usernames, one per line.
- Instagram User Tags: public accounts to tag, one row per account with a username and an optional X and Y, up to 20. X and Y place the tag on the image from 0 to 1, measured from the top-left corner. A feed image needs both on every tag, a story takes both or neither, and a video ignores them and tags the account on the whole video. A carousel or several stories with tags are refused. The story made by Instagram Share to Story carries no tags.
- Instagram AI Generated: Instagram shows its "AI info" label on the post. Works on images, carousels, reels and stories.
- Pinterest Board: a dropdown of the boards of the selected Pinterest accounts, also available as Account > Get Pinterest Boards. Leave it empty to pin to a board named AdaptlyPost, which is created on the Pinterest account the first time. With several Pinterest accounts, the board is used for the account that owns it.
- Pinterest Board Name: picks the board by name instead, for when the name comes from an earlier node. AdaptlyPost looks it up among the account's boards when the post is created: an exact match wins, otherwise a single match that ignores case. A name that matches no board, or more than one, fails the item. Set Pinterest Board or Pinterest Board Name, not both.
- Instagram Audio: music or an original sound added to a Reel. Get the Audio ID from Account > Search Instagram Audio, which needs an Instagram account connected through Facebook. Leave Search Query empty to get trending audio.
- Facebook Text Background ID: a colored background for a short text post with no media.
- Facebook Image Layout: Grid (the default) shows the images as a photo grid. Carousel shows them as swipeable cards, each opening its own link, and needs 2 to 5 images, no videos and Facebook Post Type Feed.
- Facebook Carousel Cards: one card per image, in the same order as Media URLs, up to 5, each with a link and an optional title and description. Facebook shows the card image and title only for links to a website the page owns; for other links the post fails with an explanation.
- YouTube AI Generated: YouTube shows its "Altered or synthetic content" label on the video. Use it for realistic content that was generated or altered, such as an AI voice, an AI avatar or edited footage that looks real. Works on videos and Shorts.
- Tumblr Tags: one tag per line, up to 30 tags of up to 140 characters each. A tag can contain spaces but not a comma, and a line with a comma stops the item. AdaptlyPost drops a leading # and keeps a tag once when it repeats with different capitalization.
- Tumblr Title: a heading shown above the media and the text, up to 4096 characters.
- Tumblr Source URL: the link Tumblr shows as the source of the post, up to 2048 characters.
- WordPress Title: up to 300 characters. Left empty, the title is the first line of the text, cut to 100 characters.
- WordPress Excerpt: the summary WordPress shows in post lists and feeds, up to 1000 characters.
- WordPress Categories: a dropdown of the categories of the selected WordPress sites, also available as Account > Get WordPress Categories. A category picked from the list goes only to the site it belongs to. A plain category ID sent from an expression goes to every selected site. Left empty, WordPress uses the site's default category.
- WordPress Tags: tag names, one per line, up to 50 tags of up to 100 characters each. A tag the site does not have yet is created when the WordPress user may manage tags, and skipped otherwise.
- YouTube Audio Language: the language spoken in the video's original audio, as a BCP-47 tag such as `en`, `pt-BR` or `es-419`, so YouTube does not treat the video as another language. It does not turn off YouTube's automatic dubbing.
- TikTok Title, TikTok Caption, TikTok Allow Comments, TikTok Allow Duet, TikTok Allow Stitch, TikTok Send as Draft, TikTok AI Generated, TikTok Branded Content, TikTok Branded Content Own Brand and TikTok Auto Add Music: sent in `tiktokConfigs`. A switch you do not add is left to AdaptlyPost's default; one you add is sent as set, off included.
- YouTube Tags (one per line, up to 20), YouTube License, YouTube Category ID, YouTube Playlist ID, YouTube Notify Subscribers, YouTube Allow Embedding and YouTube Made for Kids: sent in `youtubeConfigs`.
- X Quote Of: quote one of the account's own X posts, by link or ID, with the text as the commentary.
- LinkedIn Reshare Of: reshare a LinkedIn post by its `urn:li:share:` or `urn:li:ugcPost:` URN or its link, with the text as the commentary.
- Pinterest Title: the pin title, up to 100 characters.
- Facebook Video Title: the title of a Facebook video, up to 255 characters.
- X Keep Links Clickable: only for AppSumo lifetime deals. By default AdaptlyPost breaks links in X text, because X charges far more for a post with a link.

Google Business Profile locations show up in the account picker. A Google Business Profile post is text or one JPEG or PNG image, up to 1500 characters. Without settings a location gets a standard update. Add Google Business Profile under Additional Fields to post an event or an offer, or to add a button such as Book or Call. Event dates are in the business's local time, written as `2026-10-01` or `2026-10-01T18:00`.

Telegram channels and groups connected in AdaptlyPost show up in the account picker under their chat title. A Telegram post is text up to 4096 characters, with up to 10 JPEG, PNG or WebP images (10 MB each) or one MP4 or MOV video up to 50 MB. A caption over 1024 characters goes out as its own message after the media. A video can take an image or a video frame as its thumbnail under Video Thumbnails. Telegram takes no first comments or image shapes, has no fields of its own under Additional Fields, and has no analytics. Account > Remove disconnects a Telegram chat like any other account.

Tumblr blogs connected in AdaptlyPost show up in the account picker. A Tumblr post is text up to 32768 characters, up to 30 JPEG or PNG images (10 MB each), or one MP4 video up to 500 MB and 10 minutes. Tumblr refuses WebP. Image Alt Texts reach Tumblr. Tumblr takes no first comments, video thumbnails or image shapes, and has no analytics. Post > Get returns `tumblrTags`, `tumblrTitle` and `tumblrSourceUrl` on each Tumblr platform entry.

Self-hosted WordPress sites (WordPress 5.6 or later, over HTTPS) connected in AdaptlyPost show up in the account picker, one per site. The text becomes the body of a published blog post: blank lines start new paragraphs and bare links become clickable. A WordPress post is text up to 100,000 characters with up to 20 media items: images up to 20 MB and video up to 500 MB. The first image is the featured image, and the other images or the video follow the text. Image Alt Texts reach WordPress. WordPress takes no first comments, video thumbnails or image shapes, and has no analytics. Post > Get returns `wordpressTitle`, `wordpressExcerpt`, `wordpressCategoryIds` and `wordpressTags` on each WordPress platform entry. When a site refuses AdaptlyPost, the site needs reconnecting in AdaptlyPost.

Create answers as soon as AdaptlyPost queues the post, and the post publishes afterwards. By default the node succeeds even when a platform rejects the post later. Turn on Wait for Result under Additional Fields to wait for the outcome. The node then reads `GET /social-posts/{id}/results` every 5 seconds until the post is `COMPLETED`, `PARTIAL_FAILURE` or `FAILED`, for up to Wait Timeout (Seconds), which is 300 unless you change it.

- Completed: the output keeps the fields Create returns and gains `status` and `results`, one result per account with `platform`, `accountName`, `status`, `platformPostId`, `errorMessage` and `publishedAt`.
- Failed on one or more accounts: the item fails with each failed account and its error, for example `Publishing failed on TikTok (radiogyan): TikTok needs a video between 23 and 60 frames per second`.
- Still publishing at the timeout: the item fails with the post ID. The post keeps publishing, and Post > Get Results returns the outcome later.
- With On Error set to Continue, a failed or timed out item is returned with `error`, `status` and `results` and the workflow goes on. With Continue (using error output) it goes to the error output.
- A draft or a scheduled post returns right away. Use the AdaptlyPost Trigger to react when a scheduled post publishes or fails.

Leave Retry On Fail off when Wait for Result is on. Running the node again creates a second post. Retry the failed accounts of the first one with Post > Retry Failed Platforms. Platforms to Retry narrows the retry to some platforms, one per line, by platform name such as `BLUESKY` or by the entry ID from Get Results.

Validate takes the same fields as Create and creates nothing. It sends the post to `POST /social-posts/validate`, which runs every check Create runs, plus the ones that usually fail only at publish time: TikTok creator limits and video length, the YouTube upload quota, expired Instagram and Threads tokens, Mastodon attachment limits, Pinterest boards and X credits. Media URLs are copied into AdaptlyPost storage first, as Create does, so the server can inspect them. The output is the report:

- `valid` is false when any issue is an `ERROR`, which means Create would refuse the post.
- `outcome` is what Create would do: `PUBLISH_NOW`, `SCHEDULED` or `DRAFT`.
- `accounts` has one entry per selected account with its `status` (`READY`, `WARNING` or `BLOCKED`) and `issues`. A warning lets the post through.
- `issues` holds problems with the post as a whole. Each issue has a `code`, a `severity` and a translated `message`.
- `notChecked` lists what only the platform can decide at publish time, so a valid report is not a guarantee.

Put an IF node on `valid` between Validate and Create to stop a post that would fail. Any key that can save drafts may run Validate. When Create itself refuses a post for its content, the error lists every issue with its account, and On Error > Continue returns them in `issues`.

On LinkedIn, mention a company page in the text with `@[Page Name](urn:li:organization:12345)`, using the page name exactly as LinkedIn shows it.

Account > Look Up LinkedIn Company Page finds that mention for you. Company Page takes the page URL (`https://www.linkedin.com/company/acme/`), its vanity name (`acme`) or `@acme`. LinkedIn matches the exact vanity name only, so `acm` or a name with spaces finds nothing. The item carries `id`, `name`, `vanityName`, `urn` and `mention`; paste `mention` into the text as is. When the post also goes to other platforms, put the mention in a LinkedIn entry of Platform Texts, since other platforms show it as plain text. The lookup needs a key with `accounts.read` and runs through one of the workspace's LinkedIn accounts. It fails with `linkedin_organization_query_invalid` when the value is not a page URL or vanity name, `linkedin_organization_not_found` when no page has that vanity name, and `linkedin_organization_lookup_unavailable` when no LinkedIn account of the workspace could run it; connect or reconnect one, ideally a company page the workspace administers.

Repeat on Create turns the post into a recurring post. Pick a Frequency (daily, weekly, monthly or yearly), Repeat Every N days, weeks, months or years (1 to 30), Weekdays for a weekly post, and when it Ends: never, on an End Date, or after a Number of Posts (2 to 365). A recurring post needs a future Scheduled At, which becomes the first post and sets the time of day. It cannot be saved as a draft or include a TikTok account. X and LinkedIn reject identical text, so use spintax such as `{Hi|Hello}` to vary each post. The response carries `recurringPostId`, and every post it creates carries `recurringPostId` and `occurrenceAt`.

Only the next post of an active recurring post exists as a scheduled post. Pause stops the series and deletes that upcoming post; Resume continues from the next date after now and skips the dates missed while paused. Delete stops the series and keeps the posts that already went out. Deleting the single upcoming post with Post > Delete skips that date only. A series pauses itself after 3 failed posts in a row, when the subscription lapses, when its creator loses workspace access, when one of its accounts is disconnected, or when a platform rejects the content; `pauseReason` says which.

The Document content type is LinkedIn only: it publishes exactly one PDF, PPT, PPTX, DOC or DOCX file (max 100 MB, 300 pages), given as the single Media URL, as a LinkedIn document post. LinkedIn shows the file name as the title unless you set LinkedIn Document Title.

Each Analytics operation takes Accounts, to report on some accounts only.

#### Inbox

The inbox holds comments on the posts of the connected accounts (Facebook, Instagram, Threads, YouTube, Bluesky, Mastodon, LinkedIn), mentions (Facebook, Instagram, Threads, Bluesky, Mastodon), direct messages (Facebook, Instagram, Bluesky, Mastodon) and Google Business Profile reviews. TikTok and X have no inbox. AdaptlyPost syncs every account every 10 minutes; Refresh asks for a sync now.

- Get Many Comments, Get Many Mentions, Get Many Conversations and Get Many Reviews list items newest first. Filters take Accounts, Platforms, Statuses (Unread, Read, Done), Since, Search and Cursor. Comments also filter by Post ID (an AdaptlyPost post) or Platform Post ID, and reviews by Ratings and Replied. Return All follows `nextCursor` until the last page. Return Page returns one item holding the list, `total`, `hasMore` and `nextCursor` instead of one item per entry; pass `nextCursor` back in Cursor to read the next page.
- Get Comment returns the comment with the comment it answers (`parent`) and its `replies`. Get Conversation returns the conversation with its `messages`.
- Reply to Comment and Reply to Mention follow the platform's comment limit: LinkedIn 1250 characters, Threads 500, Bluesky 300, Mastodon 500, YouTube 10000, Facebook 8000, Instagram 2200.
- Hide Comment, Unhide Comment, Like Comment, Unlike Comment and Delete Comment work where the platform allows them. Each comment carries `capabilities` (`canReply`, `canHide`, `canDelete`, `canLike`). Liking works on Facebook, Bluesky, Mastodon and LinkedIn. Facebook, Instagram and LinkedIn delete any comment on the account's posts; YouTube, Threads, Bluesky and Mastodon delete only the account's own replies.
- Send Message answers a conversation, up to its `maxMessageLength`. On Facebook and Instagram a message can only go out within 24 hours of the other person's last message (`replyWindowEndsAt`).
- Reply to Review posts the one reply Google allows, up to 4096 bytes, replacing an earlier one. Delete Review Reply removes it.
- Set Status marks 1 to 100 comments, mentions, conversations or reviews, one ID per line, as Unread, Read or Done, and returns them with the new unread count.
- Get Summary returns the unread count per channel and, per account, whether each channel is `AVAILABLE`, `RECONNECT_REQUIRED` or `UNSUPPORTED`.

Reading needs a key with `inbox.read` and answering one with `inbox.reply`, plus an active AdaptlyPost plan. Some channels wait on platform review (Messenger and Instagram messages, Threads mentions); an account without the permission shows `RECONNECT_REQUIRED` and an answer is refused with `inbox_reconnect_required`. Other refusals carry `inbox_item_not_found`, `inbox_action_unsupported`, `inbox_reply_invalid` (the message names the limit), `inbox_messaging_window_closed`, `inbox_rate_limited` (try again later) and `inbox_platform_error` (try again later). With On Error set to Continue the item carries the `code`.

### AdaptlyPost Trigger

Registers a webhook with AdaptlyPost and fires on the events you pick:

- Post Published
- Post Partially Failed
- Post Failed
- Post Scheduled
- Account Disconnected
- Image Completed and Image Failed
- New Comment (`comment.created`): someone commented on a post of a connected account. The output carries `comment`.
- Comment Replied (`comment.replied`): the account replied to a comment, from AdaptlyPost or from the platform's own app. The output carries the reply as `comment` and `parentCommentId`.
- New Mention (`mention.created`): carries `mention`.
- Message Received (`message.received`): carries `conversation` and `message`.
- New Review (`review.created`): a new Google review, carries `review`.

The webhook is registered with the events you pick and receives only those. Changing the selection updates the webhook the next time the workflow is activated. Inbox events arrive after the next inbox sync, within about 10 minutes, and never for comments, messages or reviews that were already there when the account was connected.

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
