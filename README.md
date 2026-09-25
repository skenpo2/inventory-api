# inventory-api

Simple inventory management API. Express 5 + TypeScript + Prisma 7 + Postgres. No auth.

## Setup

```bash
npm install
npx prisma migrate dev     # applies migrations to the DB in .env
npm run seed               # loads 10 sample products
npm run dev                # tsx watch, http://localhost:5000
```

`.env` points at the local Docker Postgres:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/inventory
PORT=5000
```

## Scripts

| script          | what it does                  |
| --------------- | ----------------------------- |
| `npm run dev`   | watch mode via tsx            |
| `npm run build` | compile to `dist/`            |
| `npm start`     | run the compiled build        |
| `npm run seed`  | reset + load sample products  |

## Model

One `Product` model — everything a stocked item needs:

| field       | type      | notes                    |
| ----------- | --------- | ------------------------ |
| `id`        | Int       | autoincrement            |
| `sku`       | String    | unique                   |
| `name`      | String    |                          |
| `quantity`  | Int       | defaults to `0`          |
| `price`     | Decimal   | `10,2`, JSON as a string |
| `createdAt` | DateTime  | set on insert            |
| `updatedAt` | DateTime  | touched on every update  |

## Auth

`POST /auth/login` accepts one hard-coded account:

```
root@admin.com / rootpass
```

It returns `{ token, user }` on success and `401` otherwise. Nothing verifies the
token afterwards — the products routes stay open. The frontend guards its
dashboard route with it, which is a UX guard, not security; real protection would
need middleware on these routes.

## Endpoints

| method   | path            | body                              | success |
| -------- | --------------- | --------------------------------- | ------- |
| `GET`    | `/health`       | —                                 | 200     |
| `POST`   | `/auth/login`   | `email`, `password`               | 200     |
| `GET`    | `/products`     | —                                 | 200     |
| `GET`    | `/products/:id` | —                                 | 200     |
| `POST`   | `/products`     | `sku`, `name`, `price`, `quantity?` | 201   |
| `PATCH`  | `/products/:id` | any subset of the four fields     | 200     |
| `DELETE` | `/products/:id` | —                                 | 204     |

`PATCH` only writes the fields present in the body, so a restock can send just
`{"quantity": 7}` without clearing the rest of the row.

### Examples

```bash
curl -X POST http://localhost:5000/products \
  -H 'Content-Type: application/json' \
  -d '{"sku":"KEY-001","name":"Mechanical Keyboard","quantity":12,"price":89.99}'

curl http://localhost:5000/products
curl http://localhost:5000/products/1

curl -X PATCH http://localhost:5000/products/1 \
  -H 'Content-Type: application/json' -d '{"quantity":7}'

curl -X DELETE http://localhost:5000/products/1
```

## Errors

All errors come back as `{ "error": "..." }`:

| status | when                                       |
| ------ | ------------------------------------------ |
| 400    | non-numeric `:id`, or missing create field |
| 404    | no product with that id                    |
| 409    | `sku` already taken                        |
| 500    | anything unexpected                        |

## Seed data

`npm run seed` clears the table and inserts 10 products (`prisma/seed.ts`). It
deletes first, so it is safe to re-run. The spread is deliberate: healthy stock,
a few low-stock rows (`STD-009` at 3, `MON-004` at 6), and one at zero
(`CHR-010`) so out-of-stock cases have something to hit.

Note that `price` is a `Decimal`, and JSON serialization drops trailing zeros —
`24.50` in Postgres comes back as `"24.5"`. Format for display on the client.

## Layout

```
server.ts                  entry point
prisma/schema.prisma       Product model
prisma/seed.ts             sample data
prisma.config.ts           Prisma 7 config (schema + datasource)
src/app.ts                 express app, routes, error middleware
src/prisma.ts              shared PrismaClient (pg driver adapter)
src/lib/http.ts            HttpError, async handle(), parseId()
src/routes/                products.routes.ts
src/controllers/           products.controller.ts
```
