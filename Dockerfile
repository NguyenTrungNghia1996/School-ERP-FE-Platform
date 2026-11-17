# Stage 1: Build source code
FROM node:22-alpine AS nodebuilder

WORKDIR /app

# 1. Copy dependency files first for layer caching
COPY package.json yarn.lock ./

# 2. Install dependencies
RUN yarn install --frozen-lockfile

# 3. Copy application source code
COPY . .

# 4. Build Nuxt 4 production bundle
RUN yarn build

# Stage 2: Production runtime image
FROM node:22-alpine AS bin

WORKDIR /app

# Build metadata (can be overridden by build args)
ARG BUILD_TAG=dev
ARG BUILD_SHA=dev
ARG BUILD_TIME

# Expose build metadata & runtime environment to container
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NUXT_PUBLIC_BUILD_TAG=$BUILD_TAG \
    NUXT_PUBLIC_BUILD_SHA=$BUILD_SHA \
    NUXT_PUBLIC_BUILD_TIME=$BUILD_TIME

# Copy standalone output from builder stage
COPY --from=nodebuilder /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
