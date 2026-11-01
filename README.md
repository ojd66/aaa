# Chat SDK Form Bot Template

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vercel-labs/chat-sdk-form-bot&env=SLACK_BOT_TOKEN,SLACK_SIGNING_SECRET,SLACK_CHANNEL_ID,REDIS_URL,RESEND_API_KEY,RESEND_FROM_ADDRESS,FORWARD_EMAIL)

A Slack bot that triages form submissions. When a form is submitted via HTTP, the bot posts an interactive card to Slack where reviewers can either forward the submission via email or mark it as spam.

Built with [Chat SDK](https://github.com/vercel/chat), [Hono](https://hono.dev), [Resend](https://resend.com), and Redis.

## How It Works

1. An external service sends a `POST /api/form` request with arbitrary JSON form data
2. The bot stores the submission in Redis (7-day TTL) and posts an interactive card to a Slack channel
3. A reviewer clicks one of three buttons:
   - **Forward Submission** — sends a styled HTML email via Resend to a configured recipient (and optionally POSTs to a webhook endpoint), then updates the card to show who forwarded it
   - **Edit & Forward** — opens a modal with pre-filled form fields for editing before forwarding
   - **Mark as Spam** — updates the card to show who marked it, deletes the submission from Redis

## Setup

### Prerequisites

- [Node.js](https://nodejs.org) (v20+)
- [pnpm](https://pnpm.io)
- [Slack app](https://api.slack.com/apps)
- [Redis](https://redis.io)
- [Resend](https://resend.com)

### Install Dependencies

```sh
pnpm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```sh
# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_CHANNEL_ID=C...          # Channel where submission cards are posted

# Redis
REDIS_URL=redis://localhost:6379

# Resend
RESEND_API_KEY=re_...
RESEND_FROM_ADDRESS=bot@yourdomain.com  # Must be a verified Resend domain
RESEND_FROM_NAME=Formbot                # Optional, defaults to "Formbot"

# Forwarding
FORWARD_EMAIL=team@yourdomain.com       # Where approved submissions are sent
FORWARD_ENDPOINT=                       # Optional: webhook URL to POST submissions to
```

### Slack App Configuration

The quickest way to get started is to create your app from the included manifest:

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click **Create New App** → **From a manifest**
2. Select your workspace, paste the contents of [`slack-manifest.json`](./slack-manifest.json), and create the app
3. Replace `https://example.com` in **Interactivity & Shortcuts** with your actual domain (or ngrok URL during development)
4. Install the app to your workspace
5. Copy the **Bot User OAuth Token** from **OAuth & Permissions** and the **Signing Secret** from **Basic Information** into your `.env.local`

<details>
<summary>Manual setup (without manifest)</summary>

1. Create a new Slack app at [api.slack.com/apps](https://api.slack.com/apps)
2. Under **OAuth & Permissions**, add the bot token scopes: `chat:write`, `channels:history`, `channels:read`, `groups:history`, `groups:read`, `im:history`, `im:read`, `mpim:history`, `mpim:read`, `users:read`
3. Enable **Interactivity & Shortcuts** and set the request URL to `https://<your-domain>/api/webhooks/slack`
4. Install the app to your workspace and copy the **Bot User OAuth Token**
5. Copy the **Signing Secret** from **Basic Information**

</details>

## Development

```sh
pnpm dev
```

Starts a local server at `http://localhost:3000` with hot reload via `tsx watch`.

### Exposing your local server

Slack needs a public URL to deliver webhook events. Use [ngrok](https://ngrok.com) to tunnel traffic to your local server:

```sh
ngrok http 3000
```

Copy the generated URL (e.g. `https://abc123.ngrok-free.dev`) and set it as the request URL in your Slack app:

- **Interactivity & Shortcuts** → `https://<ngrok-url>/api/webhooks/slack`
- **Event Subscriptions** → `https://<ngrok-url>/api/webhooks/slack`

### Testing a submission

```sh
curl -X POST https://<ngrok-url>/api/form \
  -H "Content-Type: application/json" \
  -d '{"Name": "Jane Doe", "Email": "jane@example.com", "Message": "Hello!"}'
```

## API

### `POST /api/form`

Accepts a JSON body with arbitrary key-value pairs. CORS is enabled, so this endpoint can be called directly from browser-based forms on any origin. Returns:

```json
{ "status": "received", "submissionId": "<uuid>" }
```

### `POST /api/webhooks/slack`

Receives Slack interaction payloads (button clicks). This is set as the request URL in your Slack app configuration.

## Deployment

The app exports a standard [Hono](https://hono.dev) `fetch` handler, so it can be deployed to any fetch-compatible runtime.

The `src/lib/local.ts` entrypoint is only used for local development via `@hono/node-server`.

## Scripts

| Command           | Description                      |
| ----------------- | -------------------------------- |
| `pnpm dev`        | Start dev server with hot reload |
| `pnpm build`      | Compile TypeScript to `dist/`    |
| `pnpm test`       | Run tests with coverage          |
| `pnpm type-check` | Type-check without emitting      |
| `pnpm check`      | Lint and format check            |
| `pnpm fix`        | Auto-fix lint and format issues  |
| `pnpm validate`   | Run check, type-check, and tests |

## Project Structure

```
src/
  index.ts            Hono app with HTTP routes
  bot.ts              Chat SDK bot instance and action handlers
  lib/
    cards.ts          Chat SDK card and modal builders
    email.ts          Resend email forwarding
    endpoint.ts       Optional webhook endpoint forwarding
    submissions.ts    Redis CRUD for form submissions
    local.ts          Local dev server entrypoint
tests/
  *.test.ts           Unit tests (vitest)
```

## Adding Other Platforms

Chat SDK supports multiple platforms. You can extend this bot to post submission cards to Microsoft Teams, Google Chat, Discord, or Telegram by registering additional adapters:

```typescript
// src/bot.ts
import { createTeamsAdapter } from "@chat-adapter/teams";
import { createGoogleChatAdapter } from "@chat-adapter/gchat";

export const bot = new Chat({
  adapters: {
    slack: createSlackAdapter(),
    teams: createTeamsAdapter(),
    gchat: createGoogleChatAdapter(),
  },
  state,
  userName: "form-bot",
});
```

Then add a webhook route for each platform in `src/index.ts` — the existing `/:platform` route pattern already supports this.

Cards, fields, and buttons render natively on each platform (Block Kit on Slack, Adaptive Cards on Teams, Google Chat Cards, etc.). Note that **modals are currently Slack-only**, so the "Edit & Forward" button will only work on Slack.

See the [Chat SDK adapter docs](https://chat-sdk.dev/adapters) for the full list of supported platforms and their feature matrices.

## License

Apache-2.0
