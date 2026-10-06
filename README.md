# Uparima Support (staff inbox)

The support team's dashboard for `uparima-backend`: tickets from the rider and driver apps, calls logged by
agents, and drivers who asked the WhatsApp bot for a person.

## Run

```bash
cp .env.example .env.local     # set NEXT_PUBLIC_API_BASE_URL (and NEXT_PUBLIC_ASSET_BASE_URL for attachments)
npm install
npm run dev                    # http://localhost:3000
npm run lint && npm run build  # before finishing a change
npm test                       # unit tests for the mappers and filters
```

Sign in with a `support` account (or an admin account that does not need the emailed 2FA code; that step
is not supported here yet). What an agent can do follows the permissions from `GET /support-desk/me`.

## What it does

- **Inbox:** tickets with status, priority, assignee, SLA time and the ticket thread; replies with attachments.
- **Needs contact:** the queue of drivers who asked the WhatsApp bot to be called or messaged, most overdue first.
  A live alert (`support:handoff`) refreshes it, shows a toast and a tab-title badge.
- **Mark contacted:** clears a driver from the queue once an agent has reached them.
- **Details panel:** who wrote in, the linked ride, topic, language, preferred contact method, assignee, priority.

## Known limits (backend)

- Replies to a WhatsApp ticket are saved on the ticket but **not delivered to the driver's WhatsApp**. The
  inbox shows call and WhatsApp links so the agent can reach the driver directly.
- Customers' new replies are not pushed to staff, so open lists and threads refresh on a timer while the tab is visible.
- No endpoints yet for internal notes, unread counts, tags, presence or server-side search (search covers the
  loaded pages only).

## Structure

`app/` routes only; `components/inbox/` the inbox UI; `lib/services/*.service.ts` every backend call;
`lib/hooks/` data and mutation hooks (TanStack Query); `lib/inbox/` pure mappers and filters;
`lib/realtime/` the socket alerts; `types/` backend DTOs. See `CLAUDE.md` for the conventions.
