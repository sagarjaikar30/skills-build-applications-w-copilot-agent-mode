# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Use the Vite React app in `octofit-tracker/frontend` as the UI shell, keep the shared API client in `src/api/client.ts`, and render route-level data with loading, empty, success, and error states that remain accessible to screen readers.
- Logic tier decision: Keep Express routes thin under `/api/`, move validation and business logic into TypeScript services in `octofit-tracker/backend/src`, and return deliberate 4xx responses so invalid IDs, missing fields, and unknown users never surface as cast errors or 500s.
- Data tier decision: Enforce required fields and defaults in Mongoose schemas, prefer idempotent seed upserts for demo records, and reconcile a seeded user's previous team membership when re-seeding to avoid duplicate or stale relationships.
- Activity tracking approach: Store a `user`, `team`, `type`, `minutes`, computed `points`, and `occurredAt` for each activity; reject missing or invalid references before persisting, and compute points from the validated minutes data.
- Team management approach: Require a team `name` and `mascot`, default `members` to an empty array, serialize member IDs consistently, and keep team membership in sync with the related user records.
- Leaderboard approach: Aggregate total points by team from the activity collection, sort descending by score, and assign a 1-based `rank` to each team in the result set.
- Workout suggestions approach: Match the requested user by email, infer focus from that user's recent activity or fitness goal, rank workouts by relevance, and include a short reason explaining the recommendation.

## Test plan

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend` — Fails because the Mongoose models do not yet enforce the required fields and defaults called for by the data contract. This is the first place to repair before the API layer can behave correctly.
- API command: `npm run test:api --prefix octofit-tracker/backend` — Fails because the API routes return `501`/empty responses instead of valid `400`/`201`/`200` behavior. The tests also show missing leaderboard aggregation and workout suggestion matching logic.
- Frontend command: `npm test --prefix octofit-tracker/frontend` — Fails because the presentation layer is not yet rendering the expected activity, team, leaderboard, and workout data, nor the designated loading/empty/error states.
- Backend build command: `npm run build --prefix octofit-tracker/backend` — Run after fixing the data and API contracts to catch TypeScript issues and invalid route/service wiring.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend` — Run after the UI is wired to the API client to catch build-time breakage and route/component contract issues.
