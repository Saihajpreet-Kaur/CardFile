# Cardfile — Contact Manager & Mini CRM

A full-stack MERN application for storing contacts with company, designation, tags, notes and photos, logging calls, emails and meetings with follow-up dates, grouping contacts into lists, and importing or exporting them as CSV. Search, filtering, sorting and pagination run **inside MongoDB**.

| Part | Technology |
|---|---|
| API | Node.js 20+, Express 5 (ES modules), REST + JSON |
| Database | MongoDB Atlas, Mongoose 9 (schemas, validation, indexes, aggregation, populate, middleware) |
| Client | React 18, Vite, React Router, Axios, Context API + `useReducer`, Tailwind CSS 4 |
| Home page | EJS (server-side rendered) |
| Auth | JWT (`jsonwebtoken`), `bcryptjs`, role-based access (user / admin) |
| Files | Multer (memory storage), `csv-parse`, `@json2csv/node` (streamed), Cloudinary |
| Caching / logs | Redis (falls back to an in-memory cache), Winston + Morgan |
| Security | Helmet, CORS allow-list, rate limiting, express-validator, sanitizers |
| Quality / DevOps | ESLint, Node test runner + Supertest + in-memory MongoDB, Docker, Docker Compose, GitHub Actions, Render |

The CE-1 version (JSON-file storage, plain-JavaScript frontend) is kept in git under the tag **`ce-1`**.

---

## Getting started

### Option A: no database account needed (local MongoDB)

```bash
npm install
cp .env.example .env          # set JWT_SECRET to a long random string
npm run build                 # builds the React client into client/dist
npm run dev:local             # starts a local MongoDB + the API, fills demo data on first run
```

Open **http://localhost:5000** (home page) and **http://localhost:5000/app** (React app). Local data is kept in `storage/mongo`.

### Option B: MongoDB Atlas

1. Create a free cluster on MongoDB Atlas, a database user, and allow your IP in *Network Access*.
2. Put the connection string in `.env` as `MONGO_URI` (use `/crm-dev` for development and a separate database such as `/crm` for production).
3. Run:

```bash
npm run seed      # demo data (clears the database first)
npm run dev       # API with auto-restart on http://localhost:5000
npm run client:dev   # React dev server with hot reload on http://localhost:5173/app/
```

In development, Vite proxies `/api` to `http://localhost:5000`, so the React app and the API look like one origin.

Demo accounts (local development only):

| Role | Email | Password |
|---|---|---|
| admin | `admin@crm.test` | `Admin@1234` |
| user | `demo@crm.test` | `Demo@1234` |

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API with auto-restart (`node --watch`), uses `MONGO_URI` |
| `npm run dev:local` | Local MongoDB + API + demo data, no Atlas needed |
| `npm run client:dev` | React dev server (Vite) |
| `npm run build` | Install and build the React client into `client/dist` |
| `npm start` | Production start |
| `npm run seed` | Reset the database and load demo data |
| `npm test` | 32 API tests against an in-memory MongoDB |
| `npm run explain` | Shows the contact query plan: index scan (IXSCAN) vs full collection scan (COLLSCAN) |
| `npm run lint` / `lint:fix` | ESLint |

---

## Project structure

```
CRM_backend/
├── src/                        # Express API
│   ├── server.js               # http.createServer, connects MongoDB + cache, graceful shutdown
│   ├── app.js                  # middleware order: helmet, logging, CORS, rate limit, parsers, static, routes, errors
│   ├── config/                 # index.js (env vars), db.js (Mongoose connection)
│   ├── models/                 # User, Contact, Interaction, ContactList (Mongoose schemas)
│   ├── repositories/           # the only layer that runs database queries
│   ├── services/               # business rules, cache.service.js (Redis / memory)
│   ├── controllers/            # read req, call service, send res
│   ├── routes/                 # URL -> middleware chain -> controller
│   ├── middlewares/            # auth (JWT + roles), validate, upload (Multer), errors
│   ├── validators/             # express-validator rule sets
│   ├── events/                 # EventEmitter: activity log + cache invalidation
│   └── utils/                  # AppError, Winston logger, sanitizers, pagination helpers
├── client/                     # React app (Vite)
│   └── src/
│       ├── api/                # Axios instance + interceptors, endpoint functions
│       ├── context/            # AuthContext (useReducer), ToastContext
│       ├── hooks/              # useApi, useDebounce (custom hooks)
│       ├── components/         # Layout, route guards, ContactForm, reusable UI
│       └── pages/              # Dashboard, Contacts, ContactDetail, Lists, FollowUps, Import, Trash, Admin, auth
├── views/                      # EJS home page (SSR)
├── public/js/                  # home page scripts (shared.js is also used by the server)
├── tests/                      # node:test + Supertest + mongodb-memory-server
├── scripts/                    # seed.js, dev-local.js
├── postman/                    # Postman collection (37 requests)
├── Dockerfile, docker-compose.yml, .dockerignore
├── .github/workflows/ci.yml    # GitHub Actions
└── render.yaml                 # Render deployment blueprint
```

**Request flow:** `React (Axios) → route → protect (JWT) → validation → controller → service → repository → MongoDB`

---

## Database design (MongoDB + Mongoose)

| Collection | Key fields | Relationships |
|---|---|---|
| `users` | name, email (unique), passwordHash (`select: false`), role | — |
| `contacts` | userId, firstName, lastName, email, phone, company, designation, tags[], notes, photoUrl, lists[], isFavourite, isDeleted, deletedAt, lastViewedAt, timestamps | `userId` → users, `lists[]` → contactlists (**referencing**) |
| `interactions` | contactId, userId, type (call/email/meeting), note, date, followUpDate, followUpDone | `contactId` → contacts |
| `contactlists` | userId, name (unique per user, case-insensitive), description, color | many-to-many with contacts |

**Indexes on `contacts`:** compound **unique** `{ userId, email }` and `{ userId, phone }` (partial: empty values ignored), plus `{ userId, isDeleted, createdAt }`, `{ userId, isDeleted, firstName }`, `{ userId, isDeleted, tags }`, `{ userId, lists }`, `{ userId, lastViewedAt }`. The unique indexes also stop a double-clicked "Save" from creating two contacts (the second request gets 409).

**Mongoose features used:** schema validation (required, maxlength, enum, custom validators), a virtual (`fullName`), a static method (`Contact.findOwned`), document middleware (`pre('save')` cleans tags), query middleware (`post('findOneAndDelete')` deletes a contact's interactions / removes a deleted list from contacts), `populate()` (contact lists, follow-ups with contact names), aggregation (`$facet`, `$group`, `$unwind`, `$lookup`, `$dateToString`), collation for case-insensitive sorting.

**Embedding vs referencing:** interactions are separate documents (they grow without limit and are queried on their own); lists are referenced by id because one contact can be in many lists and one list has many contacts.

---

## API reference

Base URL `http://localhost:5000/api`. All routes except `/health`, `/auth/register` and `/auth/login` need `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Status, database and cache state (503 if the database is down) |
| POST | `/auth/register` · `/auth/login` | Returns `{ user, token }` |
| GET | `/auth/me` | Logged-in user |
| GET | `/contacts` | Paginated list: `page, limit, sort, search, tag, company, list, favourite, status` |
| POST | `/contacts` | Create (`firstName` + email or phone required) |
| GET | `/contacts/recent` · `/contacts/tags` | Recently viewed · tags with counts |
| GET | `/contacts/export` | Download the filtered view as CSV (streamed from a MongoDB cursor) |
| POST | `/contacts/import` | Multipart field `file` (.csv, 2 MB, 1,000 rows) |
| GET / PUT / DELETE | `/contacts/:id` | Read (with populated lists) / update / move to trash |
| PATCH | `/contacts/:id/favourite` · `/contacts/:id/restore` | Toggle favourite · restore from trash |
| DELETE | `/contacts/:id/permanent` | Hard delete (only from trash; cascades to interactions) |
| POST | `/contacts/:id/photo` | Multipart field `photo` (JPEG/PNG/WEBP, 2 MB) → Cloudinary |
| GET / POST | `/contacts/:id/interactions` | Timeline / add `{ type, note, date?, followUpDate? }` |
| DELETE | `/contacts/:id/interactions/:interactionId` | Delete an interaction |
| PATCH | `/contacts/:id/interactions/:interactionId/follow-up` | `{ done: true/false }` |
| GET | `/followups?status=overdue\|today\|upcoming\|all` | Pending follow-ups with contact details |
| GET / POST | `/lists` | Lists with contact counts / create |
| PUT / DELETE | `/lists/:id` | Rename / delete (contacts are kept) |
| PATCH | `/lists/:id/contacts` | `{ action: "add"\|"remove", contactIds: [...] }` |
| GET | `/dashboard/summary` | Totals, contacts per month, top tags/companies, follow-ups (cached, `X-Cache: HIT/MISS`) |
| GET | `/users` · PATCH `/users/:id/role` | Admin only |

Errors always look like `{ "success": false, "message": "...", "details": [...] }`.

| Status | When |
|---|---|
| 400 | Bad JSON, invalid id value, contact in trash, unreadable CSV |
| 401 / 403 | Missing or invalid token / role not allowed |
| 404 | Unknown route, or a record that does not exist **or belongs to another user** |
| 409 | Duplicate email/phone, list name or account (including unique-index races) |
| 413 / 415 | File too large / wrong file type |
| 422 | Validation failed (field-level `details`) |
| 429 | Too many requests (rate limit) |
| 503 | Health check: database disconnected |

---

## Caching, logging and security

- **Cache-aside caching:** `GET /dashboard/summary` runs several aggregations, so the result is cached per user for 60 seconds. With `REDIS_URL` set, Redis is used (shared by all instances); otherwise an in-memory `Map` with a TTL. Every data change emits an event (`contact:created`, `followUp:done`, ...), and a listener deletes that user's cache keys (**invalidation**), so the dashboard is never stale.
- **Logging:** Winston writes coloured lines in development and one JSON object per line in production (structured logging). Morgan's request lines go through Winston. Log files: `logs/combined.log`, `logs/error.log` (disabled in containers with `LOG_FILES=false`). Business events go to `logs/activity.log`.
- **Security:** bcrypt password hashes (never returned), JWT on every protected route, role checks, per-user data scoping, express-validator + HTML stripping, escaped regex search, Helmet headers, CORS allow-list (`CLIENT_URL`), rate limits (30 auth requests / 15 min, 300 API requests / min), 100 KB JSON limit, uploads in memory with size/type limits, photos on Cloudinary.

## React client

- **Routing:** `BrowserRouter` with `basename="/app"`, nested routes inside a `Layout` (`<Outlet />`), route params (`/contacts/:id`), guards: `ProtectedRoute`, `AdminRoute`, `GuestRoute`.
- **State:** `AuthContext` (`useReducer` + `useContext`) holds the session; the JWT is stored in `localStorage` and attached by an Axios request interceptor. A response interceptor signs the user out on 401.
- **Data fetching:** the `useApi` custom hook tracks loading and error states and ignores out-of-date responses; `useDebounce` waits 350 ms before searching.
- **URL state:** the contacts page keeps search, filters, sort and page in the query string (`useSearchParams`), so refresh, Back and shared links keep the same view.
- **Forms:** controlled components with client-side validation; server errors (422 details, 409 duplicates) are shown under the matching field. Buttons are disabled while saving to stop double submissions.
- **Uploads:** photo and CSV uploads show a progress bar (`onUploadProgress`).

---

## Testing

```bash
npm test
```

32 tests run against an in-memory MongoDB (no external database): auth, validation, duplicates (including two simultaneous requests), per-user isolation, pagination/sorting/search/filters in MongoDB, soft/hard delete with cascade, lists and populate, follow-ups, dashboard aggregation and cache HIT/MISS/invalidation, CSV import/export, admin roles, security headers and CORS. The Postman collection in `postman/` covers every endpoint for manual testing.

## Docker

```bash
docker compose up --build        # gateway (port 80) + app (5000) + MongoDB + Redis
docker compose exec api node scripts/seed.js
```

An **Nginx API gateway** (`gateway/nginx.conf`) is the single entry point on port 80: it rate-limits, adds a request id, and forwards to the `api` service.

The `Dockerfile` is multi-stage: stage 1 builds the React client, stage 2 installs production dependencies, stage 3 copies only what is needed and runs as the non-root `node` user with a `HEALTHCHECK`. In Compose, the API reaches the database at `mongodb://mongo:27017` — `mongo` is the service name, resolved by Compose's internal DNS (service discovery).

## CI/CD and deployment

- **CI (GitHub Actions, `.github/workflows/ci.yml`):** on every push and pull request: lint + tests, React build, Docker build.
- **CD (Render, `render.yaml`):** one web service builds the client and serves API + home page + React app. `healthCheckPath: /api/health`; `autoDeploy` redeploys after every push to `main` once CI passes. Set `MONGO_URI` (production Atlas database), `CLIENT_URL` and the Cloudinary keys in the Render dashboard; `JWT_SECRET` is generated by Render.
- **Separate frontend (optional):** deploy `client/` to Vercel (`client/vercel.json` rewrites `/app/*` to `index.html`), set `VITE_API_URL=https://<api>.onrender.com/api` there, and add the Vercel URL to `CLIENT_URL` on Render (CORS) and to `APP_URL`.
- **Free-tier notes:** Render's free instances sleep after ~15 minutes of inactivity, so the first request can take 30–60 seconds (cold start). Uploaded files must go to Cloudinary because the server disk is wiped on every redeploy.

## Scaling further (concepts)

`npm run explain` shows why the indexes matter: the contact list query uses `list_by_created` (IXSCAN, examines only the matching contacts), while a forced collection scan (COLLSCAN) examines every document and needs an in-memory sort.

The app is a modular monolith: routes, services and repositories are already separated by feature (auth, contacts, interactions, lists, dashboard). To grow into **microservices**, each feature could become its own service with its own database; an **API gateway** (already included: `gateway/nginx.conf`) would then route `/api/contacts` and `/api/auth` to the right service, check JWTs once and apply rate limits, and **service discovery** (DNS in Docker Compose/Kubernetes, or a registry such as Consul) would let services find each other by name instead of fixed IP addresses — exactly how the API finds `mongo` and `redis` in `docker-compose.yml`.

## Syllabus mapping

| Unit | Where |
|---|---|
| 1. Web fundamentals | HTML/CSS/JS, DOM and events (`public/js/home.js`), Fetch/Axios, async/await, npm, Git (tags `ce-1`) |
| 2. Node.js core modules | `http` (server.js), `fs/promises` + `path` (logs, local uploads), `events` (activity.events.js), streams (CSV export), `crypto`, process signals |
| 3. Frontend & debugging | Tailwind, reusable UI components, ESLint, Winston/Morgan logging, error states |
| 4. Express & REST APIs | routing, middleware chain, validation, JWT, bcrypt, roles, Multer, Cloudinary, Postman |
| 5. MongoDB & Mongoose | `src/models`, `src/repositories`, indexes, aggregation, populate, middleware, virtuals, statics, error handling |
| 6. React | `client/src`: components, props, state, hooks, context, `useReducer`, custom hooks, React Router, Axios, Tailwind |
| 7. Full-stack integration | CORS, env vars (`VITE_API_URL`), Vite proxy, auth flow, protected routes, role-based UI, uploads with progress, filters/pagination in the URL, form validation |
| 8. Advanced backend & DevOps | Winston structured logging, Redis caching, Docker + Compose, GitHub Actions, Render deployment, env configuration |
