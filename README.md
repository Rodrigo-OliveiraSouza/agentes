# IBGE Maps Platform (MVP)

Plataforma full-stack 100% TypeScript para visualização territorial no Google Maps com dados do IBGE.

## Arquitetura

### Camadas visuais do mapa

1. **Base map**: Google Maps JavaScript API.
2. **Camada IBGE**: GeoJSON de malhas IBGE (região/UF/município).
3. **Camada gráfico-mapa**:
   - `choropleth` (polígonos coloridos)
   - `bubbles` (círculos proporcionais)
   - `heatmap`
   - `clusters` (marcadores agrupados)

### Arquitetura lógica

- **Frontend SPA** (`apps/web`)
  - React + TypeScript + Zustand
  - Google Maps JS API + overlays
  - Chart.js para painel lateral
- **Backend serverless** (`apps/api`)
  - Cloudflare Workers + Hono
  - Proxy e normalização dos dados do IBGE
  - Cache em 3 níveis: Cloudflare Cache API -> Cloudflare KV (opcional) -> Neon Postgres
- **Persistência** (`Neon Postgres` + Prisma)
  - snapshots, geometrias, indicadores e cache de requisições

## Endpoints IBGE usados no MVP

### Territórios

- Regiões: `https://servicodados.ibge.gov.br/api/v1/localidades/regioes`
- UFs: `https://servicodados.ibge.gov.br/api/v1/localidades/estados`
- UFs por região: `https://servicodados.ibge.gov.br/api/v1/localidades/regioes/{regiao}/estados`
- Municípios por UF: `https://servicodados.ibge.gov.br/api/v1/localidades/estados/{uf}/municipios`

### Indicadores (MVP)

- População residente (Censo 2022):
  - agregado `10211`, variável `93`
  - `https://servicodados.ibge.gov.br/api/v3/agregados/10211/periodos/{ano}/variaveis/93?localidades=N3[all]&classificacao=1[6795]|2661[32776]`

### Malhas / GeoJSON

- Regiões do Brasil: `.../malhas/paises/BR?formato=application/vnd.geo+json&intrarregiao=regiao`
- UFs do Brasil: `.../malhas/paises/BR?formato=application/vnd.geo+json&intrarregiao=UF`
- Municípios por UF: `.../malhas/estados/{uf}?formato=application/vnd.geo+json&intrarregiao=municipio`

### Estratégia de transformação e normalização

- `codarea` da malha é normalizado para `code`.
- Códigos IBGE de UF/município são tratados como `string` para evitar perda de zeros.
- Join numérico + geometria é feito por código IBGE (`codarea` <-> `code`).
- Quando a malha está pesada, usamos:
  - `qualidade=minima` na API de malhas;
  - remoção de propriedades extras no payload simplificado;
  - cache serverless + Postgres.

## Rotas da API (Cloudflare Worker)

### `GET /api/territories?level=REGIAO|UF|MUNICIPIO&parentCode=`

Retorna territórios normalizados por nível.

### `GET /api/indicators`

Retorna catálogo de indicadores:
- Implementado: `population` (IBGE)
- Planejados: `gdp`, `demographic_density`, `idh` (fonte alternativa plugável), `crime_rate` (fonte alternativa plugável)

### `GET /api/data?indicator=population&level=...&code=...&year=...`

Retorna série territorial normalizada para o indicador.

### `GET /api/geojson?level=...&code=...&simplified=true`

Retorna GeoJSON com malhas para o nível solicitado.

## Estrutura de pastas

```txt
.
+- apps
¦  +- api
¦  ¦  +- src
¦  ¦  ¦  +- lib
¦  ¦  ¦  +- routes
¦  ¦  ¦  +- index.ts
¦  ¦  +- package.json
¦  ¦  +- wrangler.toml
¦  +- web
¦     +- src
¦     ¦  +- components
¦     ¦  +- lib
¦     ¦  +- store
¦     ¦  +- App.tsx
¦     +- package.json
¦     +- vite.config.ts
+- prisma
¦  +- schema.prisma
¦  +- migrations
+- .github/workflows/ci.yml
```

## Prisma (Neon/Postgres)

Modelos do schema:

- `Dataset`
- `Territory`
- `Indicator`
- `IndicatorValue`
- `Geometry`
- `CacheRequest`

Migração inicial em: `prisma/migrations/202602180001_init/migration.sql`.

## Segurança e chaves

- `VITE_GOOGLE_MAPS_API_KEY` deve ter restrição de domínio (HTTP referrer) no Google Cloud.
- `DATABASE_URL` fica como secret no Worker (`wrangler secret put DATABASE_URL`).
- Backend atua como intermediário para IBGE e cache.

## Variáveis de ambiente

Use `.env.example` como base.

### Frontend (`apps/web`)

- `VITE_API_BASE_URL` (ex.: `http://127.0.0.1:8787` no dev)
- `VITE_GOOGLE_MAPS_API_KEY`
- Arquivo local sugerido: `apps/web/.env.local`

### API (`apps/api` / Worker)

- `DATABASE_URL` (Neon)
- `CACHE_TTL_SECONDS` (default 600)
- `RATE_LIMIT_PER_MINUTE` (default 120)
- `CACHE_KV` (binding opcional)
- Arquivo local para `wrangler dev`: `apps/api/.dev.vars` (`apps/api/.dev.vars.example`)

## Rodar localmente

```bash
npm install
```

Preencha os arquivos de acesso local:

- `apps/web/.env.local`
- `apps/api/.dev.vars`

Terminal 1 (API):

```bash
npm run dev:api
```

Terminal 2 (Web):

```bash
npm run dev:web
```

## Deploy

### 1) GitHub + CI

- Workflow em `.github/workflows/ci.yml` executa `typecheck` e `build`.

### 2) API no Cloudflare Workers

No diretório `apps/api`:

```bash
wrangler login
wrangler secret put DATABASE_URL
wrangler deploy
```

### 3) Web no Cloudflare Pages

- Conecte o repositório no Cloudflare Pages.
- Build command: `npm run build -w @ibge-map/web`
- Build output: `apps/web/dist`
- Configure env `VITE_API_BASE_URL` para URL pública do Worker.

### 4) Banco no Neon

- Crie o projeto Neon.
- Rode migração Prisma apontando para o `DATABASE_URL`:

```bash
npm run prisma:migrate
```

## Cache e limites

- Edge Cache (Cloudflare Cache API)
- KV (opcional)
- Postgres (`cache_requests`) como fallback persistente
- Rate limit básico por IP no Worker

## Observações de MVP

- Indicador implementado no MVP: **População residente**.
- Demais indicadores entram via conectores plugáveis, mantendo o pipeline territorial do IBGE.

## Roadmap

1. Conector de PIB e densidade demográfica via SIDRA.
2. Conector de IDH (PNUD) e criminalidade (SENASP/IPEA) como plugins.
3. Pré-processamento de malhas em TopoJSON + simplificação adicional por zoom.
4. Snapshot scheduler (Cron Worker) para atualizar datasets a cada X dias.
5. Camadas avançadas (tile vector, WebGL, diffs temporais animados).

