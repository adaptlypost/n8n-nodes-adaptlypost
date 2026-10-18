import type { INodeProperties } from 'n8n-workflow';

import { DEFAULT_WAIT_TIMEOUT_SECONDS } from './postResults';

const onlyPosts = { resource: ['post'] };
const withPostId = { resource: ['post'], operation: ['delete', 'get', 'getResults', 'publishDraft', 'retry', 'unschedule'] };

export const postProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: onlyPosts },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a post',
				description:
					'Publish now, schedule, or save a draft on one or more accounts. Publishing and scheduling need an Editor or Admin key; a Contributor key can only save drafts.',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a post',
				description:
					'Delete a draft or scheduled post. A Contributor key can only delete its own drafts.',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a post',
				description: 'Get one post with its per-platform status',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many posts',
				description: 'List posts, newest first',
			},
			{
				name: 'Get Results',
				value: 'getResults',
				action: 'Get publishing results of a post',
				description: 'Get the publishing outcome of a post on each platform',
			},
			{
				name: 'Publish Draft',
				value: 'publishDraft',
				action: 'Publish a draft post',
				description: 'Publish a draft now or schedule it. Needs an Editor or Admin key.',
			},
			{
				name: 'Retry Failed Platforms',
				value: 'retry',
				action: 'Retry failed platforms of a post',
				description:
					'Re-queue publishing for every platform that failed. Needs an Editor or Admin key.',
			},
			{
				name: 'Unschedule',
				value: 'unschedule',
				action: 'Unschedule a post',
				description: 'Turn a scheduled or dated draft post back into an undated draft',
			},
		],
		default: 'create',
	},
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: withPostId },
		description: 'ID returned when the post was created, or from Get Many',
	},
	{
		displayName: 'Account Names or IDs',
		name: 'accountIds',
		type: 'multiOptions',
		required: true,
		default: [],
		typeOptions: { loadOptionsMethod: 'getAccounts' },
		displayOptions: { show: { resource: ['post'], operation: ['create'] } },
		description:
			'Connected accounts to post from. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Content Type',
		name: 'contentType',
		type: 'options',
		options: [
			{ name: 'Carousel', value: 'CAROUSEL' },
			{
				name: 'Document',
				value: 'DOCUMENT',
				description:
					'LinkedIn only. Publishes exactly one PDF, PPT, PPTX, DOC or DOCX file (max 100 MB, 300 pages) as a LinkedIn document post.',
			},
			{ name: 'Image', value: 'IMAGE' },
			{ name: 'Text', value: 'TEXT' },
			{ name: 'Video', value: 'VIDEO' },
		],
		default: 'TEXT',
		displayOptions: { show: { resource: ['post'], operation: ['create'] } },
		description:
			'Document is LinkedIn only and takes exactly one PDF, PPT, PPTX, DOC or DOCX file in Media URLs. AdaptlyPost refuses a Document post on another platform, with two or more files, or with an image or video, and refuses a document file on any other content type. Google Business Profile takes Text or Image, with one JPEG or PNG image up to 5 MB.',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		displayOptions: { show: { resource: ['post'], operation: ['create'] } },
		description:
			"Caption shared across the selected platforms. On LinkedIn, mention a company page with @[Page Name](urn:li:organization:12345), using the page's numeric ID and its name exactly as LinkedIn shows it.",
	},
	{
		displayName: 'Media URLs',
		name: 'mediaUrls',
		type: 'string',
		default: '',
		placeholder: 'https://example.com/photo.jpg, https://example.com/clip.mp4',
		displayOptions: { show: { resource: ['post'], operation: ['create'] } },
		description:
			'Comma-separated public URLs of JPEG, PNG, WebP, MP4 or QuickTime files. For a Document post, the URL of that one PDF, PPT, PPTX, DOC or DOCX file (max 100 MB, 300 pages). Each file is copied into AdaptlyPost storage before posting.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['post'], operation: ['create'] } },
		options: [
			{
				displayName: 'Facebook Post Type',
				name: 'facebookPostType',
				type: 'options',
				options: [
					{ name: 'Feed', value: 'FEED' },
					{ name: 'Reel', value: 'REEL' },
					{ name: 'Story', value: 'STORY' },
				],
				default: 'FEED',
			},
			{
				displayName: 'Facebook Share to Story',
				name: 'facebookShareToStory',
				type: 'boolean',
				default: false,
				description:
					'Whether to also publish the same media as a story on each selected Facebook page, next to the Feed or Reel post. The story is its own entry in the post platforms and succeeds, fails and retries on its own. It skips the caption, video title and text background, needs an image, video or carousel, and a video must be 60 seconds or shorter. Ignored when Facebook Post Type is Story.',
			},
			{
				displayName: 'Facebook Text Background ID',
				name: 'facebookTextFormatPresetId',
				type: 'string',
				default: '',
				placeholder: '106018623298955',
				description:
					"Facebook's ID for a colored text background, for example 106018623298955 (solid purple) or 249307305544279 (red to blue gradient). Only for Text posts with no media and text up to 130 characters. Links in the text show without a preview. If Facebook refuses the background, the post goes out as plain text.",
			},
			{
				displayName: 'First Comments',
				name: 'firstComments',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add First Comment',
				default: {},
				description:
					'A comment posted from the same account about 10 seconds after the post goes out (60 seconds on YouTube), one per platform. A comment that fails never fails the post: read firstCommentStatus and firstCommentError on the platform. A platform the post does not go to, a private or made for kids YouTube video and a Facebook or Instagram story are refused.',
				options: [
					{
						displayName: 'Comment',
						name: 'comment',
						values: [
							{
								displayName: 'Platform',
								name: 'platform',
								type: 'options',
								options: [
									{ name: 'Bluesky', value: 'BLUESKY', description: 'Up to 300 characters, posted as a reply' },
									{ name: 'LinkedIn', value: 'LINKEDIN', description: 'Up to 1250 characters' },
									{ name: 'Mastodon', value: 'MASTODON', description: 'Up to 500 characters, posted as a reply' },
									{ name: 'Threads', value: 'THREADS', description: 'Up to 500 characters, posted as a reply' },
									{
										name: 'X (Twitter)',
										value: 'TWITTER',
										description:
											'Up to 280 characters, posted as a reply. Not retried if it fails.',
									},
									{ name: 'YouTube', value: 'YOUTUBE', description: 'Up to 10000 characters' },
								],
								default: 'LINKEDIN',
							},
							{
								displayName: 'Text',
								name: 'text',
								type: 'string',
								typeOptions: { rows: 2 },
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Google Business Profile',
				name: 'googleBusiness',
				type: 'fixedCollection',
				placeholder: 'Add Google Business Profile Settings',
				default: {},
				description:
					'Applied to every selected Google Business Profile location. Without it a location gets a standard update.',
				options: [
					{
						displayName: 'Settings',
						name: 'settings',
						values: [
							{
								displayName: 'Button',
								name: 'callToActionType',
								type: 'options',
								options: [
									{ name: 'Book', value: 'BOOK' },
									{
										name: 'Call',
										value: 'CALL',
										description: 'Dials the phone number on the Business Profile',
									},
									{ name: 'Learn More', value: 'LEARN_MORE' },
									{ name: 'No Button', value: '' },
									{ name: 'Order', value: 'ORDER' },
									{ name: 'Shop', value: 'SHOP' },
									{ name: 'Sign Up', value: 'SIGN_UP' },
								],
								default: '',
								description: 'Button shown on the post',
							},
							{
								displayName: 'Button URL',
								name: 'callToActionUrl',
								type: 'string',
								default: '',
								placeholder: 'https://example.com/book',
								displayOptions: { hide: { callToActionType: ['', 'CALL'] } },
								description: 'Where the button leads. Required for every button except Call.',
							},
							{
								displayName: 'Event End',
								name: 'eventEnd',
								type: 'string',
								default: '',
								placeholder: '2026-10-01T21:00',
								displayOptions: { show: { topicType: ['EVENT', 'OFFER'] } },
								description:
									"YYYY-MM-DD or YYYY-MM-DDTHH:mm in the business's local time, with no offset",
							},
							{
								displayName: 'Event Start',
								name: 'eventStart',
								type: 'string',
								default: '',
								placeholder: '2026-10-01T18:00',
								displayOptions: { show: { topicType: ['EVENT', 'OFFER'] } },
								description:
									"YYYY-MM-DD or YYYY-MM-DDTHH:mm in the business's local time, with no offset. Google reads it in the location's time zone.",
							},
							{
								displayName: 'Event Title',
								name: 'eventTitle',
								type: 'string',
								default: '',
								displayOptions: { show: { topicType: ['EVENT', 'OFFER'] } },
								description: 'Required for an event or an offer',
							},
							{
								displayName: 'Offer Coupon Code',
								name: 'offerCouponCode',
								type: 'string',
								default: '',
								displayOptions: { show: { topicType: ['OFFER'] } },
							},
							{
								displayName: 'Offer Redeem URL',
								name: 'offerRedeemUrl',
								type: 'string',
								default: '',
								displayOptions: { show: { topicType: ['OFFER'] } },
							},
							{
								displayName: 'Offer Terms',
								name: 'offerTerms',
								type: 'string',
								typeOptions: { rows: 2 },
								default: '',
								displayOptions: { show: { topicType: ['OFFER'] } },
							},
							{
								displayName: 'Post Type',
								name: 'topicType',
								type: 'options',
								options: [
									{ name: 'Event', value: 'EVENT' },
									{ name: 'Offer', value: 'OFFER' },
									{ name: 'Update', value: 'STANDARD' },
								],
								default: 'STANDARD',
								description: 'An event or an offer needs Event Title, Event Start and Event End',
							},
						],
					},
				],
			},
			{
				displayName: 'Image Alt Texts',
				name: 'mediaAltTexts',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				placeholder: 'A red bicycle leaning on a brick wall',
				description:
					'Alt text for each image, one line per image in the same order as Media URLs. Leave a line empty to skip an image. Sent to X, Bluesky, Mastodon, LinkedIn, Facebook, Instagram and Threads; Pinterest uses the first line.',
			},
			{
				displayName: 'Image Shape',
				name: 'platformAspectRatios',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Image Shape',
				default: {},
				description:
					'Reframe every image of an Image or Carousel post to one shape on a platform, one entry per platform. A platform without an entry keeps its images as uploaded. Video posts and Instagram stories are refused.',
				options: [
					{
						displayName: 'Shape',
						name: 'shape',
						values: [
							{
								displayName: 'Platform',
								name: 'platform',
								type: 'options',
								options: [
									{
										name: 'Instagram',
										value: 'INSTAGRAM',
										description: 'Square, Portrait or Landscape',
									},
									{ name: 'TikTok', value: 'TIKTOK', description: 'Any of the four shapes' },
								],
								default: 'INSTAGRAM',
							},
							{
								displayName: 'Shape',
								name: 'aspectRatio',
								type: 'options',
								options: [
									{ name: 'Landscape (1.91:1)', value: 'LANDSCAPE' },
									{ name: 'Portrait (4:5)', value: 'PORTRAIT' },
									{ name: 'Square (1:1)', value: 'SQUARE' },
									{ name: 'Vertical (9:16)', value: 'VERTICAL', description: 'TikTok only' },
								],
								default: 'PORTRAIT',
							},
							{
								displayName: 'Fit',
								name: 'fit',
								type: 'options',
								options: [
									{
										name: 'Crop',
										value: 'CROP',
										description: 'Cut the shape from the center of the image',
									},
									{
										name: 'Pad',
										value: 'PAD',
										description: 'Keep the whole image and fill the rest with a blurred copy of it',
									},
								],
								default: 'CROP',
							},
						],
					},
				],
			},
			{
				displayName: 'Instagram AI Generated',
				name: 'instagramAiGenerated',
				type: 'boolean',
				default: false,
				description:
					'Whether to disclose that the post was made or edited with AI. Instagram shows its "AI info" label on the post. Works on images, carousels, reels and stories.',
			},
			{
				displayName: 'Instagram Audio',
				name: 'instagramAudio',
				type: 'fixedCollection',
				placeholder: 'Add Instagram Audio',
				default: {},
				description:
					'Music or an original sound added to the Reel on every selected Instagram account. Needs the Video content type, an Instagram Post Type other than Story, and accounts connected through Facebook. Find an Audio ID with Account > Search Instagram Audio.',
				options: [
					{
						displayName: 'Audio',
						name: 'audio',
						values: [
							{
								displayName: 'Artist',
								name: 'artist',
								type: 'string',
								default: '',
								description: 'Artist or creator, stored for display only',
							},
							{
								displayName: 'Audio ID',
								name: 'audioId',
								type: 'string',
								default: '',
								description: 'The audioId returned by Search Instagram Audio',
							},
							{
								displayName: 'Audio Volume',
								name: 'audioVolume',
								type: 'number',
								typeOptions: { minValue: 1, maxValue: 100 },
								default: 100,
								description: 'Volume of the added audio, from 1 to 100',
							},
							{
								displayName: 'Title',
								name: 'title',
								type: 'string',
								default: '',
								description: 'Track title, stored for display only',
							},
							{
								displayName: 'Video Volume',
								name: 'videoVolume',
								type: 'number',
								typeOptions: { minValue: 1, maxValue: 100 },
								default: 100,
								description: "Volume of the video's own sound, from 1 to 100",
							},
						],
					},
				],
			},
			{
				displayName: 'Instagram Collaborators',
				name: 'instagramCollaborators',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				placeholder: 'partnerbrand',
				description:
					'Instagram usernames to invite as collaborators, one per line, up to 3. A leading @ is dropped. Works on feed images, carousels and reels, not on a story or a trial reel. Each collaborator has to accept the invite in Instagram.',
			},
			{
				displayName: 'Instagram Post Type',
				name: 'instagramPostType',
				type: 'options',
				options: [
					{ name: 'Feed', value: 'FEED' },
					{ name: 'Reel', value: 'REEL' },
					{ name: 'Story', value: 'STORY' },
				],
				default: 'FEED',
			},
			{
				displayName: 'Instagram Share to Story',
				name: 'instagramShareToStory',
				type: 'boolean',
				default: false,
				description:
					'Whether to also publish the same media as a story on each selected Instagram account, next to the Feed or Reel post. The story is its own entry in the post platforms and succeeds, fails and retries on its own. It skips the caption, first comment, cover, collaborators, trial and audio, needs an image, video or carousel, and a video must be 60 seconds or shorter. Ignored when Instagram Post Type is Story.',
			},
			{
				displayName: 'Instagram Trial Reel',
				name: 'instagramTrialGraduation',
				type: 'options',
				options: [
					{ name: 'Instagram Shares It If It Performs Well', value: 'SS_PERFORMANCE' },
					{ name: 'No Trial', value: '' },
					{ name: 'You Share It From the Instagram App', value: 'MANUAL' },
				],
				default: '',
				description:
					"Publish the reel as a trial reel: Instagram shows it to non-followers first and keeps it off followers' feeds and the profile grid until it is shared. Only for a single video posted as a Reel or Feed video, never a Story, image or carousel. Needs a professional account that Instagram has enabled for trial reels.",
			},
			{
				displayName: 'LinkedIn Document Title',
				name: 'linkedinDocumentTitle',
				type: 'string',
				default: '',
				placeholder: 'Q3 product roadmap',
				description:
					'Title LinkedIn shows on a Document post, up to 100 characters. Defaults to the file name. Applied to every selected LinkedIn account; ignored for other content types.',
			},
			{
				displayName: 'Pinterest Board Name',
				name: 'pinterestBoardName',
				type: 'string',
				default: '',
				placeholder: 'Summer recipes',
				description:
					'Name of the board to pin to, useful when the name comes from an earlier node. AdaptlyPost looks it up among the boards of the Pinterest account when the post is created: an exact match wins, otherwise a single match that ignores case. A name that matches no board, or several, fails the item. With several Pinterest accounts, the name is used for the accounts that have a board with that name and the others pin to their AdaptlyPost board. Use Pinterest Board or Pinterest Board Name, not both.',
			},
			{
				displayName: 'Pinterest Board Name or ID',
				name: 'pinterestBoard',
				type: 'options',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getPinterestBoards',
					loadOptionsDependsOn: ['accountIds'],
				},
				description:
					'Board to pin to, listed from the Pinterest accounts selected in Accounts. Leave empty to pin to a board named AdaptlyPost, which is created on the Pinterest account the first time. With several Pinterest accounts, the board is used for the account that owns it and the others pin to their AdaptlyPost board. To pick a board by name, use Pinterest Board Name instead. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Pinterest Link',
				name: 'pinterestLink',
				type: 'string',
				default: '',
				description: 'Destination link for the pin',
			},
			{
				displayName: 'Save as Draft',
				name: 'saveAsDraft',
				type: 'boolean',
				default: false,
				description:
					'Whether to store the post without publishing or scheduling it. Turn this on when the credential is a Contributor key: it cannot publish or schedule, and AdaptlyPost refuses with 403 otherwise.',
			},
			{
				displayName: 'Scheduled At',
				name: 'scheduledAt',
				type: 'dateTime',
				default: '',
				description:
					'Leave empty to publish immediately. Scheduling and publishing both need an Editor or Admin key.',
			},
			{
				displayName: 'TikTok Privacy',
				name: 'tiktokPrivacyLevel',
				type: 'options',
				options: [
					{ name: 'Followers', value: 'FOLLOWER_OF_CREATOR' },
					{ name: 'Friends', value: 'MUTUAL_FOLLOW_FRIENDS' },
					{ name: 'Only Me', value: 'SELF_ONLY' },
					{ name: 'Public', value: 'PUBLIC_TO_EVERYONE' },
				],
				default: 'PUBLIC_TO_EVERYONE',
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'string',
				default: 'UTC',
				description: 'IANA name such as America/New_York, stored with the post for display',
			},
			{
				displayName: 'Video Thumbnails',
				name: 'platformThumbnails',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Video Thumbnail',
				default: {},
				description:
					'A thumbnail for one platform of a Video post, one entry per platform. Not for Facebook or Instagram stories.',
				options: [
					{
						displayName: 'Thumbnail',
						name: 'thumbnail',
						values: [
							{
								displayName: 'Platform',
								name: 'platform',
								type: 'options',
								options: [
									{ name: 'Facebook', value: 'FACEBOOK', description: 'Image only' },
									{ name: 'Instagram', value: 'INSTAGRAM', description: 'Image or video frame' },
									{ name: 'LinkedIn', value: 'LINKEDIN', description: 'Image only' },
									{ name: 'Pinterest', value: 'PINTEREST', description: 'Image or video frame' },
									{ name: 'TikTok', value: 'TIKTOK', description: 'Video frame only' },
									{ name: 'YouTube', value: 'YOUTUBE', description: 'Image only' },
								],
								default: 'YOUTUBE',
							},
							{
								displayName: 'Source',
								name: 'source',
								type: 'options',
								options: [
									{ name: 'Image', value: 'image' },
									{ name: 'Video Frame', value: 'frame' },
								],
								default: 'image',
							},
							{
								displayName: 'Image URL',
								name: 'thumbnailUrl',
								type: 'string',
								default: '',
								placeholder: 'https://example.com/cover.jpg',
								displayOptions: { show: { source: ['image'] } },
								description:
									'Public URL of a JPEG, PNG or WebP image, copied into AdaptlyPost storage before posting, or an image data URI',
							},
							{
								displayName: 'Frame (Ms)',
								name: 'thumbnailTimestampMs',
								type: 'number',
								typeOptions: { minValue: 0 },
								default: 0,
								displayOptions: { show: { source: ['frame'] } },
								description: 'The video frame to use, in milliseconds from the start',
							},
						],
					},
				],
			},
			{
				displayName: 'Wait for Result',
				name: 'waitForResult',
				type: 'boolean',
				default: false,
				description:
					'Whether to wait until the post has finished publishing and add its status and the result of each account to the output. AdaptlyPost queues a post and publishes it afterwards, so without this the node succeeds even when a platform rejects the post later. With it, the item fails with the platform error when any account fails. A draft or a scheduled post returns right away. Running the node again after a failure creates a second post, so leave Retry On Fail off.',
			},
			{
				displayName: 'Wait Timeout (Seconds)',
				name: 'waitTimeout',
				type: 'number',
				typeOptions: { minValue: 10, maxValue: 3600 },
				default: DEFAULT_WAIT_TIMEOUT_SECONDS,
				displayOptions: { show: { waitForResult: [true] } },
				description:
					'How long Wait for Result waits before the item fails. A long video can take a few minutes. The post keeps publishing after the timeout, and Get Results returns its outcome later.',
			},
			{
				displayName: 'X Keep Links Clickable',
				name: 'twitterKeepLinks',
				type: 'boolean',
				default: false,
				description:
					'Whether to keep links in the X text clickable. X charges over 10 times more for a post with a link, so AdaptlyPost breaks every link in X text by default (example.com becomes example. com). Only AppSumo lifetime deals can turn this on, and a kept link costs 20 credits instead of 2; on any other plan the post is refused with a 400.',
			},
			{
				displayName: 'YouTube Format',
				name: 'youtubePostType',
				type: 'options',
				options: [
					{ name: 'Shorts', value: 'SHORTS' },
					{ name: 'Video', value: 'VIDEO' },
				],
				default: 'VIDEO',
			},
			{
				displayName: 'YouTube Privacy',
				name: 'youtubePrivacyStatus',
				type: 'options',
				options: [
					{ name: 'Private', value: 'private' },
					{ name: 'Public', value: 'public' },
					{ name: 'Unlisted', value: 'unlisted' },
				],
				default: 'public',
			},
			{
				displayName: 'YouTube Video Title',
				name: 'youtubeTitle',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Repeat',
		name: 'recurrence',
		type: 'collection',
		placeholder: 'Add Repeat Option',
		default: {},
		displayOptions: { show: { resource: ['post'], operation: ['create'] } },
		description:
			'Repeat the post on a schedule. Needs a future Scheduled At, which becomes the first post and sets the time of day. Cannot be combined with Save as Draft or a TikTok account. X and LinkedIn reject identical text, so use spintax such as {Hi|Hello} to vary each post.',
		options: [
			{
				displayName: 'End Date',
				name: 'endsOn',
				type: 'dateTime',
				default: '',
				displayOptions: { show: { ends: ['onDate'] } },
				description:
					'Last day a post may go out on. Must be on or after the day of the first post.',
			},
			{
				displayName: 'Ends',
				name: 'ends',
				type: 'options',
				options: [
					{ name: 'After Number of Posts', value: 'afterCount' },
					{ name: 'Never', value: 'never' },
					{ name: 'On Date', value: 'onDate' },
				],
				default: 'never',
				description: 'Never repeats until the recurring post is paused or deleted',
			},
			{
				displayName: 'Frequency',
				name: 'frequency',
				type: 'options',
				options: [
					{ name: 'Daily', value: 'DAILY' },
					{ name: 'Monthly', value: 'MONTHLY' },
					{ name: 'Weekly', value: 'WEEKLY' },
					{
						name: 'Yearly',
						value: 'YEARLY',
						description:
							'Same date every year or every N years. A series started on February 29 posts on February 28 in other years.',
					},
				],
				default: 'WEEKLY',
				description: 'How often the post repeats. The post only repeats when this is set.',
			},
			{
				displayName: 'Number of Posts',
				name: 'maxOccurrences',
				type: 'number',
				typeOptions: { minValue: 2, maxValue: 365 },
				default: 10,
				displayOptions: { show: { ends: ['afterCount'] } },
				description: 'Total number of posts the series publishes, including the first one',
			},
			{
				displayName: 'Repeat Every',
				name: 'interval',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 30 },
				default: 1,
				description: 'Repeat every N days, weeks, months or years',
			},
			{
				displayName: 'Weekdays',
				name: 'weekdays',
				type: 'multiOptions',
				options: [
					{ name: 'Friday', value: 'FRIDAY' },
					{ name: 'Monday', value: 'MONDAY' },
					{ name: 'Saturday', value: 'SATURDAY' },
					{ name: 'Sunday', value: 'SUNDAY' },
					{ name: 'Thursday', value: 'THURSDAY' },
					{ name: 'Tuesday', value: 'TUESDAY' },
					{ name: 'Wednesday', value: 'WEDNESDAY' },
				],
				default: [],
				displayOptions: { show: { frequency: ['WEEKLY'] } },
				description:
					'Days of the week to post on. The weekday of Scheduled At is always included.',
			},
		],
	},
	{
		displayName: 'Scheduled At',
		name: 'scheduledAt',
		type: 'dateTime',
		default: '',
		displayOptions: { show: { resource: ['post'], operation: ['publishDraft'] } },
		description:
			'Leave empty to publish immediately. Scheduling and publishing both need an Editor or Admin key.',
	},
	{
		displayName: 'Timezone',
		name: 'timezone',
		type: 'string',
		default: 'UTC',
		displayOptions: { show: { resource: ['post'], operation: ['publishDraft'] } },
		description: 'IANA name such as America/New_York',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['post'], operation: ['getAll'] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: { show: { resource: ['post'], operation: ['getAll'], returnAll: [false] } },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['post'], operation: ['getAll'] } },
		options: [
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'dateTime',
				default: '',
				description: 'Upper bound on the scheduled time, or creation time for posts never scheduled',
			},
			{
				displayName: 'Platforms',
				name: 'platforms',
				type: 'multiOptions',
				options: [
					{ name: 'Bluesky', value: 'BLUESKY' },
					{ name: 'Facebook', value: 'FACEBOOK' },
					{ name: 'Google Business Profile', value: 'GOOGLE_BUSINESS' },
					{ name: 'Instagram', value: 'INSTAGRAM' },
					{ name: 'LinkedIn', value: 'LINKEDIN' },
					{ name: 'Mastodon', value: 'MASTODON' },
					{ name: 'Pinterest', value: 'PINTEREST' },
					{ name: 'Telegram', value: 'TELEGRAM' },
					{ name: 'Threads', value: 'THREADS' },
					{ name: 'TikTok', value: 'TIKTOK' },
					{ name: 'X (Twitter)', value: 'TWITTER' },
					{ name: 'YouTube', value: 'YOUTUBE' },
				],
				default: [],
				description: 'Only posts targeting any of these platforms',
			},
			{
				displayName: 'Sort Order',
				name: 'sortOrder',
				type: 'options',
				options: [
					{ name: 'Newest First', value: 'NEWEST' },
					{ name: 'Oldest First', value: 'OLDEST' },
				],
				default: 'NEWEST',
			},
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				description: 'Lower bound on the scheduled time, or creation time for posts never scheduled',
			},
			{
				displayName: 'Statuses',
				name: 'statuses',
				type: 'multiOptions',
				options: [
					{ name: 'Completed', value: 'COMPLETED' },
					{ name: 'Draft', value: 'DRAFT' },
					{ name: 'Failed', value: 'FAILED' },
					{ name: 'Partial Failure', value: 'PARTIAL_FAILURE' },
					{ name: 'Pending', value: 'PENDING' },
					{ name: 'Publishing', value: 'PUBLISHING' },
					{ name: 'Scheduled', value: 'SCHEDULED' },
				],
				default: [],
			},
		],
	},
];
