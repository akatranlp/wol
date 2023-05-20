##### SERVER BUILDER #####
FROM node:alpine AS builderServer
RUN apk add --no-cache libc6-compat
RUN apk update

WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=wol-server --docker

##### SERVER INSTALLER #####
FROM node:alpine AS installerServer
RUN apk add --no-cache libc6-compat
RUN apk update
WORKDIR /app
RUN npm install -g turbo

COPY --from=builderServer /app/out/json/ .
COPY --from=builderServer /app/out/package-lock.json ./package-lock.json
RUN npm install

COPY --from=builderServer /app/out/full/ .
RUN turbo run build --filter=wol-server...

CMD npm run start -w=wol-server
