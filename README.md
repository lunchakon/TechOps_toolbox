# TechOps Toolbox

Self-hosted, browser-only utilities for technical support, software engineering and DevOps troubleshooting. React + TypeScript + Vite, Tailwind CSS with shadcn/ui-style components, served by unprivileged Nginx in Docker. **No backend, no database, no external API calls.**
<img width="1591" height="896" alt="image" src="https://github.com/user-attachments/assets/640b0110-158b-448c-8cab-6c25fdd562c5" />

## Features

| Tool | Route | What it does |
| --- | --- | --- |
| JSON / XML Formatter | `/json-xml` | Format, minify, validate; line/column errors; collapsible JSON tree viewer |
| Timestamp & Timezone | `/timestamp` | Unix seconds/ms ⇄ date, ISO 8601, UTC offsets, DST gap/overlap warnings. Compare any number of IANA zones side by side (searchable picker by city, country or code, plus quick-add); country flags shown next to each zone. Flags are bundled SVGs (no external requests); the compared zones are remembered in the browser |
| Regex Tester | `/regex` | Match highlighting, capture groups (named too) and positions, examples, worker-based timeout against catastrophic backtracking |
| Base64 | `/base64` | UTF-8 encode/decode, URL-safe variant, malformed-input validation, swap |
| URL Encoder | `/url` | Component / full-URL / form (`+` for space) modes, query-parameter table, explanations of malformed `%` escapes |
| JWT Decoder | `/jwt` | Header, payload, `iat` `exp` `nbf` `iss` `sub` `aud`, expiry countdown. **Does not verify signatures** |
| Cron Visualizer | `/cron` | 5-field Unix cron validation, plain-English text, field breakdown, next 10 runs in any timezone with DST handling, presets |

Also: dashboard, responsive sidebar / mobile menu, light/dark/system theme, keyboard-accessible controls, skip link.

Libraries: [`fast-xml-parser`](https://github.com/NaturalIntelligence/fast-xml-parser) (XML), [`cron-parser`](https://github.com/harrisiirak/cron-parser) + [`cronstrue`](https://github.com/bradymholt/cRonstrue) (cron), [`luxon`](https://moment.github.io/luxon/) (timezones / DST).

### Cron: supported and unsupported syntax

Supported: `*`, lists (`1,15`), ranges (`1-5`), steps (`*/10`, `0-30/5`), `JAN-DEC` / `SUN-SAT`, day-of-week `0`–`7` (0 and 7 = Sunday). If both day-of-month and day-of-week are restricted, Unix cron runs when **either** matches.

**Rejected with an explicit error (never silently reinterpreted):** a seconds or year field (6–7 fields, Quartz/Spring), `L W # ?`, `@macros` (the error shows the 5-field equivalent), out-of-range values, impossible dates such as `31 Feb`.

| | Unix cron (this tool) | Quartz | Kubernetes CronJob |
| --- | --- | --- | --- |
| Fields | 5 | 6–7 (leading seconds) | 5 |
| Day-of-week numbers | 0–7, Sunday = 0/7 | 1–7, Sunday = 1 | 0–7 |
| `L W # ?` | no | yes | no |
| Timezone | server local | scheduler setting | controller time (UTC) unless `spec.timeZone` |

DST behaviour (verified by tests with `America/New_York`, `Europe/London`, `Australia/Sydney`): a fixed time inside the spring-forward gap fires once, after the gap; a fixed time inside the repeated fall-back hour fires once; an every-hour job fires once per real hour.

## Adding your own tools (links to other apps)

Other internal applications can be added to the dashboard and sidebar by editing **`config/custom-tools.json`**. No rebuild or restart is needed: save the file and reload the page.

The live file is deliberately **not committed** (it usually contains internal hostnames or IPs). Create it from the example:

```bash
cp config/custom-tools.example.json config/custom-tools.json    # PowerShell: Copy-Item config\custom-tools.example.json config\custom-tools.json
```

```json
{
  "sections": [
    {
      "title": "Internal apps",
      "tools": [
        { "name": "My app", "description": "What it does.", "url": "http://app.example.local:9001/", "icon": "search" }
      ]
    }
  ]
}
```

- Each section becomes a heading on the dashboard and in the sidebar; add as many sections and tools as you like, in the order you want them shown.
- Fields per tool: `name` (required, max 60 chars), `url` (required, absolute `http://` or `https://`), `description` (optional, max 200 chars), `icon` (optional). Section `title` is optional (defaults to "Custom tools").
- Icons: `external-link` (default), `link`, `globe`, `search`, `server`, `database`, `terminal`, `wrench`, `book`, `shield`, `activity`, `cloud`, `bug`, `file`, `key`, `mail`, `settings`, `box`, `monitor`, `network`, `users`, `ticket`, `disk`, `cpu`, `git`, `support`. Unknown names fall back to the default icon.
- Links open in a **new tab** with `rel="noopener noreferrer"`. The card shows the target host so it is clear where it leads. Custom tools are separate applications: they are not embedded and the toolbox never sends them any data.
- Validation: entries with a missing name/URL, a non-`http(s)` scheme (`javascript:`, `data:`, `file:` …) or credentials in the URL are **skipped and listed in a warning on the dashboard**, never silently accepted. Invalid JSON shows a warning too. If the file does not exist, only the built-in tools are shown.
- How it works: `docker-compose.yml` bind-mounts `./config` read-only into the container at `/usr/share/nginx/html/config`, and the page fetches `/config/custom-tools.json` on load. `npm run dev` serves `./config` the same way.
- Anyone who can edit that file on the host controls which links appear, so protect it like any other deployment configuration. There is no in-app editor and no write access from the browser.

## Prerequisites

- Docker Engine / Docker Desktop with Compose v2 (`docker compose`)
- For local development without Docker: Node.js **20 or newer** (the Docker build uses Node 22)

## Docker Compose (recommended)

```bash
docker compose up -d --build
```

The image build runs lint, unit tests, type-check and the production build, so a broken tree will not produce an image.

Open <http://localhost:8088>.

```bash
docker compose ps          # shows "healthy" once the health check passes
docker compose logs -f     # nginx logs (no user input is ever sent to the server)
docker compose down        # stop and remove the container
```

### Change the port

Copy `.env.example` to `.env` and edit:

```bash
TECHOPS_PORT=9090
```

then `docker compose up -d`. You can also do it for one run: `TECHOPS_PORT=9090 docker compose up -d` (PowerShell: `$env:TECHOPS_PORT=9090; docker compose up -d`).

### Access from another device (LAN or Tailscale)

By default the port is bound to `127.0.0.1` (this machine only). To expose it, set `TECHOPS_BIND` in `.env`:

- **Tailscale only (recommended):** `TECHOPS_BIND=<your tailscale IP>` (run `tailscale ip -4`), then browse to `http://<tailscale-ip>:8088` or `http://<machine-name>:8088` from any device on the tailnet.
- **Whole LAN:** `TECHOPS_BIND=0.0.0.0`, then browse to `http://<host-lan-ip>:8088`. Anyone on that network can reach it; the app holds no data, but prefer a firewall rule or Tailscale.

Then `docker compose up -d`. Note: over plain `http://` on a non-localhost address the browser Clipboard API is unavailable; the Copy buttons fall back to a legacy copy method automatically.

### Container hardening

Non-root user (uid 101), read-only root filesystem with a `/tmp` tmpfs, all Linux capabilities dropped, `no-new-privileges`, memory/PID limits, health check, `restart: unless-stopped`, log rotation. The only volume is the read-only `./config` mount described above; the tools themselves store nothing. Only container port 8080 is published.

## Local development

```bash
npm install
npm run dev          # http://localhost:5173
```

| Command | Purpose |
| --- | --- |
| `npm test` | Unit and UI tests (Vitest + Testing Library) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Type-check + production build into `dist/` |
| `npm run check` | All of the above |

Layout: `src/tools/<tool>/` holds each tool's pure `logic.ts` and its page component; `src/components`, `src/layouts`, `src/pages`, `src/hooks`, `src/lib` hold the shared shell; tests live in `tests/`.

If you do not have Node 20+, run the commands in a container, e.g.:

```bash
docker run --rm -v "$PWD:/app" -v techops_node_modules:/app/node_modules -w /app node:22.12.0-alpine3.21 sh -c "npm ci && npm run check"
```

## Privacy and security

- Every tool runs in your browser. User input is never sent to any server, API or analytics service, and the app never logs it (ESLint forbids `console.*`).
- Nothing sensitive is stored. `localStorage` holds only the theme (`techops.theme`) and chosen timezone (`techops.timezone`). JWTs, text and payloads live in component memory and are gone on reload.
- XML and JSON are rendered as React text nodes; user markup is never inserted as HTML.
- Nginx sends a strict CSP (`default-src 'none'`, scripts/styles/workers from `'self'` only, no inline scripts, `connect-src 'self'`), `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, COOP and CORP.
- **Limitations:** decoding a JWT is not verification. Base64 is encoding, not encryption. The server is plain HTTP; put it behind TLS (e.g. a reverse proxy or Tailscale) if it leaves a trusted network. Browser extensions and shared or untrusted devices can read anything you paste, so **do not paste production secrets into shared or untrusted devices**.
- The regex tester uses the browser's JavaScript engine (not PCRE) and stops runaway patterns after 1.5 s via a Web Worker; test text is limited to 200,000 characters.

## Troubleshooting

- **Port already in use** (`bind: address already in use`): choose another `TECHOPS_PORT` in `.env`. Check usage with `netstat -ano | findstr :8088` (Windows) or `ss -ltnp | grep 8088`.
- **Can't reach it from another device:** `TECHOPS_BIND` is still `127.0.0.1`; see "Access from another device". Also check the host firewall.
- **Container unhealthy:** `docker compose logs techops-toolbox` and `docker inspect techops-toolbox --format '{{json .State.Health}}'`.
- **Blank page after changes:** hard-reload; assets are content-hashed but `index.html` is `no-cache`.
- **Copy button says "Copy failed":** the browser blocked clipboard access; select the output and copy manually.
- **Timezone list is short:** very old browsers lack `Intl.supportedValuesOf`; only UTC and Asia/Bangkok are offered then.
- **Local `npm` errors on old Node:** use Node 20+ or the container command above.
