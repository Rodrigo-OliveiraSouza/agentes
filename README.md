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
- PIB a preços correntes (2002-2023):
  - agregado `5938`, variável `37`
  - `https://servicodados.ibge.gov.br/api/v3/agregados/5938/periodos/{ano}/variaveis/37?localidades=N3[all]`
- Área territorial e densidade demográfica (2010):
  - agregado `1301`, variáveis `615` (área) e `616` (densidade)
  - `https://servicodados.ibge.gov.br/api/v3/agregados/1301/periodos/2010/variaveis/615?localidades=N3[all]`

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
- Implementados: `population`, `gdp`, `demographic_density`, `territory_area` (IBGE)
- Planejados/plugáveis: `idh`, `crime_rate`

### `GET /api/data?indicator=...&level=...&code=...&year=...`

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
- `VITE_ADMIN_ACCESS_CODE` (codigo de acesso para `/dev/admin`)
- Arquivo local sugerido: `apps/web/.env.local`
- Em producao, nao use `127.0.0.1` ou `localhost` no Pages.
- Observacao: o codigo protege a UI do admin no frontend; autenticacao real deve ser feita no backend.

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

## Apresentacao e carrossel (Web)

- A capa do site fica antes do mapa, em `apps/web/src/components/PresentationSection.tsx`.
- Todas as imagens da pasta `apps/web/src/assets/carousel` entram automaticamente no carrossel.
- No `/dev/admin`, cada slide aceita imagem (URL/upload local) ou link de video do YouTube (o video fica no YouTube, sem upload no site).
- Logos e links do rodape ficam em `apps/web/src/components/SiteFooter.tsx`.

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
- O arquivo `apps/web/public/_redirects` ja encaminha `/api/*` e `/health` para a Worker publica.

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

- Indicadores ativos no mapa: populacao, PIB, densidade, area territorial, alfabetizacao, frequencia escolar, ensino superior completo, renda per capita derivada, gini, extrema pobreza, internet, agua, esgoto, lixo, energia, indice de envelhecimento, fecundidade, expectativa de vida, mortalidade infantil, homicidios, mortalidade no transito, pre-natal, atencao primaria e proxies de criminalidade/roubo.
- Alguns indicadores usam expansao territorial (UF ou Regiao para Municipio) quando a origem oficial nao publica serie municipal direta.

## Fontes de dados e conectores

- `IBGE API` (principal): `https://servicodados.ibge.gov.br/api/docs/`
- `Portal gov.br Conecta` (catálogo): `https://www.gov.br/conecta/catalogo/apis/api-portal-de-dados-abertos`
- `dados.gov.br` (datasets abertos): `https://dados.gov.br`
- `API Segurança Pública (terceiros)` (opcional): `https://github.com/rayonnunes/api_seguranca_publica`
- `Portais estaduais` (exemplo SP): `https://dadosabertos.sp.gov.br`
- `Atlas da Violência (IPEA)` (homicídios): `https://www.ipea.gov.br/atlasviolencia/`
- `DataViva` (socioeconômico): `https://dataviva.info`
- `BrasilAPI` (territorial auxiliar): `https://brasilapi.com.br`

## Roadmap

1. Expandir conectores com série histórica adicional (mais variáveis SIDRA/IBGE).
2. Conector de IDH (PNUD) e criminalidade (SENASP/IPEA) como plugins.
3. Pré-processamento de malhas em TopoJSON + simplificação adicional por zoom.
4. Snapshot scheduler (Cron Worker) para atualizar datasets a cada X dias.
5. Camadas avançadas (tile vector, WebGL, diffs temporais animados).


