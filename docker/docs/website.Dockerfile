FROM node:24-bookworm AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app

# Public search config is compiled into the client bundle.
ARG NEXT_PUBLIC_SEARCH_API_URL=http://localhost:7700
ARG NEXT_PUBLIC_SEARCH_API_KEY=localdevkey
ENV NEXT_PUBLIC_SEARCH_API_URL=${NEXT_PUBLIC_SEARCH_API_URL}
ENV NEXT_PUBLIC_SEARCH_API_KEY=${NEXT_PUBLIC_SEARCH_API_KEY}

COPY . .

RUN pnpm install --frozen-lockfile --filter @discord.self/website...
RUN pnpm --filter @discord.self/website build:next

FROM node:24-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

# Public search config is compiled into the client bundle.
ARG NEXT_PUBLIC_SEARCH_API_URL=http://localhost:7700
ARG NEXT_PUBLIC_SEARCH_API_KEY=localdevkey
ENV NEXT_PUBLIC_SEARCH_API_URL=${NEXT_PUBLIC_SEARCH_API_URL}
ENV NEXT_PUBLIC_SEARCH_API_KEY=${NEXT_PUBLIC_SEARCH_API_KEY}

COPY --from=builder /app/apps/website/public ./apps/website/public
COPY --from=builder /app/apps/website/.next/standalone ./
COPY --from=builder /app/apps/website/.next/server ./apps/website/.next/server
COPY --from=builder /app/apps/website/.next/static ./apps/website/.next/static

EXPOSE 3000

CMD ["node", "apps/website/server.js"]
