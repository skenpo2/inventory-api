# Running the Inventory API with Docker

Three files do all the work:

| file                 | what it is                                                    |
| -------------------- | ------------------------------------------------------------- |
| `Dockerfile`         | the recipe for building an **image** of our API               |
| `.dockerignore`      | files Docker should skip when copying our code in             |
| `docker-compose.yml` | runs the API **and** Postgres together, with one command      |

## Three words to know

- **Image**: a packaged snapshot of the app and everything it needs (Node, packages, compiled code). Think of it as a class.
- **Container**: a running copy of an image. Think of it as an object made from that class.
- **Volume**: storage that lives outside the container, so database data survives a restart.

## Part 1: just Docker (the API alone)

```bash
docker build -t inventory-api .     # build an image called "inventory-api"
docker images                       # see it in the list
```

On its own the API has no database to talk to. That's why we need Compose.

## Part 2: Docker Compose (API + Postgres)

```bash
docker compose up --build           # build the API image, start db + api
```

Then open http://localhost:5000/health. It should return `{"ok":true}`.

Useful commands (run these in a second terminal):

```bash
docker compose ps                                  # what's running?
docker compose logs api                            # the API's console output
docker compose exec api node dist/prisma/seed.js   # load the 10 sample products
docker compose exec db psql -U postgres -d inventory   # open psql inside the db container
docker compose down                                # stop and remove the containers
docker compose down -v                             # ...and delete the database data too
```

## What happens on `docker compose up`

1. Compose pulls `postgres:17-alpine` and starts the **db** container.
2. It builds our **api** image from the `Dockerfile`.
3. It waits until Postgres passes its healthcheck.
4. It starts the **api** container, which runs `prisma migrate deploy` and then `npm start`.

## Common gotchas

- **`localhost` inside a container means that container itself.** The API reaches Postgres at `db:5432`, using the service name, not `localhost`.
- **Port already in use?** Change the left side of `"5000:5000"` or `"5433:5432"`. The left side is your machine, the right side is the container.
- **Changed your code?** Run `docker compose up --build` again. The image is a snapshot and won't update by itself.
