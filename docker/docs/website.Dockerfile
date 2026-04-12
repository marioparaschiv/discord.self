FROM node:24-bookworm AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app

# Public search config is compiled into the client bundle.
ARG NEXT_PUBLIC_SEARCH_API_URL=http://localhost:7700
ARG NEXT_PUBLIC_SEARCH_API_KEY=localdevkey
ARG GUIDE_REDIRECT_URL=https://discordjs.guide
ARG GUIDE_BASE_PATH=/guide
ENV NEXT_PUBLIC_SEARCH_API_URL=${NEXT_PUBLIC_SEARCH_API_URL}
ENV NEXT_PUBLIC_SEARCH_API_KEY=${NEXT_PUBLIC_SEARCH_API_KEY}
ENV GUIDE_REDIRECT_URL=${GUIDE_REDIRECT_URL}
ENV GUIDE_BASE_PATH=${GUIDE_BASE_PATH}

COPY . .

RUN pnpm install --frozen-lockfile --filter @discord.self/website... --filter @discord.self/guide...
RUN pnpm --filter @discord.self/guide build:next
RUN pnpm --filter @discord.self/website build:next

FROM node:24-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

# Public search config is compiled into the client bundle.
ARG NEXT_PUBLIC_SEARCH_API_URL=http://localhost:7700
ARG NEXT_PUBLIC_SEARCH_API_KEY=localdevkey
ARG GUIDE_REDIRECT_URL=https://discordjs.guide
ARG GUIDE_BASE_PATH=/guide
ENV NEXT_PUBLIC_SEARCH_API_URL=${NEXT_PUBLIC_SEARCH_API_URL}
ENV NEXT_PUBLIC_SEARCH_API_KEY=${NEXT_PUBLIC_SEARCH_API_KEY}
ENV GUIDE_REDIRECT_URL=${GUIDE_REDIRECT_URL}
ENV GUIDE_BASE_PATH=${GUIDE_BASE_PATH}
ENV WEBSITE_INTERNAL_PORT=3000
ENV GUIDE_INTERNAL_PORT=3001

COPY --from=builder /app/apps/website/public ./apps/website/public
COPY --from=builder /app/apps/guide/public ./apps/guide/public
COPY --from=builder /app/apps/website/.next/standalone ./
COPY --from=builder /app/apps/guide/.next/standalone ./
COPY --from=builder /app/apps/website/.next/server ./apps/website/.next/server
COPY --from=builder /app/apps/website/.next/static ./apps/website/.next/static
COPY --from=builder /app/apps/guide/.next/server ./apps/guide/.next/server
COPY --from=builder /app/apps/guide/.next/static ./apps/guide/.next/static
COPY --from=builder /app/docker/docs/start-docs.sh ./start-docs.sh

EXPOSE 3000
EXPOSE 3001

CMD ["bash", "/app/start-docs.sh"]
