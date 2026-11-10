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
# 배포한 커밋(배포 워크플로가 넘긴다). /healthz가 "ok 1a2b3c4"처럼 돌려줘 배포 뒤 그 커밋이 나오는지 바깥에서 확인한다.
# 지금 /healthz는 빌드할 때 정적으로 만들어져 이 빌드 단계 값이 박힌다(실행 단계 값은 쓰이지 않는다).
ARG APP_COMMIT=dev
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_TEAM_LOGOS=${NEXT_PUBLIC_TEAM_LOGOS} \
    APP_COMMIT=${APP_COMMIT}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS run
WORKDIR /app
# 실행 단계에도 같은 커밋을 넣어 둔다. /healthz가 나중에 요청마다 만드는 라우트로 바뀌어도 'ok dev'가 아니라
# 배포한 커밋을 주게 하려는 것이다(그러지 않으면 배포 뒤 바깥 확인이 실패한다).
ARG APP_COMMIT=dev
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    APP_COMMIT=${APP_COMMIT}
# standalone server.js는 .next/static을 직접 복사해 줘야 내보낸다(public 폴더는 지금 없다).
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
