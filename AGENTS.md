# Chat SDK Form Bot

A Slack bot template that triages form submissions. External services POST JSON to `/api/form`, the bot posts an interactive card to Slack, and reviewers can forward via email or mark as spam.

## Stack

- **Chat SDK** (`chat` + `@chat-adapter/slack` + `@chat-adapter/state-redis`) — Slack bot framework
- **Hono** — HTTP server and routing
- **Resend** — Email forwarding
- **Redis** — Submission storage (7-day TTL)
- **Vitest** — Testing
- **Ultracite** — Linting and formatting

## Project Structure

```
src/
  index.ts            Hono app with HTTP routes (POST /api/form, POST /api/webhooks/slack)
  bot.ts              Chat SDK bot instance and action handlers
  lib/
    cards.ts          Card and modal builders (Chat SDK JSX components)
    email.ts          Resend email forwarding
    endpoint.ts       Optional webhook endpoint forwarding
    submissions.ts    Redis CRUD for form submissions
    local.ts          Local dev server entrypoint (@hono/node-server)
tests/
  *.test.ts           Unit tests
```

## Commands

```sh
pnpm dev              # Start dev server (tsx watch, port 3000)
pnpm build            # Compile TypeScript to dist/
pnpm test             # Run tests with coverage
pnpm type-check       # Type-check without emitting
pnpm check            # Lint and format check (ultracite)
pnpm fix              # Auto-fix lint and format issues
pnpm validate         # Run check + type-check + test
```

## Skills

Use these skills when working on this project:

- **chat-sdk** — Chat SDK API, event handlers, cards, modals, streaming, and adapters
- **slack-agent** — Slack-specific development patterns, testing, and deployment
- **hono** — Hono routing, middleware, validation, and Vercel deployment

## Key Patterns

- The Hono app (`src/index.ts`) exports a default `fetch` handler for Vercel deployment. `src/lib/local.ts` wraps it with `@hono/node-server` for local dev only.
- Chat SDK card components use function calls (`Card()`, `Button()`, etc.), not JSX — the tsconfig does not set `jsxImportSource`.
- The bot uses `bot.onAction()` and `bot.onModalSubmit()` for interactivity, not event subscriptions.
- Slack webhook route is at `/api/webhooks/slack` via `bot.webhooks.slack`.
