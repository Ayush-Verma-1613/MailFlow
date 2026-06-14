# Worker image. Build from the REPO ROOT:
#   docker build -f apps/worker/Dockerfile -t mailflow-worker .
FROM node:22-slim

RUN corepack enable
WORKDIR /app

# Workspace manifests first for better layer caching.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages ./packages
COPY apps/worker ./apps/worker

# Install only what the worker graph needs.
RUN pnpm install --frozen-lockfile --filter @mailflow/worker...

ENV NODE_ENV=production
ENV HEALTH_PORT=8080
EXPOSE 8080

# tsx runs the TypeScript worker directly (no build step for internal packages).
CMD ["pnpm", "--filter", "@mailflow/worker", "start"]
