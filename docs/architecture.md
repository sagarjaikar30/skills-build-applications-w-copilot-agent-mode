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

- Presentation tier decision: Keep the four route views (`/activities`, `/teams`, `/leaderboard`, and `/workouts`) in the Vite React app and make HTTP calls through `src/api/client.ts`. Each view owns its request state and renders a loading announcement (`role="status"`), useful empty state, successful data, or an accessible error announcement (`role="alert"`). Keep API response parsing and transport concerns in the client, not in presentational components.
- Logic tier decision: Keep Express handlers under `/api/` responsible for HTTP status codes and response envelopes; put validation, persistence orchestration, and business rules in `src/services/octofitService.ts`. Validate required input and ObjectId syntax before database operations, verify referenced records exist, and translate expected invalid input or missing users to 4xx responses. Do not expose Mongoose cast errors as 500 responses.
- Data tier decision: Make the Mongoose schemas the source of truth for required fields and defaults. Users require `name`, `email`, and `fitnessGoal`; teams require `name` and `mascot` and default `members` to an empty ObjectId array; activities require `user`, `team`, `type`, `minutes`, `points`, and `occurredAt`; workouts require `title`, `focus`, `minutes`, and `difficulty`. Keep user/team references as ObjectIds and serialize them consistently at the API boundary.
- Activity tracking approach: Accept `userId`, `teamId`, `type`, and `minutes`; resolve both IDs to existing records before creating an activity. Store the resolved IDs as `user` and `team`, compute a positive `points` value from the submitted minutes, and set `occurredAt` on the server. Invalid or missing input must not create a record.
- Team management approach: Require a non-empty `name` and `mascot`; accept an optional list of member IDs and default it to empty. Validate supplied member IDs and return the team name, mascot, and member IDs in both create and list responses.
- Leaderboard approach: Sum `Activity.points` by team, include the corresponding team name, order from highest total to lowest, and assign ranks starting at 1. Return entries as `{ teamName, totalPoints, rank }` under the `leaderboard` response key.
- Workout suggestions approach: Decode and match the route's email to a user. Infer a recommendation focus from that user's fitness goal or activity pattern, put matching workouts first, and include a human-readable `reason` for the first recommendation. The contract does not prescribe precedence when goal and activity suggest different focuses. Return a deliberate 4xx for an unknown email rather than an empty or successful result.
- **Seeding:** Upsert demo teams, users, activities, and workouts by stable identifiers so repeated runs do not duplicate them. Do not clear unrelated records. When a seeded user's team changes, remove that user's ID from the previous team's `members` before adding it to the new team.
- **Scope:** Keep MongoDB on `27017`, Express on `8000`, and Vite on `5173`; do not add authentication as part of this implementation.

## Test plan

Run checks in dependency order, repairing a tier before moving on:

1. **Data contract:** `npm run test:data --prefix octofit-tracker/backend`. Require all schema validation/default checks to pass, including the seed test's idempotency, preservation of unrelated records, and reconciliation of a user's prior team membership.
2. **API contract:** `npm run test:api --prefix octofit-tracker/backend`. Require valid activity/team creation and listing, deliberate 4xx responses for invalid input or unknown references/users, positive activity points and valid timestamps, a points-ordered leaderboard with 1-based ranks, and relevant workout suggestions with reasons. Team tests verify member IDs in the response; they do not require updating a member's `team` field. Workout fixtures currently align the user's goal and activity focus, so no conflict-precedence rule is tested.
3. **Presentation contract:** `npm test --prefix octofit-tracker/frontend`. Require each route to render API data and to expose loading, empty, and error states accessibly; verify the workout route requests suggestions for the expected user.
4. **Backend build:** `npm run build --prefix octofit-tracker/backend`. Run after the data and API contracts pass to catch TypeScript and route/service integration issues.
5. **Frontend build:** `npm run build --prefix octofit-tracker/frontend`. Run after the presentation contract passes to catch TypeScript and Vite build issues.

The starter baseline was checked with these commands: 4 of 5 data tests fail (the seed test passes), all 4 API tests fail, and all 15 presentation tests fail. Use the contract suites as the implementation gates; the baseline counts are informational and should no longer describe the result once the work is complete.
