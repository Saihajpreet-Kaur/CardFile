# Contact Manager & Mini CRM — Backend (CE-1)

A REST API for storing contacts with company, designation, tags, notes and interaction history, with search, filters, pagination, CSV import/export, soft delete and JWT authentication.

This version covers **CE-1 (syllabus units 1–4)**: Node.js core modules, Express, middleware, validation, authentication and file uploads. Data is stored in **JSON files using the `fs` module**. MongoDB/Mongoose (unit 5) and React (unit 6) come in CE-2.

---

## Tech stack

| Area | Used |
|---|---|
| Runtime | Node.js (ES modules), `http`, `fs/promises`, `path`, `events`, `stream`, `crypto` |
| Framework | Express 5 |
| Auth | `jsonwebtoken` (JWT), `bcryptjs` (password hashing) |
| Validation | `express-validator`, `validator` |
| Files | `multer` (memory storage), `csv-parse`, `@json2csv/node`, Cloudinary (optional) |
| Logging | `morgan` (HTTP requests) + an activity log written by an `EventEmitter` listener |
| Code quality | ESLint |
| Pages | EJS templates (`views/`): server-rendered home page + the app's HTML shell |
| Frontend | "Cardfile" UI in vanilla JavaScript modules + Tailwind CSS + Fetch API (`public/`), no framework |
| API testing | Postman collection (`postman/`) |

## Getting started

```bash
npm install
cp .env.example .env        # then set JWT_SECRET to a long random string
npm run seed                # demo data: 2 users, 12 contacts
npm run dev                 # http://localhost:5000
```

Open **http://localhost:5000** for the home page and **http://localhost:5000/app** for the app, or import `postman/CRM_CE1.postman_collection.json` into Postman.

Seeded accounts (local development only; change them in `.env`):

| Role | Email | Password |
|---|---|---|
| admin | `admin@crm.test` | `Admin@1234` |
| user | `demo@crm.test` | `Demo@1234` |

> Stop the server before running `npm run seed`. The server keeps data in memory and would overwrite the seeded files on its next write.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start with auto-restart on file changes (`node --watch`) |
| `npm start` | Start for production |
| `npm run seed` | Reset the JSON store and load demo data |
| `npm run lint` / `npm run lint:fix` | Check / fix code style with ESLint |

## Project structure

```
CRM_backend/
├── src/
│   ├── server.js               # Creates the HTTP server, graceful shutdown
│   ├── app.js                  # Express app: middleware, routes, error handling
│   ├── config/                 # Environment variables in one place
│   ├── constants/              # Roles, sort fields, limits, regexes
│   ├── routes/                 # URL → middleware chain → controller (page.routes.js: "/" and "/app")
│   ├── controllers/            # Read request, call service, send response (or render a view)
│   ├── content/                # Text for the home page, passed to the EJS template
│   ├── services/               # Business rules (duplicates, soft delete, import, auth)
│   ├── repositories/           # Data access — the ONLY layer that knows about storage
│   │   └── jsonStore.js        # File-backed collection (replaced by Mongoose in CE-2)
│   ├── middlewares/            # auth (JWT + roles), validate, upload (multer), errors
│   ├── validators/             # express-validator rule sets + CSV row validator
│   ├── events/                 # EventEmitter → logs/activity.log
│   └── utils/                  # AppError, logger, sanitizers, sort/paginate helpers
├── views/                      # EJS templates: home.ejs, app.ejs and partials/
├── public/                     # Frontend scripts (see "Frontend" below)
├── scripts/seed.js             # Demo data
├── samples/                    # Sample CSV for the import feature
├── postman/                    # Postman collection
├── storage/                    # JSON data files (git-ignored, created at runtime)
└── logs/                       # activity.log (git-ignored)
```

**Request flow:** `route → protect (JWT) → validation rules → validate → controller → service → repository → JSON file`

Errors are thrown as `AppError` from any layer. Express 5 forwards rejected promises automatically, so the central `errorHandler` turns every error into the same JSON shape.

## Frontend

The project uses both rendering styles, each where it fits best:

| URL | Rendering | Why |
|---|---|---|
| `/` home page | **Server-side (SSR)** with EJS: `page.controller.js` renders `views/home.ejs` with data from `src/content/home.js` | A public page should arrive complete, so it loads fast and search engines can read it |
| `/app` the app | **Client-side (CSR)**: the server sends `views/app.ejs` (an empty shell) and `public/js/main.js` builds every screen | After the first load, moving between screens needs no page reloads |

Both pages include `views/partials/head.ejs`, so the fonts, theme and design tokens live in one place. The server imports the same `shared.js` module (icons, logo, avatar) as the browser (registered as `app.locals`), so the home page draws contacts exactly like the app. Typing an app address without the `#` (for example `/contacts`) redirects to `/app#/contacts`.

```
views/
├── home.ejs              # Public home page (SSR): sections, floating widgets, feature visuals, animations (CSS)
├── app.ejs               # HTML shell of the app (CSR)
└── partials/head.ejs     # Shared <head>: fonts, theme, design tokens
public/
├── favicon.svg
└── js/
    ├── home.js           # Home page motion: reveal on scroll, parallax, typing search, live API status
    ├── main.js           # App: routes, login guard, keyboard shortcuts, start-up
    ├── shared.js         # DOM/format helpers, Lucide SVG icons, avatar, logo (used by the browser and the server)
    ├── core.js           # api (fetch wrapper), router (hash routes), session, theme
    ├── ui.js             # Reusable pieces: dialog, menu, toast, app shell (layout)
    ├── pages.js          # Pages: sign in / sign up, admin
    ├── contacts.js       # Contact list, add/edit contact form, trash
    ├── contactDetail.js  # Contact detail: card, notes, follow-ups, interaction timeline
    └── import.js         # CSV import page
```

| Screen | What it shows |
|---|---|
| Home (`/`) | Animated headline, floating product widgets that follow the mouse, a self-typing search, feature cards, an animated request-flow diagram of the API, count-up stats, FAQ, and a live API status pill that calls `GET /api/health` |
| Sign in / Sign up | Split layout, show/hide password, Caps Lock warning, live password rules, demo-account button |
| Contacts | Sortable table, search (debounced), tag filter, All / Favourites / Recent, pagination, CSV export, undo after delete |
| Contact detail | Index card with photo upload, notes, stats, interaction log with follow-ups, filterable timeline |
| Import | Drag-and-drop CSV, template download, per-row error report |
| Trash | Restore or delete forever (with confirmation) |
| Admin | Users and roles (admins only) |

Extras: light / dark / system theme, Ctrl+K quick search, `/` to search, `N` for a new contact, filters kept in the URL, works on phones.

## API reference

Base URL: `http://localhost:5000/api`. Every route except `/health`, `/auth/register` and `/auth/login` needs the header `Authorization: Bearer <token>`.

### Health & auth

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check (used by hosting platforms) |
| POST | `/auth/register` | `{ name, email, password }` → `{ user, token }` |
| POST | `/auth/login` | `{ email, password }` → `{ user, token }` |
| GET | `/auth/me` | Logged-in user |

### Contacts

| Method | Endpoint | Description |
|---|---|---|
| GET | `/contacts` | Paginated list (query params below) |
| POST | `/contacts` | Create. `firstName` and either `email` or `phone` are required |
| GET | `/contacts/recent` | 5 most recently viewed |
| GET | `/contacts/export` | Download the current filtered view as CSV |
| POST | `/contacts/import` | Multipart upload, field `file` (.csv, max 2 MB) |
| GET | `/contacts/:id` | One contact (also marks it as recently viewed) |
| PUT | `/contacts/:id` | Update the fields that are sent (send `""` to clear one) |
| PATCH | `/contacts/:id/favourite` | Toggle favourite |
| POST | `/contacts/:id/photo` | Multipart upload, field `photo` (JPEG/PNG/WEBP, max 2 MB) |
| DELETE | `/contacts/:id` | **Soft delete** (move to trash) |
| PATCH | `/contacts/:id/restore` | Restore from trash |
| DELETE | `/contacts/:id/permanent` | **Hard delete** (only from trash; also deletes interactions) |

List query parameters:

```
GET /api/contacts?page=1&limit=10&sort=-createdAt&search=sharma&tag=vip&company=infosys&favourite=true&status=active
```

| Param | Values | Default |
|---|---|---|
| `page` | ≥ 1 | 1 |
| `limit` | 1–100 | 10 |
| `sort` | `createdAt`, `updatedAt`, `firstName`, `lastName`, `email`, `company`, with a `-` prefix for descending | `-createdAt` |
| `search` | matches name, email, phone, company, designation and tags | – |
| `tag`, `company`, `favourite` | column filters | – |
| `status` | `active` or `trash` | `active` |

Response:

```json
{
  "success": true,
  "data": [{ "id": "…", "firstName": "Aarav", "…": "…" }],
  "pagination": { "page": 1, "limit": 10, "total": 12, "totalPages": 2, "hasNextPage": true, "hasPrevPage": false }
}
```

### Interactions

| Method | Endpoint | Description |
|---|---|---|
| GET | `/contacts/:id/interactions` | Newest first |
| POST | `/contacts/:id/interactions` | `{ type: call\|email\|meeting, note, date?, followUpDate? }` |
| DELETE | `/contacts/:id/interactions/:interactionId` | Delete one |

### Users (admin only)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/users` | All users with their contact count |
| PATCH | `/users/:id/role` | `{ role: user\|admin }` |

### Error format

```json
{
  "success": false,
  "message": "Validation failed",
  "details": [{ "field": "email", "location": "body", "message": "Enter a valid email address" }]
}
```

| Status | When |
|---|---|
| 400 | Bad request (invalid JSON, contact in trash, unreadable CSV) |
| 401 | Missing, invalid or expired token; wrong login |
| 403 | Logged in but role not allowed |
| 404 | Unknown route or contact |
| 409 | Duplicate email/phone, or email already registered |
| 413 | Uploaded file too large |
| 415 | Wrong file type |
| 422 | Validation failed (field-level details) |
| 500 | Unexpected server error (message hidden in production) |

## CSV import & export

- Import accepts headers like `First Name`, `Email`, `Phone`, `Company`, `Job Title`, `Tags`, `Notes`. Tags can be separated with `;` or `,`. Try it with `samples/contacts-import-sample.csv`, which includes rows that fail on purpose.
- Each row is validated separately. Valid rows are saved and invalid rows come back with their line number and reasons:
  ```json
  { "totalRows": 8, "imported": 4, "failed": 4,
    "errors": [{ "line": 5, "errors": ["firstName is required"], "data": { "…": "…" } }] }
  ```
- Export streams the CSV (`Readable → json2csv Transform → response`) using the same filters as the list. Cells starting with `= + - @` are prefixed with `'` to prevent CSV formula injection.

## Security measures

- Passwords hashed with bcrypt; the hash is never returned by the API.
- JWT verified on every protected request, and the user must still exist.
- Login returns the same message for an unknown email and a wrong password.
- Clients can never choose their own role at registration.
- Every input is validated and sanitized (HTML tags stripped, emails lower-cased, phones normalized).
- Every contact query is scoped to the logged-in user (`userId`).
- Uploads are kept in memory with size and MIME-type limits, so nothing is written to the server disk.
- JSON body size is limited to 100 KB.

## Syllabus mapping (CE-1)

| Unit | Where it is used |
|---|---|
| **1. Web fundamentals** | `package.json` scripts, ES modules, async/await everywhere, Git |
| **2. Node.js core modules** | `http.createServer` (server.js), `fs/promises` + `path` (jsonStore, storage, events), `EventEmitter` (activity.events.js), streams (CSV export), `crypto.randomUUID` (ids), `process` signals |
| **3. Frontend basics & debugging** | `public/` UI: ES modules, async/await + Fetch API, JSON, Tailwind component styling, reusable UI modules (`ui.js`), debounced search, filters synced to the URL, ESLint, morgan + activity logs |
| **4. Express & REST APIs** | Routing, route params, query params, body parsing, REST status codes, CRUD, custom middleware, validation and sanitization, JWT auth, bcrypt, role-based access, multer uploads, Cloudinary, Postman testing |
| **SSR vs CSR & template engines** | EJS view engine (`app.set('view engine', 'ejs')`), `res.render()` with data, `<%= %>` escaped vs `<%- %>` raw output, loops and conditions in templates, partials with `include()`, `app.locals` helpers; SSR home page vs CSR app (see "Frontend") |

## Planned for CE-2 and later

- Replace `src/repositories/*` with Mongoose models on MongoDB Atlas, including a compound index on `{ userId, email }`. Sorting and pagination then run in the database (`sort/skip/limit`), not in JavaScript. No route, controller or validator needs to change.
- Dashboard summary (`GET /api/dashboard/summary`) using MongoDB aggregation.
- React frontend (Vite, TanStack Table, React Router) with CORS.
- Deployment: Render (API) + Vercel (frontend) + Atlas, with a Render health check on `/api/health`.
 
