# ResumeFilter AI — Frontend

React 18 + TypeScript (strict) + Vite + Tailwind CSS v4 UI for the **Resume Filter AI Agent**. You create a job, upload
hundreds of resumes, and get a ranked, explained shortlist. The AI agent (Amazon Bedrock · GLM-5) judges each requirement;
the app computes the score, so every ranking can be traced back to it.

The backend is a separate repo ([AI-Resume-Analyser-Backend](https://github.com/N3X-Global-Solutions/AI-Resume-Analyser-Backend));
`src/api/types.ts` mirrors its API contract field for field.

## Requirements

- Node 22 / npm 10
- The FastAPI backend on `http://localhost:8000` (all routes under `/api`). The UI still boots without it and shows
  "API offline" plus a retry state on each page.

## Setup & scripts

```bash
npm install
npm run dev        # http://localhost:5173 — proxies /api → http://localhost:8000
npm run build      # type-check (tsc -b) + production build into dist/
npm run lint       # ESLint (typescript-eslint, react-hooks incl. React Compiler rules, react-refresh)
npm run typecheck  # tsc -b only
npm run preview    # serve dist/ on :4173 (also proxies /api)
```

To point the dev proxy at a different backend, set `VITE_API_PROXY_TARGET`, for example
`VITE_API_PROXY_TARGET=http://127.0.0.1:9000 npm run dev`.

### Admin login

The whole app is admin-only. `/login` takes email and password; the backend sets a JWT in an httpOnly cookie, and
every other route redirects to `/login` without a session (and back to the requested page after sign-in). Create
admin accounts on the backend: `python -m app.cli create-admin --email you@company.com`.

### Cloudflare Pages (production)

| Setting | Value |
|---|---|
| Root directory | *(empty)* |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Environment variables | `VITE_API_BASE_URL=https://api.yourdomain.com` (backend origin, **without** `/api`), `NODE_VERSION=22` |

Serve the site from a custom domain on the **same parent domain** as the API (e.g. `app.yourdomain.com` +
`api.yourdomain.com`). The login cookie won't work across unrelated domains such as `*.pages.dev`. The backend's
`FRONTEND_ORIGIN` must be exactly this site's URL (`https://app.yourdomain.com`). Pages serves `index.html` for
client-side routes automatically.

### Docker (self-hosted alternative)

```bash
docker build -t resume-filter-frontend .
docker run -p 8080:80 --network <compose-network> resume-filter-frontend
```

The image builds with Node and serves `dist/` with nginx. It proxies `/api/` to `http://backend:8000`, so the backend's
compose service needs to be named `backend`. It also allows 250 MB request bodies for upload batches and sets 300 s
timeouts for the LLM endpoints. The config is in `nginx.conf`.

## Screens

| Route | Screen |
|---|---|
| `/login` | Admin sign-in (email + password). |
| `/` | Dashboard: stat cards, tier distribution across all jobs, recent jobs with mini tier bars and live processing %. |
| `/jobs` | Jobs list: Active / Closed / All filter, search, close / reopen, edit, delete (with a confirm dialog). |
| `/jobs/new`, `/jobs/:id/edit` | Job form. **Auto-fill with AI** (paste a JD and GLM-5 pre-fills the form), skills tag inputs, experience, education, custom requirements, and scoring weights with the live *effective* % after redistribution. |
| `/jobs/:id?tab=candidates` | Ranking: tier chips, keyword search or **AI search**, a filters panel kept in the URL, sort, paginated table / phone cards, status quick actions, a bulk bar, **smart bulk actions** (with exact affected counts), and CSV export. |
| `/jobs/:id?tab=upload` | Drag & drop of 100+ PDF / DOCX / ZIP files, sent in batches of 20. Shows an accepted / duplicate / rejected summary, a live processing panel (polls every 2 s), and the resume list with retry / delete. |
| `/jobs/:id?tab=requirements` | Read-only requirements and the scoring weights table with effective %. |
| `/candidates/:id` | Candidate detail: score ring, rank, decisions, notes, AI summary, **score breakdown with the formula**, requirements checklist with evidence, **"Why ranked #N?"** (LLM, cached, regenerate), work history, education, projects, skills, the resume (PDF iframe / extracted text), the agent trace, and prev / next by rank. |
| `/shortlist` | Shortlisted candidates across jobs, with a job filter, status changes and CSV export. |
| `*` | 404 |

## Structure

```
src/
  api/            types.ts (contract mirror) · client.ts (fetch wrapper, ApiError, buildQuery)
                  endpoints.ts (typed endpoint functions) · queryKeys.ts (central keys)
                  hooks.ts (React Query queries + mutations with invalidation) · queryClient.ts
  lib/            constants.ts (tier / status / education / category labels and colours, thresholds 85/70/50)
                  format.ts (score, years, dates, sizes, salary) · scoring.ts (effective-weight redistribution)
  hooks/          useDocumentTitle, useDebouncedCallback, useMediaQuery
  components/ui/  Button, Badge, Card, Input / Select / Textarea, Field, Tabs, Modal, ConfirmDialog, DropdownMenu,
                  Checkbox, SegmentedControl, ScoreRing, Tier / Status / Processing badges, ProgressBar / SegmentedBar,
                  EmptyState, ErrorState, Skeleton, TagInput, Tooltip, Pagination, CopyButton, Avatar, StatCard
  components/     AppLayout (sidebar + mobile drawer), TierBar / TierChips, StatusActions, ErrorBoundary, …
  features/       dashboard · jobs · workspace (candidates, upload, requirements) · candidates · shortlist
  pages/          NotFoundPage, RouteErrorPage
```

### Conventions

- **Server state** goes through React Query only. Keys live in `queryKeys.ts`; everything for one job sits under
  `['job', jobId, …]`, so one prefix invalidation refreshes the job, its progress, resumes and candidate lists.
- **Live processing:** `useProgress` polls every 2 s while `is_processing`. `useProcessingSync` refreshes the derived queries
  whenever progress changes and shows a toast when a run finishes.
- **Uploads** run in a small external store (`uploadStore.ts`), so a long upload survives tab switches and in-app navigation.
- **URL state:** the workspace tab and every candidate filter, sort and page are search params, so a link to a view can be
  shared.
- **Tier and status colours** are defined once in `lib/constants.ts`. Strong is emerald, Good sky, Partial amber and Low rose.
  For statuses, New is slate, Shortlisted emerald, Maybe amber and Rejected rose.
- **Errors:** every request throws `ApiError` (`status` + `detail`; FastAPI 422 lists are flattened). Mutations toast
  through a global `MutationCache.onError` unless they opt out with `meta.errorTitle: false`.
