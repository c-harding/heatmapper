FROM node:20

RUN yarn global add pm2

COPY package.json yarn.lock /usr/src/app/dist/
COPY server/package.json /usr/src/app/dist/server/
COPY shared/package.json /usr/src/app/dist/shared/

WORKDIR /usr/src/app/dist/server

RUN yarn --prod --frozen-lockfile

COPY . /usr/src/app/dist/

CMD ["pm2-runtime","app.js"]
