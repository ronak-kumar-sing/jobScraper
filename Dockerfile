FROM node:20-slim

# Install system dependencies required for Chromium
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libnss3 \
    libatk-bridge2.0-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    libglib2.0-0 \
    libgconf-2-4 \
    libasound2 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package manifests
COPY scraper/package*.json ./scraper/
COPY frontend/package*.json ./frontend/

# Install scraper dependencies
WORKDIR /app/scraper
RUN npm ci

# Install Playwright Chromium with browser binaries
RUN npx playwright install chromium --with-deps

# Copy rest of application source
WORKDIR /app
COPY . .

# Build frontend and copy to scraper/public
WORKDIR /app/frontend
RUN npm ci && npm run build && cp -r dist/* ../scraper/public/

# Build scraper TypeScript
WORKDIR /app/scraper
RUN npm run build

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["npm", "start"]
