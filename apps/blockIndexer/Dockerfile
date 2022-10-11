ARG DOTENV_ME

# install stage
FROM node:lts-alpine as builder

# set the working directory
WORKDIR /app

# copy the JSON files
COPY out/json .

# copy the yarn lock
COPY out/yarn.lock .

# install the packages
RUN yarn install

# copy the rest of the package over
COPY out/full .

# build the app
RUN npx turbo run build --scope=server --include-dependencies --no-deps

# pull env
RUN cd ./apps/blockIndexer && npx --yes dotenv-vault@latest pull --dotenvMe $DOTENV_ME && cd ../..

# switch to non-root user
USER node


# run server
CMD npx turbo run start --scope=server