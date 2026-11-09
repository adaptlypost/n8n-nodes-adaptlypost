import type { INodeProperties } from 'n8n-workflow';

import { DEFAULT_WAIT_TIMEOUT_SECONDS } from './postResults';

const onlyPosts = { resource: ['post'] };
const postBodyFields = { resource: ['post'], operation: ['create', 'validate'] };
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
					'Re-queue publishing for the platforms that failed, all of them or the ones you list. Needs an Editor or Admin key.',
			},
			{
				name: 'Unschedule',
				value: 'unschedule',
				action: 'Unschedule a post',
				description: 'Turn a scheduled or dated draft post back into an undated draft',
			},
			{
				name: 'Validate',
				value: 'validate',
				action: 'Validate a post without creating it',
				description:
					'Dry run: check the same fields as Create without creating, scheduling or publishing anything, and return a report per account. Any key that can save drafts may run it.',
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
		displayOptions: { show: postBodyFields },
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
		displayOptions: { show: postBodyFields },
		description:
			'Document is LinkedIn only and takes exactly one PDF, PPT, PPTX, DOC or DOCX file in Media URLs. AdaptlyPost refuses a Document post on another platform, with two or more files, or with an image or video, and refuses a document file on any other content type. Google Business Profile takes Text or Image, with one JPEG or PNG image up to 5 MB. Telegram takes Text, Image, Video or Carousel, with up to 10 JPEG, PNG or WebP images (10 MB each) or one MP4 or MOV video up to 50 MB. Tumblr takes Text, Image, Video or Carousel, with up to 30 JPEG or PNG images (10 MB each) or one MP4 video up to 500 MB and 10 minutes; it refuses WebP. WordPress takes Text, Image, Video or Carousel, with up to 20 media items: images up to 20 MB and video up to 500 MB.',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		displayOptions: { show: postBodyFields },
		description:
			"Caption shared across the selected platforms. On LinkedIn, mention a company page with @[Page Name](urn:li:organization:12345), using the page's numeric ID and its name exactly as LinkedIn shows it, or paste the mention from Account > Look Up LinkedIn Company Page. Telegram takes up to 4096 characters, and a caption over 1024 characters goes out as its own message after the media. Tumblr takes up to 32768 characters. WordPress takes up to 100,000 characters and publishes them as the body of a blog post: blank lines start new paragraphs and bare links become clickable.",
	},
	{
		displayName: 'Media URLs',
		name: 'mediaUrls',
		type: 'string',
		default: '',
		placeholder: 'https://example.com/photo.jpg, https://example.com/clip.mp4',
		displayOptions: { show: postBodyFields },
		description:
			'Comma-separated public URLs of JPEG, PNG, WebP, GIF, MP4 or QuickTime files. GIF images post to Facebook, X, Bluesky, Mastodon, LinkedIn and Tumblr; other platforms refuse them. For a Document post, the URL of that one PDF, PPT, PPTX, DOC or DOCX file (max 100 MB, 300 pages). Each file is copied into AdaptlyPost storage before posting.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: postBodyFields },
		options: [
			{
				displayName: 'Facebook AI Generated',
				name: 'facebookAiGenerated',
				type: 'boolean',
				default: false,
				description:
					'Whether to disclose that the video was made or edited with AI. Facebook shows its "AI info" label on the post. Works on every Video post, whatever its Facebook Post Type, since Facebook publishes every video as a reel, and a video story carries the label too. Photos, carousels and text posts are refused.',
			},
			{
				displayName: 'Facebook Carousel Cards',
				name: 'facebookCarouselCards',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true, sortable: true },
				placeholder: 'Add Card',
				default: {},
				displayOptions: { show: { facebookImageLayout: ['CAROUSEL'] } },
				description:
					'One card per image, in the same order as Media URLs, up to 5. Facebook shows the card image and title only for links to a website the page owns; for other links the post fails with an explanation.',
				options: [
					{
						displayName: 'Card',
						name: 'card',
						values: [
							{
								displayName: 'Link',
								name: 'link',
								type: 'string',
								default: '',
								required: true,
								placeholder: 'https://example.com/product',
								description: 'The http or https URL the card opens, up to 2048 characters',
							},
							{
								displayName: 'Title',
								name: 'title',
								type: 'string',
								default: '',
								description: 'Up to 100 characters',
							},
							{
								displayName: 'Description',
								name: 'description',
								type: 'string',
								default: '',
								description: 'Up to 200 characters',
							},
						],
					},
				],
			},
			{
				displayName: 'Facebook Image Layout',
				name: 'facebookImageLayout',
				type: 'options',
				options: [
					{
						name: 'Grid',
						value: 'GRID',
						description: 'The images show as a photo grid',
					},
					{
						name: 'Carousel',
						value: 'CAROUSEL',
						description: 'Swipeable cards, each opening its own link',
					},
				],
				default: 'GRID',
				description:
					'A carousel needs 2 to 5 images, no videos, Facebook Post Type Feed, and one Facebook Carousel Card per image',
			},
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
				displayName: 'Facebook Video Title',
				name: 'facebookVideoTitle',
				type: 'string',
				default: '',
				description:
					'Title of a Facebook video, up to 255 characters. Applied to every selected Facebook page; a story made by Facebook Share to Story skips it.',
			},
			{
				displayName: 'First Comments',
				name: 'firstComments',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add First Comment',
				default: {},
				description:
					'A comment posted from the same account about 10 seconds after the post goes out (60 seconds on YouTube), one per platform. A comment that fails never fails the post: read firstCommentStatus and firstCommentError on the platform. A platform the post does not go to, a platform that also has Thread Replies, a private or made for kids YouTube video and a Facebook or Instagram story are refused.',
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
									{
										name: 'Facebook',
										value: 'FACEBOOK',
										description:
											'Up to 8000 characters. A Page connected before Facebook got first comments needs one reconnect.',
									},
									{
										name: 'Instagram',
										value: 'INSTAGRAM',
										description:
											'Up to 2200 characters. An account connected before Instagram got first comments needs one reconnect.',
									},
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
					'Alt text for each image, one line per image in the same order as Media URLs. Leave a line empty to skip an image. Sent to X, Bluesky, Mastodon, Tumblr, WordPress, LinkedIn, Facebook, Instagram and Threads; Pinterest uses the first line.',
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
				displayName: 'Instagram User Tags',
				name: 'instagramUserTags',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add User Tag',
				default: {},
				description:
					'Public Instagram accounts to tag, one entry per account, up to 20. Works on a single image or a single video, as a feed post, reel or story; a carousel or several stories with tags are refused. On a feed image every tag needs both X and Y. On a story X and Y are optional, but set both or neither. On a video X and Y are ignored and the account is tagged on the whole video. If Instagram refuses a tag because the account is private or does not exist, the post goes out without its tags and the refused usernames come back in instagramUntaggedUsernames. The story made by Instagram Share to Story carries no tags.',
				options: [
					{
						displayName: 'Tag',
						name: 'tag',
						values: [
							{
								displayName: 'Username',
								name: 'username',
								type: 'string',
								default: '',
								required: true,
								placeholder: 'partnerbrand',
								description: 'Public Instagram username, up to 30 characters. A leading @ is dropped.',
							},
							{
								displayName: 'X',
								name: 'x',
								type: 'string',
								default: '',
								placeholder: '0.5',
								description:
									'Horizontal position of the tag on the image, from 0 (left edge) to 1 (right edge)',
							},
							{
								displayName: 'Y',
								name: 'y',
								type: 'string',
								default: '',
								placeholder: '0.5',
								description:
									'Vertical position of the tag on the image, from 0 (top edge) to 1 (bottom edge)',
							},
						],
					},
				],
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
				displayName: 'LinkedIn Reshare Of',
				name: 'linkedinReshareOf',
				type: 'string',
				default: '',
				placeholder: 'urn:li:share:7123456789012345678',
				description:
					'Reshare this LinkedIn post from every selected LinkedIn account, with the text as the commentary. Takes a urn:li:share: or urn:li:ugcPost: URN, such as the platformPostId from Get Results, or a link of the form https://www.linkedin.com/feed/update/ followed by the URN. urn:li:activity: links are refused. Media is not attached on LinkedIn.',
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
				displayName: 'Pinterest Title',
				name: 'pinterestTitle',
				type: 'string',
				default: '',
				description:
					'Title of the pin, up to 100 characters. Applied to every selected Pinterest account.',
			},
			{
				displayName: 'Platform Media',
				name: 'platformMedia',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Platform Media',
				default: {},
				description:
					'Different media for one platform, one entry per platform, for when the post media does not fit it, such as a video too long for TikTok or a carousel with more images than X takes. A platform without an entry uses Media URLs. The entry must match Content Type: one video for Video, one image for Image, one document for Document, two or more items for Carousel, and none for Text. Each entry is checked against its own platform only. A platform with an entry does not use Video Thumbnail URL or Video Thumbnail Frame; give it one under Video Thumbnails.',
				options: [
					{
						displayName: 'Media',
						name: 'media',
						values: [
							{
								displayName: 'Platform',
								name: 'platform',
								type: 'options',
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
									{ name: 'Tumblr', value: 'TUMBLR' },
									{ name: 'WordPress', value: 'WORDPRESS' },
									{ name: 'X (Twitter)', value: 'TWITTER' },
									{ name: 'YouTube', value: 'YOUTUBE' },
								],
								default: 'TIKTOK',
							},
							{
								displayName: 'Media URLs',
								name: 'mediaUrls',
								type: 'string',
								typeOptions: { rows: 4 },
								default: '',
								placeholder: 'https://example.com/clip-short.mp4',
								description:
									'Public URLs of the files for this platform, one URL per line, in posting order. Same file types as Media URLs. Each file is copied into AdaptlyPost storage before posting.',
							},
							{
								displayName: 'Image Alt Texts',
								name: 'mediaAltTexts',
								type: 'string',
								typeOptions: { rows: 4 },
								default: '',
								placeholder: 'A red bicycle leaning on a brick wall',
								description:
									'Alt text for each file of this entry, one line per file in the same order as its Media URLs, up to 1000 characters each. Leave a line empty to skip a file.',
							},
						],
					},
				],
			},
			{
				displayName: 'Platform Texts',
				name: 'platformTexts',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Platform Text',
				default: {},
				description:
					'A different text for one platform, one entry per platform. A platform without an entry uses Text.',
				options: [
					{
						displayName: 'Platform Text',
						name: 'text',
						values: [
							{
								displayName: 'Platform',
								name: 'platform',
								type: 'options',
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
									{ name: 'Tumblr', value: 'TUMBLR' },
									{ name: 'WordPress', value: 'WORDPRESS' },
									{ name: 'X (Twitter)', value: 'TWITTER' },
									{ name: 'YouTube', value: 'YOUTUBE' },
								],
								default: 'TWITTER',
							},
							{
								displayName: 'Text',
								name: 'text',
								type: 'string',
								typeOptions: { rows: 3 },
								default: '',
							},
						],
					},
				],
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
					"Leave empty to publish immediately. With Save as Draft on, this is the draft's planned date: the post stays a draft, and Publish Draft schedules it for that date. Scheduling and publishing both need an Editor or Admin key.",
			},
			{
				displayName: 'Thread Replies',
				name: 'threadReplies',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Thread',
				default: {},
				description:
					'Turns the post into a thread, one entry per platform. The post opens the thread, and each reply goes out from the same account as a reply to the one before, up to 25 replies. Replies start about 10 seconds after the post goes out, 2 seconds apart. A thread that fails never fails the post: read threadStatus, threadReplyIds and threadError on the platform. A platform the post does not go to, or one that also has a First Comment, is refused.',
				options: [
					{
						displayName: 'Thread',
						name: 'thread',
						values: [
							{
								displayName: 'Platform',
								name: 'platform',
								type: 'options',
								options: [
									{ name: 'Bluesky', value: 'BLUESKY', description: 'Up to 300 characters per reply' },
									{
										name: 'Mastodon',
										value: 'MASTODON',
										description: "Up to 500 characters per reply, or the instance's own limit",
									},
									{ name: 'Threads', value: 'THREADS', description: 'Up to 500 characters per reply' },
									{
										name: 'X (Twitter)',
										value: 'TWITTER',
										description:
											'Up to 280 characters per reply, more on X Premium. Not retried if it fails, and a lifetime deal account pays for each reply like any X post.',
									},
								],
								default: 'TWITTER',
							},
							{
								displayName: 'Replies',
								name: 'replies',
								type: 'fixedCollection',
								typeOptions: { multipleValues: true, sortable: true },
								placeholder: 'Add Reply',
								default: {},
								description: 'The replies in the order they go out, up to 25',
								options: [
									{
										displayName: 'Reply',
										name: 'reply',
										values: [
											{
												displayName: 'Text',
												name: 'text',
												type: 'string',
												typeOptions: { rows: 2 },
												default: '',
												description: 'May be empty when the reply has images',
											},
											{
												displayName: 'Image URLs',
												name: 'imageUrls',
												type: 'string',
												typeOptions: { rows: 2 },
												default: '',
												placeholder: 'https://example.com/chart.png',
												description:
													'Public URLs of up to 4 JPEG, PNG, GIF or WebP images, one URL per line. Each image is copied into AdaptlyPost storage before posting. Videos are refused.',
											},
										],
									},
								],
							},
						],
					},
				],
			},
			{
				displayName: 'TikTok AI Generated',
				name: 'tiktokAiGenerated',
				type: 'boolean',
				default: false,
				description:
					'Whether to label the post as AI-generated content on TikTok',
			},
			{
				displayName: 'TikTok Allow Comments',
				name: 'tiktokAllowComments',
				type: 'boolean',
				default: false,
				description:
					'Whether viewers may comment. Left out, AdaptlyPost uses its default.',
			},
			{
				displayName: 'TikTok Allow Duet',
				name: 'tiktokAllowDuet',
				type: 'boolean',
				default: false,
				description:
					'Whether viewers may duet the video. Left out, AdaptlyPost uses its default.',
			},
			{
				displayName: 'TikTok Allow Stitch',
				name: 'tiktokAllowStitch',
				type: 'boolean',
				default: false,
				description:
					'Whether viewers may stitch the video. Left out, AdaptlyPost uses its default.',
			},
			{
				displayName: 'TikTok Auto Add Music',
				name: 'tiktokAutoAddMusic',
				type: 'boolean',
				default: false,
				description:
					'Whether TikTok adds music to a photo post',
			},
			{
				displayName: 'TikTok Branded Content',
				name: 'tiktokBrandedContent',
				type: 'boolean',
				default: false,
				description:
					'Whether the post promotes a third-party brand (paid partnership)',
			},
			{
				displayName: 'TikTok Branded Content Own Brand',
				name: 'tiktokBrandedContentOwnBrand',
				type: 'boolean',
				default: false,
				description:
					'Whether the post promotes your own brand or business',
			},
			{
				displayName: 'TikTok Caption',
				name: 'tiktokCaption',
				type: 'string',
				typeOptions: { rows: 2 },
				default: '',
				description:
					'Photo posts: the description, up to 4000 characters. Video posts: the caption, up to 2200 characters. Falls back to TikTok Title, then to Text.',
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
				displayName: 'TikTok Send as Draft',
				name: 'tiktokSendAsDraft',
				type: 'boolean',
				default: false,
				description:
					'Whether to send the post to the TikTok inbox as a draft for the creator to finish in the app, instead of publishing it',
			},
			{
				displayName: 'TikTok Title',
				name: 'tiktokTitle',
				type: 'string',
				default: '',
				description:
					'Photo posts: the title shown above the description, up to 90 characters. Video posts: used as the caption only when TikTok Caption is empty.',
			},
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'string',
				default: 'UTC',
				description: 'IANA name such as America/New_York, stored with the post for display',
			},
			{
				displayName: 'Tumblr Source URL',
				name: 'tumblrSourceUrl',
				type: 'string',
				default: '',
				placeholder: 'https://example.com/article',
				description:
					'Link Tumblr shows as the source of the post, up to 2048 characters. Applied to every selected Tumblr blog.',
			},
			{
				displayName: 'Tumblr Tags',
				name: 'tumblrTags',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				placeholder: 'photography',
				description:
					'Tags for the post, one tag per line, up to 30 tags of up to 140 characters each. A tag can contain spaces but not a comma, and a line with a comma stops the item. A leading # is dropped, and a tag repeated with different capitalization is kept once. Applied to every selected Tumblr blog.',
			},
			{
				displayName: 'Tumblr Title',
				name: 'tumblrTitle',
				type: 'string',
				default: '',
				placeholder: 'Our spring collection',
				description:
					'Heading shown above the media and the text, up to 4096 characters. Applied to every selected Tumblr blog.',
			},
			{
				displayName: 'Video Thumbnail Frame (Ms)',
				name: 'thumbnailTimestampMs',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
				description:
					'Video frame, in milliseconds from the start, to use as the thumbnail on every platform that takes one. A Video Thumbnail URL wins everywhere except TikTok, and Video Thumbnails override both.',
			},
			{
				displayName: 'Video Thumbnail URL',
				name: 'thumbnailUrl',
				type: 'string',
				default: '',
				placeholder: 'https://example.com/cover.jpg',
				description:
					'Public URL of a JPEG, PNG or WebP image, or an image data URI, used as the thumbnail of a video on every platform that takes one. Video Thumbnails override it for one platform. The image is copied into AdaptlyPost storage before posting.',
			},
			{
				displayName: 'Video Thumbnails',
				name: 'platformThumbnails',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Video Thumbnail',
				default: {},
				description:
					'A thumbnail for one platform of a Video post, one entry per platform. Not for Facebook or Instagram stories. TikTok takes only a video frame.',
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
									{ name: 'Facebook', value: 'FACEBOOK', description: 'Image or video frame' },
									{ name: 'Instagram', value: 'INSTAGRAM', description: 'Image or video frame' },
									{ name: 'LinkedIn', value: 'LINKEDIN', description: 'Image or video frame' },
									{ name: 'Pinterest', value: 'PINTEREST', description: 'Image or video frame' },
									{ name: 'Telegram', value: 'TELEGRAM', description: 'Image or video frame' },
									{ name: 'TikTok', value: 'TIKTOK', description: 'Video frame only' },
									{ name: 'YouTube', value: 'YOUTUBE', description: 'Image or video frame' },
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
				displayOptions: { show: { '/operation': ['create'] } },
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
				displayName: 'WordPress Category Names or IDs',
				name: 'wordpressCategories',
				type: 'multiOptions',
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getWordPressCategories',
					loadOptionsDependsOn: ['accountIds'],
				},
				description:
					'Categories to file the post under, up to 50, listed from the WordPress sites selected in Accounts. A category picked from the list goes only to the site it belongs to. Leave empty to use the site\'s default category. A plain category ID in an expression goes to every selected WordPress site. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'WordPress Excerpt',
				name: 'wordpressExcerpt',
				type: 'string',
				typeOptions: { rows: 2 },
				default: '',
				description:
					'Summary WordPress shows in post lists and feeds, up to 1000 characters. Applied to every selected WordPress site.',
			},
			{
				displayName: 'WordPress Tags',
				name: 'wordpressTags',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				placeholder: 'product updates',
				description:
					'Tag names, one tag per line, up to 50 tags of up to 100 characters each. A tag the site does not have yet is created when the WordPress user may manage tags, and skipped otherwise. Applied to every selected WordPress site.',
			},
			{
				displayName: 'WordPress Title',
				name: 'wordpressTitle',
				type: 'string',
				default: '',
				placeholder: 'What we shipped this week',
				description:
					'Post title, up to 300 characters. Leave empty to use the first line of the text, cut to 100 characters. Applied to every selected WordPress site.',
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
				displayName: 'X Quote Of',
				name: 'twitterQuoteOf',
				type: 'string',
				default: '',
				placeholder: 'https://x.com/acme/status/1234567890',
				description:
					'Quote one of the account\'s own X posts, with the text as the commentary. Takes a link such as https://x.com/handle/status/123 or the numeric post ID. X only lets an account quote posts it wrote or posts that mention it. Media is not attached on X. Applied to every selected X account.',
			},
			{
				displayName: 'YouTube AI Generated',
				name: 'youtubeAiGenerated',
				type: 'boolean',
				default: false,
				description:
					'Whether to disclose altered or synthetic content, such as an AI voice, an AI avatar or realistic footage that was generated or edited. YouTube shows its "Altered or synthetic content" label on the video. Works on videos and Shorts.',
			},
			{
				displayName: 'YouTube Allow Embedding',
				name: 'youtubeAllowEmbedding',
				type: 'boolean',
				default: false,
				description:
					'Whether other sites may embed the video',
			},
			{
				displayName: 'YouTube Audio Language',
				name: 'youtubeAudioLanguage',
				type: 'string',
				default: '',
				placeholder: 'pt-BR',
				description:
					'Language spoken in the video\'s original audio, as a BCP-47 tag such as en, pt-BR or es-419, so YouTube does not treat it as another language. Does not turn off automatic dubbing.',
			},
			{
				displayName: 'YouTube Category ID',
				name: 'youtubeCategoryId',
				type: 'string',
				default: '',
				placeholder: '22',
				description:
					'YouTube video category ID, such as 22 for People & Blogs',
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
				displayName: 'YouTube License',
				name: 'youtubeLicense',
				type: 'options',
				options: [
					{ name: 'Creative Commons', value: 'creativeCommon' },
					{ name: 'Standard YouTube License', value: 'youtube' },
				],
				default: 'youtube',
			},
			{
				displayName: 'YouTube Made for Kids',
				name: 'youtubeMadeForKids',
				type: 'boolean',
				default: false,
				description:
					'Whether the video is made for kids. A made for kids video takes no first comment.',
			},
			{
				displayName: 'YouTube Notify Subscribers',
				name: 'youtubeNotifySubscribers',
				type: 'boolean',
				default: false,
				description:
					'Whether YouTube notifies the channel subscribers about the video',
			},
			{
				displayName: 'YouTube Playlist ID',
				name: 'youtubePlaylistId',
				type: 'string',
				default: '',
				description:
					'ID of a playlist of the channel to add the video to',
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
				displayName: 'YouTube Schedule on YouTube',
				name: 'youtubeScheduleOnYouTube',
				type: 'boolean',
				default: false,
				description:
					'Whether to upload the video as soon as the post is scheduled, as a private video that YouTube publishes itself at Scheduled At. This leaves time to set up Test & Compare in YouTube Studio before the video goes public. Needs Public privacy and is refused on a repeating post. Less than 15 minutes ahead, the video uploads at Scheduled At as usual. While the video waits on YouTube, the post cannot be updated or unscheduled, and deleting it also deletes the video from YouTube. Read youtubeScheduleOnYouTube and youtubeScheduledVideoId on the platform.',
			},
			{
				displayName: 'YouTube Tags',
				name: 'youtubeTags',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description:
					'Video tags, one tag per line, up to 20',
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
		displayOptions: { show: postBodyFields },
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
		displayName: 'Platforms to Retry',
		name: 'retryPlatformIds',
		type: 'string',
		typeOptions: { rows: 2 },
		default: '',
		placeholder: 'BLUESKY',
		displayOptions: { show: { resource: ['post'], operation: ['retry'] } },
		description:
			'One per line: a platform name such as BLUESKY to retry every failed entry of that platform, or a platform entry ID from Get Results. Leave empty to retry every failed entry.',
	},
	{
		displayName: 'Publish Now',
		name: 'publishNow',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['post'], operation: ['publishDraft'] } },
		description:
			'Whether to publish immediately, even when the draft has a planned date. Needs an Editor or Admin key.',
	},
	{
		displayName: 'Scheduled At',
		name: 'scheduledAt',
		type: 'dateTime',
		default: '',
		displayOptions: {
			show: { resource: ['post'], operation: ['publishDraft'] },
			hide: { publishNow: [true] },
		},
		description:
			"Leave empty to use the draft's planned date: a draft with a future planned date is scheduled for it, and any other draft publishes immediately. A past time publishes immediately. Scheduling and publishing both need an Editor or Admin key.",
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
					{ name: 'Tumblr', value: 'TUMBLR' },
					{ name: 'WordPress', value: 'WORDPRESS' },
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
