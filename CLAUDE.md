# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start development server with hot reload
npm run build        # Type-check and build (includes icon generation)
npm run build:win    # Full Windows installer build (NSIS)
npm test             # Run unit tests once
npm run test:watch   # Run tests in watch mode
```

To run a single test file: `npx vitest run src/utils/time/index.test.ts`

## Architecture

This is an **Electron + Vue 3 desktop widget** for Windows that displays Google Calendar events in a frameless, transparent overlay on the desktop.

### Process Structure

**Main process** (`src/main/`):
- `main.ts` — App entry point; wires together IPC handlers, calendar service, and window lifecycle
- `windowManager.ts` — Creates two windows: the frameless widget and the settings dialog
- `calendarService.ts` — Polls Google Calendar API on a configurable interval
- `auth.ts` — Google OAuth2 flow with multi-account token storage
- `settingsStore.ts` — Persistent settings via `electron-store`
- `tray.ts` — System tray icon and context menu

**Preload scripts** (`src/preload/`):
- `widget.ts` and `settings.ts` expose a typed `electronAPI` to their respective renderers via `contextBridge`
- Context isolation is enforced; renderers have no direct Node.js access

**Renderer process** (`src/renderer/`):
- `widget/` — The calendar display (Vue components: CalendarGrid → DayColumn + TimeColumn + EventBlock)
- `settings/` — The settings UI (AuthSection, CalendarSelection, AppearanceSettings, BehaviorSettings)

**Shared** (`src/shared/types.ts`) — `CalendarEvent` and `CalendarListEntry` interfaces used across all processes.

### IPC Communication Pattern

The `electronAPI` exposed in preload scripts is the only bridge between renderer and main. Key channels:
- `calendar:events` — main pushes event arrays to widget renderer
- `calendar:list` — main pushes available calendars list
- `get-settings` / `set-settings` — settings renderer reads/writes config
- `auth:sign-in` / `auth:sign-out` — OAuth flow initiation
- `calendar:refresh` — renderer requests immediate data refresh

### Build System

Uses `electron-vite` (Vite-based). Config in `electron.vite.config.ts`:
- Main entry: `src/main/main.ts` → `out/main/`
- Preload entries: widget + settings → `out/preload/`
- Renderer entries: two separate HTML entry points → `out/renderer/`

The `build:icons` script (`scripts/build-tray-icon.mjs`) uses `sharp` + `png-to-ico` to generate tray icons before the main build.

### Testing

Vitest with Node environment. Tests live alongside source at `src/**/*.test.ts`. Currently only `src/utils/time/` has tests covering week/date calculations.

### Windows Build Notes

The `build:win` script runs `scripts/ensure-winCodeSign-cache.mjs` to pre-cache the winCodeSign binaries before electron-builder runs. See `BUILD.md` for details on handling symlink issues on Windows. Code signing is optional (`forceCodeSigning: false`).
