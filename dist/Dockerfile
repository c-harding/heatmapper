FROM node:26

RUN npm install -g corepack pm2
RUN corepack enable

WORKDIR /usr/src/app/dist

# Copy the manifests first so this layer caches, then install only what the server needs.
# Every workspace's package.json must be present for Berry to resolve the workspace graph
# against the lockfile, but "workspaces focus --production" installs just the server workspace
# (and the shared workspace it depends on), not the client's build toolchain.
COPY package.json yarn.lock .yarnrc.yml ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN yarn workspaces focus @strava-heatmapper/server --production

COPY . ./

WORKDIR /usr/src/app/dist/server

ENV NODE_ENV=production

CMD ["pm2-runtime","app.js"]
