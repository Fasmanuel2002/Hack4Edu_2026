FROM node:22-slim AS site
WORKDIR /site
COPY site/package.json site/package-lock.json ./
RUN npm ci
COPY site ./
RUN npx ng build --configuration production

FROM python:3.13-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.10.9 /uv /uvx /usr/local/bin/

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-install-project

COPY main.py ./
COPY src ./src
COPY dataset_rag.csv ./
COPY --from=site /site/dist/site/browser ./site_dist

RUN uv sync --locked

ENV HOST=0.0.0.0 \
    PORT=8000 \
    PATH="/app/.venv/bin:${PATH}"

EXPOSE 8000

CMD ["uv", "run", "python", "main.py"]
