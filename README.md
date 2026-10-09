# inventory-api

Multi-tenant inventory API with real auth. Express 5 + TypeScript + Prisma 7 + Postgres.

- email/password signup & login (bcrypt)
- "Continue with Google" (Passport, no sessions)
- short-lived JWT access token + rotating refresh token in an httpOnly cookie
- organizations, invitations and roles (`OWNER` / `ADMIN` / `MEMBER`)
- every protected route checks the caller's role **on the server**

## Setup

```bash
npm install
cp .env.example .env        # then set JWT_ACCESS_SECRET
npx prisma migrate dev      # creates the inventory_auth database + tables
npm run seed                # demo users, orgs and products
npm run dev                 # http://localhost:5000
```

Seeded accounts (password `password123`):

| email               | org      | role   |
| ------------------- | -------- | ------ |
| `owner@acme.test`   | Acme Inc | OWNER  |
| `admin@acme.test`   | Acme Inc | ADMIN  |
| `member@acme.test`  | Acme Inc | MEMBER |
| `owner@globex.test` | Globex   | OWNER  |

Globex exists so you can prove one tenant can't touch another's data.

## Authentication vs authorization

- **Authentication** — _who are you?_ `requireAuth` verifies the JWT and sets `req.userId`.
- **Authorization** — _what may you do here?_ `requireRole('ADMIN')` loads your
  membership in `:orgId` from the database and rejects you if your role is too low.

Both live in `src/middleware/auth.ts`. The whole permission table is one file,
`src/routes/orgs.routes.ts`:

```ts
orgsRouter.get('/:orgId/products', requireRole(Role.MEMBER), listProducts);
orgsRouter.post('/:orgId/products', requireRole(Role.ADMIN), createProduct);
orgsRouter.patch('/:orgId/members/:userId', requireRole(Role.OWNER), updateMemberRole);
```

Roles are **not** put in the JWT. They're read from the database on every
request, so promoting or removing someone takes effect immediately, without
waiting for their token to expire.

### Authorization at the data-access boundary

Checking the role isn't enough on its own. Every product query is also scoped to
the org the caller was authorized for:

```ts
prisma.product.update({ where: { id, orgId: req.membership.orgId }, data });
```

Without `orgId` in that `where`, an Acme admin could edit Globex product `9` by
calling `PATCH /api/orgs/1/products/9`. With it, Prisma finds nothing and returns 404.

Two more rules worth pointing out:

- Not a member of the org → **404**, not 403. Don't confirm the org exists.
- You can only invite into a role **below** your own (no privilege escalation).
  The owner can't be demoted or removed.

## Tokens

|                 | access token                     | refresh token                             |
| --------------- | -------------------------------- | ----------------------------------------- |
| what            | JWT signed with `JWT_ACCESS_SECRET` | 32 random bytes, opaque                |
| lifetime        | `ACCESS_TOKEN_TTL` (15m; `.env` uses 1m for class) | 7 days                  |
| client keeps it | in memory (JS variable)          | `httpOnly` cookie — JS can't read it      |
| server keeps it | nothing — it's stateless         | a **SHA-256 hash** in `RefreshToken`      |
| sent as         | `Authorization: Bearer …`        | cookie, automatically                     |
| revocable?      | no, it lives until it expires    | yes, delete the row                       |

That table is the sessions-vs-JWT trade-off in one place: the access token is
cheap to verify but can't be revoked, so it's kept short. The refresh token is a
database-backed session that **can** be revoked.

`src/lib/tokens.ts`:

- **Rotation** — every `/api/auth/refresh` marks the old refresh token used and issues a new one.
- **Reuse detection** — if a used token shows up again, assume it was stolen and
  delete every session for that user. A 10-second grace window allows for two
  tabs refreshing at the same moment.
- **Hashing** — a leaked database dump doesn't contain usable refresh tokens.
- **Logout** deletes the row. **Logout everywhere** deletes all of the user's rows.
  Other devices keep working until their access token expires — that's the
  trade-off from the table, and you can watch it happen.

## Google sign-in

1. In Google Cloud Console → APIs & Services → Credentials, open (or create) an
   OAuth client of type **Web application**.
2. Add the authorized redirect URI `http://localhost:5000/api/auth/google/callback`
   (and `http://localhost:3001/api/auth/google/callback` for Docker).
3. Put the client id and secret in `.env` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

The flow (`src/lib/passport.ts`, `src/routes/auth.routes.ts`):

```
browser ──GET /api/auth/google──────────▶ API ──302──▶ Google consent screen
Google ──GET /api/auth/google/callback?code─▶ API  (passport swaps code for profile)
API: find user by googleId → or by email (link) → or create user + workspace
API: set refresh cookie, 302 → CLIENT_URL/dashboard
app: boots, calls /api/auth/refresh with the cookie, gets an access token
```

No token is ever put in the URL. Passport runs with `session: false`; our own
refresh cookie is the session. Without Google credentials, the button sends you
back to `/login?error=google_disabled`.

## Endpoints

Everything except `/health` is mounted under `/api`.

| method   | path                              | who                 |
| -------- | --------------------------------- | ------------------- |
| `POST`   | `/auth/signup`                    | anyone              |
| `POST`   | `/auth/login`                     | anyone              |
| `POST`   | `/auth/refresh`                   | refresh cookie      |
| `POST`   | `/auth/logout`                    | refresh cookie      |
| `POST`   | `/auth/logout-all`                | signed in           |
| `GET`    | `/auth/google`, `/auth/google/callback` | anyone        |
| `GET`    | `/me`                             | signed in           |
| `GET`    | `/orgs/:orgId/products`           | MEMBER+             |
| `POST`   | `/orgs/:orgId/products`           | ADMIN+              |
| `PATCH`  | `/orgs/:orgId/products/:id`       | ADMIN+              |
| `DELETE` | `/orgs/:orgId/products/:id`       | ADMIN+              |
| `GET`    | `/orgs/:orgId/members`            | MEMBER+             |
| `PATCH`  | `/orgs/:orgId/members/:userId`    | OWNER               |
| `DELETE` | `/orgs/:orgId/members/:userId`    | OWNER               |
| `GET`    | `/orgs/:orgId/invites`            | ADMIN+              |
| `POST`   | `/orgs/:orgId/invites`            | ADMIN+              |
| `GET`    | `/invites/:token`                 | anyone (preview)    |
| `POST`   | `/invites/:token/accept`          | signed in, matching email |

Invites aren't emailed. The app shows a link to copy.

### Try it with curl

```bash
TOKEN=$(curl -s -X POST localhost:5000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"member@acme.test","password":"password123"}' | jq -r .accessToken)

curl localhost:5000/api/orgs/1/products -H "Authorization: Bearer $TOKEN"              # 200
curl -X DELETE localhost:5000/api/orgs/1/products/1 -H "Authorization: Bearer $TOKEN"  # 403
curl localhost:5000/api/orgs/2/products -H "Authorization: Bearer $TOKEN"              # 404
```

## Layout

```
prisma/schema.prisma        User, Organization, Membership, Invite, RefreshToken, Product
prisma/seed.ts              demo data
src/config.ts               env vars
src/app.ts                  middleware, routers, error handler
src/middleware/auth.ts      requireAuth, requireRole, roleRank
src/lib/tokens.ts           JWTs, refresh rotation, cookies
src/lib/passport.ts         Google strategy
src/lib/users.ts            create user + their first workspace
src/routes/                 auth, orgs (the permission table), invites
src/controllers/            auth, products, members, invites
```
