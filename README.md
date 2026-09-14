# n8n-nodes-adaptlypost

n8n community node for [AdaptlyPost](https://adaptlypost.com). Publish and schedule posts to Instagram, TikTok, YouTube, X, Facebook, LinkedIn, Pinterest, Threads and Bluesky from a workflow, and start workflows when a post publishes or fails.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation. The package name is `n8n-nodes-adaptlypost`.

## Nodes

### AdaptlyPost

| Resource | Operations |
| --- | --- |
| Post | Create, Get, Get Many, Get Results, Publish Draft, Retry Failed Platforms, Delete |
| Account | Get Many |
| Analytics | Get Overview, Get Timeseries, Get Platform Breakdown, Get Post Analytics |

Create takes the accounts to post from (a multi-select loaded from your workspace), the text, and media URLs. Media is copied from the URL you give into AdaptlyPost storage before the post is created, so any public JPEG, PNG, WebP, MP4 or QuickTime link works. TikTok privacy, Pinterest board, Instagram and Facebook post type, and YouTube title and privacy live under Additional Fields.

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

## Compatibility

Tested with n8n 1.100 and later.

## Resources

- [AdaptlyPost API reference](https://adaptlypost.com/docs/api-introduction)
- [AdaptlyPost webhooks](https://adaptlypost.com/docs/webhooks)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
