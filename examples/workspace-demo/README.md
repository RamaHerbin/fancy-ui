# Workspace demo

A small account-settings app built only with `fancy-ui-svelte`: profile, settings, API keys and notifications. It is a consumer of the package, not part of the docs site: it imports `fancy-ui-svelte` and `fancy-ui-svelte/tailwind.css` (any other subpath must be one the package's `exports` map declares, such as `cameleon`), never the library's source, `_internals` or the docs site's components. `src/imports.test.ts` fails on anything else.

Started from `develop` at `17b783152cc3de03a5bb3fd852c3cb4961a2b0e1`, with the screens (`86eeebe4`) and the toast close reasons, progress bar and recipes (`eab29366`) merged on top.

**Status: composed.** Every route renders its screen, each screen has its loading, empty, error and ready states, Profile and Settings save through the save-and-publish pattern, and API keys and Notifications undo through one shared undo pattern. The journeys below are what `tests/e2e/workspace-demo.spec.ts` walks through.

## Running it

The package resolves to its built output (`dist/`), so build the library first:

```bash
pnpm install
pnpm package                                  # builds fancy-ui-svelte into dist/
pnpm -C examples/workspace-demo dev           # http://localhost:5295
pnpm -C examples/workspace-demo check         # svelte-check
pnpm -C examples/workspace-demo test          # unit tests (data layer, screens, undo, routes, import boundary)
pnpm -C examples/workspace-demo build         # static site in examples/workspace-demo/build
pnpm exec playwright test -c examples/workspace-demo/playwright.config.ts   # browser spec, on the preview at 5295
```

Dev and preview both use port 5295 with `--strictPort`: if the port is taken the command fails instead of moving to another one the browser spec would not find.

Every route is prerendered (`src/routes/+layout.ts`), so `build/` is plain HTML, CSS and JS that any static host can serve. `/` is a redirect page to `/profile`.

## Screen map

| Route            | Screen        | Content                                                                                              |
| ---------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| `/profile`       | Profile       | Identity (avatar, name, handle, role) and About (bio, location, time zone); edit and save            |
| `/settings`      | Settings      | General, Notifications, Privacy, Security as disclosure sections; save with a pending and done state |
| `/api-keys`      | API keys      | Key list (name, scopes, created, last used); create (secret shown once), revoke with undo            |
| `/notifications` | Notifications | Inbox newest first, unread marked; mark one or all read, grouped undo                                |

The shell around them:

- **From 768 px**: a sticky navigation rail on the left (grouped Account / Developers, current screen marked with `aria-current="page"`) and a top bar with the theme toggle.
- **Below 768 px**: the rail is hidden; the top bar holds a menu button that opens the same navigation in a sheet from the left. Following a link closes the sheet and focus returns to the menu button. Nothing scrolls sideways at 360 px.
- **Theme**: the toggle puts `dark` or `light` on `<html>` and remembers it in `localStorage`; an inline script in `app.html` applies it before the first paint. With nothing stored, the system preference decides.
- A skip link, one `main` landmark per page, a document title per screen (`Profile · Workspace demo`), and a toaster mounted once in the layout.

## Journeys

Each one is a URL; the switches are described below.

1. **First launch**: `/profile?scenario=empty`. A profile with only a name and email, no keys, no notifications. Each screen shows its empty state with the one action that fills it ("Add details" opens the form and puts focus in it).
2. **Loading**: every call waits a seeded delay; screens show skeletons shaped like their content and mark themselves `aria-busy`. `?latency=slow` makes it obvious.
3. **Error and retry**: `?fail=once` fails the first call of each operation, so the error state appears (an alert) and "Try again" succeeds. `?fail=always` keeps the error state.
4. **Save and publish** (Profile, Settings): `/settings?fail=once&latency=fast`. Press "Try again", change a field, save. The save button carries the request: a ring while it runs, a check only once the service has answered, a cross when it has not. The first save fails here, so a toast says so, keeps the edits on screen and offers Retry; Retry saves, and the check appears. A field the service refuses (an empty name) is not a failed save: the message sits under the field and there is no Retry.
5. **Undo** (API keys, Notifications): `/api-keys`. Revoke a key: the row leaves at once and a toast counts down six seconds with a draining bar. Nothing is sent yet. Undo puts the row back (and focus on it). Pointer or focus on the toast pauses the countdown, and leaving resumes it with the time it had left. When the toast closes for any other reason (it runs out, it is dismissed, newer toasts push it out of the stack, or you leave the screen) the revoke is sent. Two quick revokes are two independent undos. On `/notifications`, "Mark all as read" and "Clear read" are grouped: the whole batch changes at once, with one toast to undo it. A notification marked unread again during the window keeps that choice, and only notifications still read when "Clear read" closes are archived: undoing "Mark all as read" after clearing brings the formerly unread ones back on screen and keeps them.
6. **Keyboard**: the skip link moves focus to the main content; the Settings sections are a disclosure group (Arrow keys between headers, Enter or Space to open); switches toggle with Space; a revoked row hands focus to its neighbour; after "Mark all as read" or "Clear read" focus moves to the list, never to the other bulk action; Save stays focusable when there is nothing left to save (marked unavailable, not removed from the tab order), so focus stays on it after a save; Tab reaches the undo toast, which holds the countdown while it has focus.
7. **Reduced motion**: the undo bar stays full and still, sections open without a height transition, toasts appear without sliding.
8. **Mobile**: the same journeys at 360 px, navigation through the sheet, toasts inside the viewport, nothing scrolling sideways in any state.
9. **Light and dark**: the theme toggle in the top bar, or the system preference.

## Simulation switches

Read from the query string when the app starts in the browser (`parseApiConfig`) and applied to the shared `api` instance by the root layout's script, before any screen is created, so a screen's first call (in its script, on mount or in an effect) already sees them. Client-side navigation does not re-read them:

| Parameter  | Values                                   | Default    | Effect                                                         |
| ---------- | ---------------------------------------- | ---------- | -------------------------------------------------------------- |
| `latency`  | `none`, `fast`, `slow`, or milliseconds  | 350–1100ms | Delay before each call settles                                 |
| `fail`     | `never`, `always`, `once`, or a rate 0–1 | `never`    | When calls reject with a retryable `ApiError`                  |
| `scenario` | `ready`, `empty`                         | `ready`    | Seed data: a workspace in use, or the first launch             |
| `seed`     | an integer                               | `2026`     | Seeds latency, failures and generated ids; same seed, same run |

They combine: `/api-keys?scenario=empty&latency=slow`. The switches are also available at runtime with `api.configure({ failure: "always" })`.

## Data contract (`src/lib/data`)

`mock.ts` holds the types and the seed data; `api.ts` the async API the screens call. Everything is dated at or before a fixed instant (`MOCK_NOW`, 21 October 2026 09:00 UTC) so prerendered output never changes between builds.

| Call                              | Resolves with                                      | Rejects with (`ApiError.code`)                         |
| --------------------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| `getProfile()`                    | `Profile`                                          | `unavailable`                                          |
| `updateProfile(update)`           | the merged `Profile`                               | `unavailable`, `invalid` (`field: "name"`)             |
| `getSettings()`                   | `Settings`                                         | `unavailable`                                          |
| `saveSettings(patch)`             | the merged `Settings`                              | `unavailable`                                          |
| `listApiKeys()`                   | `ApiKey[]`, newest first, no secret                | `unavailable`                                          |
| `createApiKey({ name, scopes })`  | `{ key, secret }`, the only time the secret exists | `unavailable`, `invalid` (`field: "name" \| "scopes"`) |
| `revokeApiKey(id)`                | nothing                                            | `unavailable`, `not_found`                             |
| `listNotifications()`             | `Notification[]`, newest first                     | `unavailable`                                          |
| `setNotificationsRead(ids, read)` | the updated notifications                          | `unavailable`                                          |
| `archiveNotifications(ids)`       | nothing                                            | `unavailable`, `not_found`                             |

Rules the screens can rely on:

- `ApiError.retryable` is true only for `unavailable`. Offer "Try again" for those; show `invalid` next to `field`.
- A failed write changes nothing. A successful one is visible to the next read.
- Every result is a copy, and inputs are copied too, so passing reactive component state is safe.
- `settle(request, isEmpty)` folds a call into a `LoadState` (`loading` is the screen's own initial value, then `empty`, `error` or `ready`).
- Undo follows one pattern (`src/lib/screens/undo.ts`): remove or change optimistically in the screen, show a toast with an Undo action (`duration: 6000`, `progress: true`), and call the API (`revokeApiKey`, `setNotificationsRead`, `archiveNotifications`) from the toast's `onClose` for any reason but `"action"`.

Interface copy lives in `src/lib/strings.ts` (the shell) and `src/lib/screens/copy.ts` (the screens); mock content is data and stays in English.

## Layout of the app

```
src/
  app.html, app.css          theme script, Tailwind and the package's tailwind.css
  routes/                    shell layout, one route per screen, / redirect
  routes/layout.test.ts      the switches reach a screen's first call
  routes/routes.test.ts      each route is its screen, on the shared API
  lib/shell/                 navigation, theme toggle, screen header
  lib/screens/               the four screens, their copy, the loader and the undo pattern
  lib/local/                 avatar, badge, card, empty and error states local to the app
  lib/data/                  mock data, API, their tests
  lib/test/                  test doubles: the layout around a probe screen
  lib/strings.ts             interface copy
  imports.test.ts            the public-surface boundary
playwright.config.ts         runs tests/e2e/workspace-demo.spec.ts against the preview
```
