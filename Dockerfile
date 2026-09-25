# A Dockerfile is a recipe. Each line is one step, run top to bottom,
# and the result is an IMAGE: a snapshot of our app plus everything it needs.

# 1. Start from an image that already has Node.js installed.
FROM node:22-alpine

# 2. Every command after this runs inside /app in the container.
WORKDIR /app

# 3. Copy only the package files first, then install dependencies.
#    Docker caches each step, so if package.json hasn't changed,
#    the next build skips `npm install` and is much faster.
COPY package.json package-lock.json ./
RUN npm install

# 4. Now copy the rest of our source code.
#    (.dockerignore stops node_modules, dist and .env from being copied.)
COPY . .

# 5. Generate the Prisma client, then compile TypeScript into dist/.
RUN npx prisma generate
RUN npm run build

# 6. Document the port the app listens on.
EXPOSE 5000

# 7. What runs when the container STARTS (not when the image is built).
#    First apply migrations (the database only exists at run time),
#    then start the compiled server.
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
