@AGENTS.md

# uparima-support — architecture & conventions

Support Portal for the Uparima backend (`uparima-backend`). Next.js (App Router) + TypeScript (strict) + Tailwind 4 +
shadcn/ui. Same backend and admin auth as the classified dashboard; support accounts sign in **without** the 2FA
code step (see "Admin login 2FA" in the root CLAUDE.md). Import alias: `@/*` → project root.

## Folder structure

```
app/                     Routes only (App Router). Thin: compose components, no fetch/business logic.
  (auth)/login/          Public routes
  (support)/             Authenticated routes; layout.tsx holds the AuthGuard + shell
    <feature>/page.tsx
components/
  ui/                    shadcn/ui primitives (generated — see below). Don't put app logic here.
  shell/                 Sidebar, topbar, page header
  <feature>/             Feature components (tickets/, riders/, drivers/ ...)
lib/
  api.ts                 The single HTTP client (base URL, auth header, refresh, error normalising)
  services/              One file per backend resource: <name>.service.ts
  hooks/                 use-<thing>.ts (data hooks wrapping services, UI hooks)
  auth.tsx               Auth context/provider
  utils.ts               `cn()` and small pure helpers
  constants.ts           Routes, enums, config
types/                   Shared TS types/DTOs, one file per domain (ticket.ts, rider.ts ...)
```

Rules:
- Pages in `app/` stay thin and are Server Components by default; add `"use client"` only to the leaf that needs
  state/effects/browser APIs.
- Feature components live in `components/<feature>/`; shared ones are promoted to `components/`. No cross-feature
  imports between feature folders.
- Types for API payloads live in `types/`, never inline in components.
- Config comes from env: `NEXT_PUBLIC_API_BASE_URL` in `.env.local` (keep a committed `.env.example`). Never hardcode
  URLs, keys or tokens.

## API calls — `name.service.ts` naming (required)

**Every backend call goes through a service file in `lib/services/` named `<resource>.service.ts`** — e.g.
`tickets.service.ts`, `riders.service.ts`, `drivers.service.ts`, `rides.service.ts`, `auth.service.ts`.

- Components, pages and hooks **never** call `fetch`/axios directly and never build URLs — they call a service function.
- Services use the shared client in `lib/api.ts` (auth header, token refresh, `TWO_FACTOR_REQUIRED`/401 →
  "sign in again", error normalising). Do not create a second HTTP client.
- One service per backend resource; export plain, typed async functions (or one object) with verb-first names:
  `listTickets`, `getTicket`, `replyToTicket`, `closeTicket`. Typed params in, typed DTO out (from `types/`).
- Backend paths are written once, inside the service (e.g. `/rides/admin/...`). Keep them relative to the API base.
- Wrap services in hooks (`lib/hooks/use-tickets.ts`) for loading/error/cache state; don't duplicate request logic
  in components.

```ts
// lib/services/tickets.service.ts
import { apiGet } from "@/lib/api";
import type { Ticket, TicketListParams } from "@/types/ticket";

// apiGet/apiPost/apiPatch/apiPut/apiDelete unwrap the backend's { success, data } envelope.
export const listTickets = (params: TicketListParams) =>
  apiGet<Ticket[]>("/support/tickets", { params });
export const getTicket = (id: string) => apiGet<Ticket>(`/support/tickets/${id}`);
```

## UI — shadcn/ui

- Use shadcn/ui for all primitives (Button, Input, Dialog, Table, Select, Sheet, Toast/Sonner, ...). Don't hand-roll
  or install another component library.
- Init once: `npx shadcn@latest init` (Tailwind 4 / CSS variables / `components/ui`, `lib/utils.ts`); add components
  with `npx shadcn@latest add <name>`. Components are copied into `components/ui/` and may be edited, but keep them
  generic — product-specific variants go in feature components that wrap them.
- Style with Tailwind utilities and the theme CSS variables in `app/globals.css` (no hardcoded hex colours); merge
  classes with `cn()` from `lib/utils.ts`. Support light/dark via the variables.
- Forms: `react-hook-form` + `zod` schemas (shadcn `Form`). Icons: `lucide-react`.
- Accessibility: keep Radix/shadcn semantics (labels, focus states, keyboard nav); use real `button`/`a` elements.

## Code quality

- TypeScript strict; no `any` (use `unknown` + narrowing). Validate untrusted/external data at the service boundary.
- Handle loading, empty and error states on every data view.
- Run `npm run lint` and `npm run build` before finishing a change.
- Read `node_modules/next/dist/docs/` before using Next APIs (see AGENTS.md) — this Next version differs from older docs.
