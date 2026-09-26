import type { INodeProperties } from 'n8n-workflow';

const onlyRecurringPosts = { resource: ['recurringPost'] };
const withRecurringPostId = {
	resource: ['recurringPost'],
	operation: ['delete', 'get', 'pause', 'resume'],
};

export const recurringPostProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: onlyRecurringPosts },
		options: [
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a recurring post',
				description:
					'Stop the series and delete its upcoming scheduled post. Posts that already went out are kept.',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a recurring post',
				description: 'Get one recurring post with its schedule and next occurrence',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many recurring posts',
				description: 'List recurring posts created with Repeat on Create post',
			},
			{
				name: 'Pause',
				value: 'pause',
				action: 'Pause a recurring post',
				description: 'Stop creating posts and delete the upcoming scheduled post',
			},
			{
				name: 'Resume',
				value: 'resume',
				action: 'Resume a recurring post',
				description:
					'Continue from the next occurrence after now. Occurrences missed while paused are not published.',
			},
		],
		default: 'getAll',
	},
	{
		displayName: 'Recurring Post ID',
		name: 'recurringPostId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: withRecurringPostId },
		description:
			'The recurringPostId returned when the post was created, or the ID from Get Many',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['recurringPost'], operation: ['getAll'] } },
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: {
			show: { resource: ['recurringPost'], operation: ['getAll'], returnAll: [false] },
		},
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['recurringPost'], operation: ['getAll'] } },
		options: [
			{
				displayName: 'Statuses',
				name: 'statuses',
				type: 'multiOptions',
				options: [
					{ name: 'Active', value: 'ACTIVE' },
					{ name: 'Ended', value: 'ENDED' },
					{ name: 'Paused', value: 'PAUSED' },
				],
				default: [],
			},
		],
	},
];
