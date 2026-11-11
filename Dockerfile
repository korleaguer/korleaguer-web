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
# standalone 출력의 node_modules(실행에 필요한 것만 추린 의존성)는 따로 떼어 둔다. 실행 단계에서 따로 복사하면
# 의존성이 그대로인 배포에서는 그 레이어가 이전과 같아(캐시) 서버가 다시 받지 않는다(앱 코드 레이어만 받는다).
RUN npm run build \
    && mv .next/standalone/node_modules /app/standalone-node-modules

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
# 의존성(자주 안 바뀜) → 앱 코드(배포마다 바뀜) 순서로 담는다.
# standalone server.js는 .next/static을 직접 복사해 줘야 내보낸다(public 폴더는 지금 없다).
COPY --from=build --chown=node:node /app/standalone-node-modules ./node_modules
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
# 뜨는 중(시작 유예 20초)에는 1초마다 확인해 뜨자마자 healthy가 되게 한다(Docker 25+). 그 뒤로는 10초마다.
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --start-interval=1s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
