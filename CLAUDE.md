# CLAUDE.md - ORBITAL ROXA CS2 Platform

## Contexto do Projeto
Plataforma completa de gerenciamento de campeonatos CS2 com stats em tempo real, highlights automáticos e integração Faceit.

### Ecossistema
- **MatchZy** — Plugin CounterStrikeSharp (C#) no servidor CS2
- **G5API** — Backend REST API (Node.js/Express/TypeScript, MariaDB, Redis) no Railway
- **ORBITAL ROXA** — Frontend + Proxy (Next.js 15, Tailwind CSS v4, Framer Motion) em `orbital-cs2/`
- **Highlights Pipeline** — Python (demoparser2, CSDM, FFmpeg, Pillow) em `orbital-cs2/highlights/`
- **Brand Command Center** — Marketing com IA (Claude Haiku) em `orbital-cs2/src/app/admin/brand/`

## Documentação
- **Documentação técnica completa**: [orbital-cs2/DOCS.md](orbital-cs2/DOCS.md)
- **Briefing da marca**: [orbital-cs2/BRAND_BRIEFING.md](orbital-cs2/BRAND_BRIEFING.md)
- **Estudo dos projetos base**: [matchzy-g5v-g5api.md](matchzy-g5v-g5api.md)

## Arquitetura

```
Usuário → Vercel (Next.js 15)
            ├── SSR pages (homepage, partidas, leaderboard, perfil)
            ├── CSR pages (campeonatos, admin, brand)
            ├── /api/* routes próprias (tournaments, faceit, brand, highlights)
            ├── /api/* proxy rewrite → G5API (Railway)
            └── /write-proxy/* → G5API (cookie forwarding manual)

G5API (Railway) ← RCON → CS2 Server (MatchZy)
    ↑ POST /v2 events
    ↓ SSE streams → Frontend (partidas ao vivo)

Storage:
  MySQL Railway    — G5API tables + tournament + faceit_match + brand_* + highlight_clips
  Cloudflare R2    — 45 highlight videos (4.1GB)
  Vercel Blob      — Team logos
```

## Pontos Críticos

### Comunicação Frontend ↔ Backend
- **Leitura GET server-side**: Server Components chamam G5API direto (URL Railway)
- **Leitura GET client-side**: `/api/*` → Next.js rewrite fallback → G5API
- **Escrita POST/PUT/DELETE**: `/write-proxy/*` → Route Handler repassa cookie → G5API
- **SSE tempo real**: `/api/matches/:id/stream` → rewrite → G5API SSE
- **Payload de escrita**: SEMPRE array `[{dados}]` — G5API lê `req.body[0]`

### Cookie de sessão
- Nome: `G5API` (não `connect.sid`)
- Setado no domínio do frontend via proxy OAuth
- `APIURL` do G5API DEVE apontar para URL do Next.js + `/api`

### Autenticação (3 níveis)
1. **checkAdmin completo** — valida cookie contra G5API `/isloggedin` + checa role admin (usado em brand/*, tournaments POST/PUT/DELETE)
2. **Cookie existence** — verifica se cookie `G5API` existe (usado em faceit/match POST, upload, team-logo)
3. **Sem auth** — endpoints públicos (GET matches, highlights, steam avatar)
4. **Middleware** — protege `/admin/*` server-side com timeout 5s (fail-secure)

### Sistema de Torneios
- Estado completo serializado como JSON na tabela `tournament` (MySQL)
- **Double Elimination**: fixo 8 times, 15 matches, `advanceBracket()` propaga winner/loser
- **Swiss System**: 8-16 times, rounds dinâmicos, Buchholz tiebreaker, BO3 em rounds decisivos
- **Modos**: `presencial` (G5API + MatchZy) ou `online` (Faceit + webhook auto-advance)
- `autoAdvanceTournament()` polling detecta partida finalizada e avança bracket

### Integração Faceit
- **4 arquivos**: faceit.ts (client) → faceit-mapper.ts (transform) → faceit-sync.ts (orchestration) → faceit-db.ts (persistência)
- **Webhook**: `POST /api/faceit/webhook` recebe match_status_ready/finished/cancelled/demo_ready
- **Sync**: busca stats → mapeia jogadores via Steam ID (threshold 3+ overlap) → cria match + stats no G5API
- **Fallback**: `getFaceitChampionship` usa API interna `api.faceit.com` se Data API retornar 404
- **KAST**: Faceit não fornece — estimado como `(K+A+Survived)/Rounds`

### Highlights Pipeline
```
parse_all.py → record.py → postprocess.py → upload para Cloudflare R2
  demoparser2    CSDM/HLAE    FFmpeg+Pillow     @aws-sdk/client-s3
  (top 3 clips)  (gravação)   (HUD overlay)     (bucket: orbitalroxa)
```
- Scoring: kills × multiplicadores (HS=1.5, smoke=1.3, wallbang=1.5, etc)
- HUD: barra animada com avatar, time logo, kills/assists/headshots (Orbitron + JetBrains Mono)
- R2 public URL: `https://pub-894e2fa8c7684e2095cedd60a72f4536.r2.dev`

### Brand Command Center
- 5 páginas: dashboard, cronograma, Instagram, patrocínios, assistente IA
- IA (Claude Haiku) integrada nas abas — não é chat, é motor de ações (gerar caption, prompt imagem, buscar sponsors)
- Prompt inclui briefing completo da marca (BRAND_BRIEFING.md) com limitações reais
- Dados em MySQL: brand_tasks, brand_checklist, brand_sponsors, brand_posts, brand_notes, brand_ai_reports

## Convenções
- Linguagem do projeto: **Português (BR)**
- Manter compatibilidade com API existente do G5API
- Eventos do MatchZy seguem formato Get5
- Steam64 IDs para identificação de jogadores
- Fontes: Orbitron (headings), JetBrains Mono (dados), Inter (body)
- Estilo: sci-fi/cyberpunk gamer HUD, fundo preto `#0A0A0A`, purple accent `#A855F7`
- Todos os POST/PUT/DELETE ao G5API usam payload array: `[{dados}]`

## Variáveis de Ambiente (Vercel)
```
NEXT_PUBLIC_G5API_URL    — URL G5API Railway
DATABASE_URL             — MySQL Railway connection string
STEAM_API_KEY            — Steam Web API
FACEIT_API_KEY           — Faceit Data API v4
FACEIT_WEBHOOK_SECRET    — Secret webhook Faceit
ANTHROPIC_API_KEY        — Claude API (Haiku)
R2_PUBLIC_URL            — Cloudflare R2 public URL
BLOB_READ_WRITE_TOKEN    — Vercel Blob Storage
HIGHLIGHTS_API_KEY       — Key para trigger highlights
```

## Variáveis de Ambiente (Railway G5API)
```
HOSTNAME / APIURL        — URL proxy Next.js + /api (NÃO a URL direta do Railway)
CLIENTHOME               — URL raiz do frontend
```

## Deploy
- **Frontend**: Vercel → www.orbitalroxa.com.br (auto-deploy on push to master)
- **Backend**: Railway → g5api-production-998f.up.railway.app
- **Highlights**: Cloudflare R2 bucket `orbitalroxa`
- **Logos**: Vercel Blob Storage
