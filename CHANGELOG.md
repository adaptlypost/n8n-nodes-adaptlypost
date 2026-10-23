# Changelog

## 0.14.0

- Create and Validate take Instagram User Tags under Additional Fields, sent as `instagramConfigs[].userTags`. Add one row per public account to tag, up to 20, with a username and an optional X and Y from 0 to 1 measured from the top-left corner of the image. A feed image needs X and Y on every tag, a story takes both or neither, and a video ignores them and tags the account on the whole video. Tags work on one image or one video; a carousel or several stories with tags are refused.
- When Instagram refuses a tag because the account is private or does not exist, the post goes out without its tags and `instagramUntaggedUsernames` lists the refused usernames.
- Post responses may carry `instagramUserTags` and `instagramUntaggedUsernames`.
- Workflows that never set it post without tags, as before.

## 0.13.0

- Post > Validate checks a post without creating it. It takes the same fields as Create and sends them to `POST /social-posts/validate`, which runs every check Create runs, plus the ones that usually fail only at publish time: TikTok creator limits and video length, the YouTube upload quota, expired Instagram and Threads tokens, Mastodon attachment limits, Pinterest boards and X credits. Nothing is scheduled or published, and any key that can save drafts may run it.
- The output is the report: `valid` (false when any issue is an `ERROR`), `outcome` (`PUBLISH_NOW`, `SCHEDULED` or `DRAFT`), `accounts` with each account's `status` (`READY`, `WARNING` or `BLOCKED`) and its `issues`, `issues` for the post as a whole, and `notChecked`, what only the platform can decide at publish time. Branch on `valid` with an IF node before Create.
- Media URLs are copied into AdaptlyPost storage first, as Create does, so the server can inspect the files.
- When Create is refused for its content, the error now lists every issue with its account, and On Error > Continue returns them in `issues`. The error message is the same as before.

## 0.12.0

- Create post takes YouTube AI Generated under Additional Fields, sent as `youtubeConfigs[].aiGenerated`. YouTube shows its "Altered or synthetic content" label on the video. Use it for realistic content that was generated or altered, such as an AI voice, an AI avatar or edited footage that looks real. It works on videos and Shorts.
- Post responses may carry `youtubeAiGenerated`.
- Workflows that never set it post without the label, as before.

## 0.11.0

- Account > Remove disconnects an account from the workspace through `DELETE /social-accounts/{id}`, the same as removing it on the Connectors page. It works on disconnected accounts too, so a workflow can drop the account named by the Account Disconnected trigger. It takes an account ID or a Facebook page ID and returns `id`, `platform`, `displayName`, `pageId` and `removed: true`.
- Removing an account needs an Admin token. Other roles get the 403 `permission_denied` error AdaptlyPost returns. An account the workspace does not hold returns 404.

## 0.10.0

- Create post takes Facebook Image Layout and Facebook Carousel Cards under Additional Fields, sent as `facebookConfigs[].imageLayout` and `facebookConfigs[].carouselCards`. Carousel shows 2 to 5 images as swipeable cards, each opening its own link, with an optional title and description. Add one card per image, in the same order as Media URLs. Cards are sent only when the layout is Carousel.
- A carousel needs 2 to 5 images, no videos, Facebook Post Type Feed and one card per image, or AdaptlyPost refuses the post. Facebook shows the card image and title only for links to a website the page owns; for other links the post fails with the error Facebook returns.
- Workflows that never set the layout keep posting a photo grid.

## 0.9.0

- Create post takes Instagram AI Generated under Additional Fields, sent as `instagramConfigs[].aiGenerated`. Instagram shows its "AI info" label on the post. It works on images, carousels, reels and stories, and a story made with Instagram Share to Story carries the label too.
- Post responses may carry `instagramAiGenerated`.

## 0.8.0

- Create post takes Pinterest Board Name under Additional Fields, sent as `pinterestConfigs[].boardName`. It picks the board by name, which helps when the name comes from an earlier node. AdaptlyPost looks the name up among the boards of the Pinterest account when the post is created: an exact match wins, otherwise a single match that ignores case. A name that matches no board, or more than one, fails the item with AdaptlyPost's message. It never falls back to another board.
- With several Pinterest accounts, the name is sent only to the accounts that have a board with that name and the others pin to their AdaptlyPost board. A name that none of them has stops the item with an error.
- Setting both Pinterest Board and Pinterest Board Name stops the item with "Set Pinterest Board or Pinterest Board Name, not both" before anything is uploaded.
- Pinterest Board keeps working as before.

## 0.7.0

- Create post takes Wait for Result under Additional Fields, off by default. When on, the node reads `GET /social-posts/{id}/results` every 5 seconds until the post is `COMPLETED`, `PARTIAL_FAILURE` or `FAILED`, and adds `status` and `results` to the fields Create already returns. Before, the node returned as soon as the post was queued, so a platform error that came later never showed in n8n.
- A post that ends as `FAILED` or `PARTIAL_FAILURE` fails the item with each failed account and its error, for example "Publishing failed on TikTok (radiogyan): TikTok needs a video between 23 and 60 frames per second". With On Error set to Continue, the item is returned with `error`, `status` and `results` instead.
- Wait Timeout (Seconds) sets how long to wait, 300 by default. A post still publishing at the timeout fails the item with its post ID, and Post > Get Results returns the outcome later.
- A draft or a scheduled post returns right away, as before.
- A status the node does not know fails the item instead of passing as a success.

## 0.6.0

- Create post no longer fails with "Pinterest posts need a board ID" when Pinterest Board is empty. The pin goes to a board named AdaptlyPost, which is created on the Pinterest account the first time.
- Pinterest Board is a dropdown of the boards of the Pinterest accounts selected in Accounts. An ID from an expression still works, so saved workflows keep running.
- With several Pinterest accounts selected, the board is sent only to the account that owns it and the others pin to their AdaptlyPost board. A board that none of them owns stops the item with an error.
- Pinterest Link is sent without a board.
- New Account > Get Pinterest Boards operation (`GET /social-accounts/{id}/pinterest-boards`). It returns one item per board with `id`, `name`, `description`, `privacy` and `pinCount`, secret boards included.

## 0.5.0

- Create post takes Google Business Profile locations. The account picker lists them, and Additional Fields > Google Business Profile sets the post type (update, event or offer), a button (Book, Order, Shop, Learn More, Sign Up or Call) with its URL, the event title and dates, and the offer coupon code, redeem URL and terms. It is sent as `googleBusinessConnectionIds` and `googleBusinessConfigs` for every selected location.
- Create post takes First Comments, one per platform, sent as `firstComments`. LinkedIn, X, Threads, Bluesky, Mastodon and YouTube support them.
- Create post takes Video Thumbnails, an image or a video frame per platform, sent as `platformThumbnails`. An image URL is copied into AdaptlyPost storage first, like Media URLs.
- Create post takes Image Shape per platform (Instagram or TikTok) with Crop or Pad, sent as `platformAspectRatios`.
- Create post takes Instagram Share to Story, Instagram Collaborators (one username per line, up to 3) and Instagram Audio, sent in `instagramConfigs`.
- Create post takes Facebook Share to Story and Facebook Text Background ID, sent in `facebookConfigs`.
- Create post takes X Keep Links Clickable, sent as `twitterKeepLinks`. Only AppSumo lifetime deals can use it.
- Repeat takes a Yearly frequency: the post comes back on the same date every year or every N years. A series started on February 29 posts on February 28 in other years.
- New Account > Search Instagram Audio operation (`GET /social-accounts/{id}/instagram-audio`) with Audio Type (music or original sound) and an optional Search Query. It returns one item per track.
- Post Get Many can filter by Google Business Profile and Telegram. The analytics Platforms filter gains Google Business Profile and X.
- Post responses may carry the new platform fields: `firstComment`, `firstCommentStatus`, `firstCommentError`, `thumbnailUrl`, `thumbnailTimestampMs`, `mediaAspectRatio`, `mediaAspectRatioFit`, `instagramCollaborators`, `instagramAudioId`, `facebookTextFormatPresetId`, `twitterKeepLinks` and the `googleBusiness*` settings. Accounts may carry `supportsInstagramAudio`.

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
