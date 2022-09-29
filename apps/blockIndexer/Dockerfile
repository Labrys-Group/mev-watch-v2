# TODO: This is deprecated as I've modified this to just be a node script
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

# switch to non-root user
USER node

# add healthcheck
HEALTHCHECK CMD curl --fail http://localhost:3000 || exit 1   

# expose port 3000
EXPOSE 3000

CMD PORT=3000 npx turbo run start --scope=server

