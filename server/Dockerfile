# Dev-oriented image: runs the API with tsx (ts-node-like) + hot reload via
# a bind mount in docker-compose.yml, so it behaves like `npm run dev` but
# with a consistent Node version regardless of the host machine.
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 4000

CMD ["npm", "run", "dev"]
