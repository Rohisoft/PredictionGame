# Dev-oriented image: runs the Vite dev server with hot reload via a bind
# mount in docker-compose.yml, so it behaves like `npm run dev` but with a
# consistent Node version regardless of the host machine.
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 5173

# --host so Vite listens on all interfaces inside the container — without
# this it binds to localhost *inside* the container and is unreachable from
# the host machine's browser.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
