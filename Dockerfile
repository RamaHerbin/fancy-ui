# Self-hosted image of the documentation site (fancy-ui.rama.app).
#
# Not part of any published package: the npm packages are built by
# `pnpm package` and never see this file. The site is built with the Node
# adapter (FANCY_ADAPTER=node, see svelte.config.js) and started through
# server/self-host.mjs, which adds the response headers of vercel.json.
#
#   docker build -t fancy-ui-site .
#   docker run --rm -p 3000:3000 -e ORIGIN=http://localhost:3000 fancy-ui-site

FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.5.1 --activate
ENV CI=1

# Manifests first, so the install layer is reused until a dependency changes.
# Only the root package is installed: the site reads the React and Vue sources
# as text, it does not import their dependencies.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --filter fancy-ui-svelte --ignore-scripts

COPY . .
ENV FANCY_ADAPTER=node VITE_SELF_HOST=1 NODE_OPTIONS=--max-old-space-size=6144
RUN pnpm exec svelte-kit sync && pnpm build

# The Node adapter bundles devDependencies and leaves `dependencies` external.
RUN rm -rf node_modules && pnpm install --prod --frozen-lockfile --filter fancy-ui-svelte --ignore-scripts

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /app/package.json /app/vercel.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/server ./server
USER node
EXPOSE 3000
CMD ["node", "server/self-host.mjs"]
