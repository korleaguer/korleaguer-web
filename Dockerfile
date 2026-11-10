# syntax=docker/dockerfile:1
# 코리거 웹 이미지. GitHub Actions(deploy.yml)가 만들어 GHCR에 올린다.
# next build의 standalone 출력(필요한 파일만 모은 server.js)을 Node 이미지에서 실행한다.
# API 주소는 실행할 때 API_BASE_URL로 준다(서버 컴포넌트가 서버 쪽에서만 부른다).

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM node:24-alpine AS build
WORKDIR /app
# NEXT_PUBLIC_ 값은 빌드할 때 코드에 박힌다. 팀 로고를 끄려면 off(배포 워크플로는 저장소 variable에서 넘긴다).
ARG NEXT_PUBLIC_TEAM_LOGOS=""
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_TEAM_LOGOS=${NEXT_PUBLIC_TEAM_LOGOS}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# standalone server.js는 .next/static을 직접 복사해 줘야 내보낸다(public 폴더는 지금 없다).
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
