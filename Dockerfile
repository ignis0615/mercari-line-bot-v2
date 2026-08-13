# Playwright(Chromium)の実行に必要なOS依存ライブラリを含む公式イメージを使用。
# npm の "playwright" のバージョンとタグを必ず一致させること(不一致だとブラウザが見つからず起動に失敗する)。
FROM mcr.microsoft.com/playwright:v1.61.1-noble

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]
