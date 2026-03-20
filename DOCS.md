# ORBITAL ROXA — Documentação Técnica Completa

> Sistema de gerenciamento de campeonatos CS2 com stats em tempo real, highlights automáticos e integração Faceit.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura](#2-arquitetura)
3. [Stack Tecnológica](#3-stack-tecnológica)
4. [Estrutura do Projeto](#4-estrutura-do-projeto)
5. [Fluxos de Dados](#5-fluxos-de-dados)
6. [Autenticação](#6-autenticação)
7. [Páginas Públicas](#7-páginas-públicas)
8. [Painel Admin](#8-painel-admin)
9. [Sistema de Torneios](#9-sistema-de-torneios)
10. [Integração Faceit](#10-integração-faceit)
11. [Highlights Pipeline](#11-highlights-pipeline)
12. [Brand Command Center](#12-brand-command-center)
13. [API Routes](#13-api-routes)
14. [Componentes](#14-componentes)
15. [Banco de Dados](#15-banco-de-dados)
16. [Deploy e Infraestrutura](#16-deploy-e-infraestrutura)
17. [Variáveis de Ambiente](#17-variáveis-de-ambiente)
18. [Desenvolvimento Local](#18-desenvolvimento-local)

---

## 1. Visão Geral

O ORBITAL ROXA é uma plataforma completa para organizar campeonatos de CS2, composta por:

- **Frontend/Proxy** — Next.js 15 (App Router) hospedado na Vercel
- **Backend API** — G5API (Express/TypeScript) hospedado no Railway
- **Servidor CS2** — MatchZy plugin (CounterStrikeSharp) em servidor dedicado
- **Highlights** — Pipeline Python automatizada (demoparser2 + CSDM + FFmpeg)
- **Brand/Marketing** — Command center com IA (Claude Haiku)

### O que o sistema faz

1. **Organiza campeonatos** — Brackets Double Elimination e Swiss System
2. **Transmite partidas ao vivo** — SSE (Server-Sent Events) com scoreboard em tempo real
3. **Coleta estatísticas** — K/D/A, ADR, HS%, KAST, rating, clutches, entries
4. **Gera highlights** — Parsing de demos, gravação via CSDM, pós-processamento com HUD overlay
5. **Integra com Faceit** — Campeonatos online com anti-cheat, importação de stats e demos
6. **Gestão de marca** — Cronograma, calendário Instagram, pipeline de patrocínios, assistente IA

---

## 2. Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUÁRIO                                 │
└─────────────┬───────────────────────────────┬───────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌──────────────────────────────┐
│    VERCEL (Next.js)     │     │     CLOUDFLARE R2            │
│                         │     │  Highlight videos (4.1GB)    │
│  ┌───────────────────┐  │     └──────────────────────────────┘
│  │ Páginas SSR/CSR   │  │
│  │ (React, Tailwind) │  │     ┌──────────────────────────────┐
│  └───────────────────┘  │     │     VERCEL BLOB              │
│                         │     │  Team logos                   │
│  ┌───────────────────┐  │     └──────────────────────────────┘
│  │ API Routes        │  │
│  │ /api/tournaments  │──┼──┐
│  │ /api/faceit/*     │  │  │  ┌──────────────────────────────┐
│  │ /api/brand/*      │──┼──┼─▶│     MYSQL (Railway)          │
│  │ /api/highlights/* │  │  │  │  tournament, faceit_match,   │
│  └───────────────────┘  │  │  │  brand_*, highlight_clips    │
│                         │  │  │  + G5API tables (match,      │
│  ┌───────────────────┐  │  │  │  team, player_stats, etc)    │
│  │ Proxy Rewrite     │──┼──┼──└──────────────────────────────┘
│  │ /api/* → G5API    │  │  │
│  │ /write-proxy/*    │──┼──┼──┐
│  └───────────────────┘  │  │  │
└─────────────────────────┘  │  │
                             │  ▼
              ┌──────────────┴───────────────┐
              │     G5API (Railway)           │
              │  Express + MariaDB + Redis   │
              │                              │
              │  /matches, /teams, /servers  │
              │  /playerstats, /mapstats     │
              │  /leaderboard, /seasons      │
              │  /auth/steam (OAuth)         │
              │  /v2 (MatchZy events)        │
              │  SSE streams                 │
              └──────────────┬───────────────┘
                             │ RCON
                             ▼
              ┌──────────────────────────────┐
              │  CS2 Server (MatchZy)        │
              │  Plugin CounterStrikeSharp   │
              │  POST /v2 events → G5API     │
              │  Demo recording              │
              └──────────────────────────────┘
```

### Comunicação Frontend ↔ Backend

O Next.js funciona como **proxy** entre o browser e o G5API:

| Operação | Caminho | Por quê |
|----------|---------|---------|
| **Leitura (GET) server-side** | Server Component → G5API direto (URL Railway) | Performance, sem proxy overhead |
| **Leitura (GET) client-side** | Browser → `/api/*` → Next.js rewrite → G5API | Proxy transparente |
| **Escrita (POST/PUT/DELETE)** | Browser → `/write-proxy/*` → Route Handler → G5API | Rewrite do Next.js não repassa cookies em POST |
| **SSE (tempo real)** | Browser → `/api/matches/:id/stream` → rewrite → G5API SSE | Eventos de partida ao vivo |

**Detalhe crítico:** Todo payload de escrita ao G5API deve ser array: `[{dados}]`. O G5API lê `req.body[0]`.

---

## 3. Stack Tecnológica

### Frontend
| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| Next.js | 15 (App Router) | Framework React SSR/CSR |
| React | 19 | UI |
| Tailwind CSS | v4 | Estilização |
| Framer Motion | 12 | Animações |
| TypeScript | 5 | Tipagem |
| Lucide React | — | Ícones |

### Backend (G5API)
| Tecnologia | Uso |
|-----------|-----|
| Node.js + Express | REST API |
| MariaDB | Banco principal |
| Redis | Sessões + cache |
| Passport-Steam | Autenticação OAuth |

### Infraestrutura
| Serviço | Uso | Custo |
|---------|-----|-------|
| Vercel | Frontend hosting | Free tier |
| Railway | G5API + MySQL + Redis | ~$5-11/mês |
| Cloudflare R2 | Highlight videos (4.1GB) | 10GB free |
| Vercel Blob | Team logos | 1GB free |

### Highlights Pipeline
| Tecnologia | Uso |
|-----------|-----|
| Python 3 + demoparser2 | Parsing de demos CS2 |
| CSDM (cs-demo-manager) | Gravação de clips via HLAE |
| FFmpeg + Pillow | Pós-processamento com HUD overlay |
| Docker (PostgreSQL) | Base do CSDM |

### Design System
| Elemento | Valor |
|----------|-------|
| Fonte headings | Orbitron |
| Fonte dados | JetBrains Mono |
| Fonte body | Inter |
| Cor primária | `#A855F7` (purple) |
| Cor fundo | `#0A0A0A` (black) |
| Estilo | Sci-fi / Cyberpunk gamer HUD |

---

## 4. Estrutura do Projeto

```
orbital-cs2/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Homepage (SSR)
│   │   ├── home-content.tsx            # Layout 3 colunas HLTV-style
│   │   ├── layout.tsx                  # Root layout (fonts, providers)
│   │   ├── middleware.ts               # Auth guard para /admin
│   │   │
│   │   ├── partidas/
│   │   │   ├── page.tsx                # Listagem (SSR)
│   │   │   ├── partidas-content.tsx    # Filtros, busca, paginação
│   │   │   ├── [id]/page.tsx           # Detalhe partida (SSR + SSE)
│   │   │   └── faceit/[id]/            # Detalhe partida Faceit
│   │   │
│   │   ├── campeonato/
│   │   │   ├── [id]/page.tsx           # Campeonato (CSR — bracket, veto, tabs)
│   │   │   └── [id]/recap/            # Recap pós-torneio (SSR)
│   │   │
│   │   ├── campeonatos/page.tsx        # Listagem campeonatos
│   │   ├── perfil/[steamId]/           # Perfil jogador
│   │   ├── leaderboard/               # Ranking (SSR + CSR filtros)
│   │   ├── times/                      # Times + detalhe
│   │   ├── highlights/                 # Grid de highlights
│   │   ├── comparar/                   # Comparação 2 jogadores
│   │   ├── demos/                      # Download de demos
│   │   │
│   │   ├── admin/
│   │   │   ├── layout.tsx              # Sidebar + auth guard
│   │   │   ├── page.tsx                # Dashboard admin
│   │   │   ├── partidas/              # CRUD partidas
│   │   │   ├── times/                 # CRUD times
│   │   │   ├── servidores/            # CRUD servidores
│   │   │   ├── seasons/               # CRUD seasons
│   │   │   ├── campeonatos/           # Wizard criação torneio
│   │   │   ├── campeonato/[id]/       # Mission Control
│   │   │   ├── faceit/                # Import partidas Faceit
│   │   │   └── brand/                 # Command Center marketing
│   │   │       ├── page.tsx            # Dashboard brand
│   │   │       ├── cronograma/        # Timeline 90 dias
│   │   │       ├── instagram/         # Calendário posts + IA
│   │   │       ├── patrocinio/        # Pipeline sponsors + IA
│   │   │       └── assistente/        # Ações IA (análise, leads)
│   │   │
│   │   ├── api/
│   │   │   ├── tournaments/           # CRUD torneios (MySQL direto)
│   │   │   ├── faceit/                # Integração Faceit
│   │   │   │   ├── match/             # Import/list partidas
│   │   │   │   ├── webhook/           # Receptor webhooks Faceit
│   │   │   │   ├── sync/              # Sync Faceit → G5API
│   │   │   │   ├── live/[id]/         # Score ao vivo
│   │   │   │   ├── championship/      # Teams de championship
│   │   │   │   └── import-teams/      # Auto-cadastro times
│   │   │   ├── highlights*/           # Proxy highlights G5API + R2
│   │   │   ├── brand/                 # Marketing (tasks, sponsors, posts, IA)
│   │   │   ├── upload/                # Upload logos (Vercel Blob)
│   │   │   ├── team-logo/             # Update logo no DB
│   │   │   ├── steam/avatar*/         # Proxy avatares Steam
│   │   │   └── demo/[filename]/       # Redirect demos
│   │   │
│   │   └── write-proxy/[...path]/     # Proxy de escrita com cookie forwarding
│   │
│   ├── lib/
│   │   ├── api.ts                     # Client G5API (todas as funções)
│   │   ├── auth-context.tsx           # React Context de autenticação
│   │   ├── tournament.ts             # Lógica de bracket + Swiss
│   │   ├── tournament-utils.ts       # Auto-advance de bracket
│   │   ├── faceit.ts                 # Client Faceit Data API v4
│   │   ├── faceit-mapper.ts          # Faceit → formato interno
│   │   ├── faceit-sync.ts            # Sync Faceit → G5API
│   │   ├── faceit-db.ts              # Persistência faceit_match
│   │   ├── tournaments-db.ts         # Pool MySQL + CRUD torneios
│   │   └── maps.ts                   # Mapa de imagens CS2
│   │
│   └── components/
│       ├── navbar.tsx                 # Navegação principal
│       ├── bracket.tsx                # Bracket visual DE
│       ├── bracket-export-button.tsx  # Export bracket → PNG
│       ├── match-card.tsx             # Card de partida
│       ├── faceit-match-card.tsx      # Card partida Faceit
│       ├── hud-card.tsx               # Card estilo HUD
│       ├── video-player.tsx           # Player com thumbnail
│       ├── live-toast.tsx             # Notificações ao vivo
│       ├── brand-ai-button.tsx        # Botão IA com feedback
│       └── player-card-export.tsx     # Export player card → PNG
│
├── highlights/
│   ├── parse_all.py                   # Parser de demos (top 3 highlights)
│   ├── record.py                      # Gravação via CSDM
│   ├── postprocess.py                 # HUD overlay + intro/outro
│   ├── upload.py                      # Upload para G5API
│   ├── worker.py                      # Daemon automatizado
│   ├── parsed_highlights/             # JSONs parseados
│   ├── recordings/                    # Clips crus do CSDM
│   └── final_videos/                  # Vídeos finais com overlay
│
├── scripts/
│   ├── seed-brand-tasks.js            # Seed do cronograma 90 dias
│   └── seed-brand-posts.js            # Seed do calendário Instagram
│
├── CLAUDE.md                          # Instruções para IA
├── BRAND_BRIEFING.md                  # Briefing completo da marca
├── DOCS.md                            # Este arquivo
└── next.config.ts                     # Config Next.js (proxy, PWA, headers)
```

---

## 5. Fluxos de Dados

### 5.1 Partida Presencial (LAN)

```
Admin cria partida (ORBITAL ROXA)
  → POST /write-proxy/matches → G5API cria match
  → G5API envia config via RCON → CS2 Server (MatchZy)
  → MatchZy carrega config (times, mapas, regras)

Partida ao vivo:
  → MatchZy envia eventos POST /v2 → G5API
  → G5API processa e atualiza DB
  → G5API emite SSE stream
  → Frontend EventSource → atualiza scoreboard em tempo real
  → Kill events, bomb events, round scores — tudo ao vivo

Partida termina:
  → MatchZy envia evento final → G5API finaliza match
  → G5API calcula stats, rating, leaderboard
  → Demo gerada pelo MatchZy
  → Pipeline highlights: parse → record → postprocess → upload R2
  → Highlights aparecem na página da partida
```

### 5.2 Partida Online (Faceit)

```
Admin cria campeonato ORBITAL ROXA (modo online)
  → Informa Faceit Championship ID
  → Importa times da Faceit (auto-cadastro com Steam IDs)

Partida na Faceit:
  → Webhook match_status_ready → ORBITAL ROXA marca "AO VIVO"
  → Polling GET /matches/{id} → score parcial a cada 20s
  → Frontend mostra score ao vivo + link pra sala Faceit

Partida termina:
  → Webhook match_status_finished
  → Busca stats completos da Faceit API (K/D/A/ADR/HS/Flash/Clutch)
  → Mapeia jogadores via Steam ID → encontra times no G5API
  → Cria match + mapstats + playerstats no G5API
  → Auto-avança bracket do torneio
  → Stats aparecem no leaderboard unificado

Demo pronta:
  → Webhook match_demo_ready → baixa demo da Faceit
  → Mesma pipeline de highlights (parse → record → upload)
```

### 5.3 Torneio Double Elimination

```
Criar torneio:
  → Admin seleciona 8 times → gera bracket:
    WQF-1, WQF-2, WQF-3, WQF-4 (Winners Quarter-Finals)
    WSF-1, WSF-2 (Winners Semi-Finals)
    WF (Winners Final)
    LR1-A, LR1-B (Losers Round 1)
    LR2-A, LR2-B (Losers Round 2)
    LR3 (Losers Round 3)
    LF (Losers Final)
    GF (Grand Final)

Fluxo do bracket:
  WQF winner → WSF | WQF loser → LR1
  WSF winner → WF  | WSF loser → LR2
  LR1 winner → LR2
  LR2 winner → LR3
  WF loser → LR3
  LR3 winner → LF
  WF winner → GF
  LF winner → GF

Auto-advance:
  → Polling a cada 10s verifica se partida G5API terminou
  → Se end_time preenchido → avança winner/loser no bracket
  → Salva torneio atualizado no MySQL
```

### 5.4 Torneio Swiss System

```
Criar torneio:
  → Admin seleciona 8-16 times
  → Round 1: matchups aleatórios (seed-based)

Cada round:
  → Times com mesmo record (W-L) se enfrentam
  → Buchholz como tiebreaker (força dos oponentes)
  → BO1 normal, BO3 em rounds decisivos (record 2-2)

Finalização:
  → 3 vitórias = classificado
  → 3 derrotas = eliminado
  → Máximo 5 rounds para 16 times
```

### 5.5 Autenticação (Steam OAuth)

```
Usuário clica "Login"
  → window.location = "/api/auth/steam"
  → Next.js rewrite → G5API /auth/steam
  → G5API redireciona → Steam OpenID
  → Usuário autentica no Steam
  → Steam redireciona → G5API returnURL (via proxy Next.js)
  → G5API seta cookie "G5API" no domínio do frontend
  → Redirect → homepage
  → AuthProvider chama /api/isloggedin → verifica sessão
  → user, isAdmin, isSuperAdmin disponíveis globalmente
```

**Ponto crucial:** `APIURL` do G5API deve apontar para a URL do Next.js + `/api` (não direto pro Railway). Isso força a Steam a redirecionar pelo proxy, fazendo o cookie ser setado no domínio correto.

---

## 6. Autenticação

### Middleware (Server-side)

`src/middleware.ts` protege todas as rotas `/admin/*`:
1. Intercepta a request
2. Encaminha cookie para `G5API/isloggedin`
3. Verifica `user.admin || user.super_admin`
4. Timeout de 5s — em falha, nega acesso (fail-secure)

### Auth Context (Client-side)

`src/lib/auth-context.tsx` gerencia estado global:
- `user` — dados do usuário logado
- `isAdmin` / `isSuperAdmin` — roles
- `login()` — redirect para Steam OAuth
- `logout()` — POST /api/auth/logout
- `refresh()` — re-fetch /api/isloggedin

### Padrões de Auth nas API Routes

| Padrão | Onde é usado | Como funciona |
|--------|-------------|---------------|
| `checkAdmin` (completo) | brand/*, tournaments POST/PUT/DELETE | Valida cookie contra G5API + checa role admin |
| Cookie existence | faceit/match POST, upload, team-logo | Verifica se cookie `G5API` existe (qualquer valor) |
| Sem auth | GET públicos, highlights, demos, steam avatar | Dados públicos |
| Webhook secret | faceit/webhook | Header `x-webhook-secret` se configurado |

---

## 7. Páginas Públicas

| Página | Rota | Rendering | Revalidate |
|--------|------|-----------|------------|
| Homepage | `/` | SSR | 60s |
| Partidas | `/partidas` | SSR | 30s |
| Detalhe partida | `/partidas/[id]` | SSR + SSE | 5s |
| Partida Faceit | `/partidas/faceit/[id]` | CSR | — |
| Campeonato | `/campeonato/[id]` | CSR | — |
| Recap | `/campeonato/[id]/recap` | SSR | — |
| Campeonatos | `/campeonatos` | CSR | — |
| Perfil | `/perfil/[steamId]` | SSR metadata + CSR | 30s |
| Leaderboard | `/leaderboard` | SSR + CSR filtros | 15s |
| Times | `/times` | SSR | 60s |
| Detalhe time | `/times/[id]` | SSR | 30s |
| Highlights | `/highlights` | CSR | — |
| Comparar | `/comparar` | SSR + CSR | 60s |
| Demos | `/demos` | CSR | — |

### Partida ao vivo — como funciona

1. SSR carrega dados iniciais (match, stats, times, server)
2. Client component detecta `isLive`
3. Abre `EventSource` para SSE stream
4. SSE atualiza match, playerStats, mapStats em tempo real
5. Fallback: polling a cada 10s se SSE inativo
6. Safety net: polling backup a cada 30s sempre
7. Game log (kills/bombs) atualiza a cada 15s
8. Highlights polling a cada 15s se há clips pendentes

---

## 8. Painel Admin

| Página | Rota | Função |
|--------|------|--------|
| Dashboard | `/admin` | Métricas, alertas, ações rápidas |
| Partidas | `/admin/partidas` | CRUD partidas (wizard 4 etapas) |
| Times | `/admin/times` | CRUD times + import JSON |
| Servidores | `/admin/servidores` | CRUD servidores + status check |
| Seasons | `/admin/seasons` | CRUD seasons + import JSON |
| Campeonatos | `/admin/campeonatos` | Wizard criação (DE/Swiss, presencial/online) |
| Mission Control | `/admin/campeonato/[id]` | Bracket, veto, RCON, auto-advance |
| Faceit | `/admin/faceit` | Import partidas, stats, sync |
| Brand | `/admin/brand/*` | Marketing command center |

### Mission Control

Central de controle do torneio ao vivo:
- **Bracket visual** interativo com scores
- **Veto** — sequência de ban/pick de mapas
- **Criar partida** — seleciona servidor, envia config via G5API
- **RCON** — enviar comandos direto ao servidor CS2
- **Backups** — restaurar rounds de uma partida
- **Auto-advance** — polling a cada 10s detecta partida finalizada e avança bracket

---

## 9. Sistema de Torneios

### Armazenamento

Estado completo do torneio serializado como JSON na tabela `tournament`:
```sql
CREATE TABLE tournament (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255),
  data JSON,          -- bracket, matches, records, teams, config
  created_at TIMESTAMP
);
```

### Interface Tournament

```typescript
interface Tournament {
  id: string;
  name: string;
  format: "double_elimination" | "swiss";
  mode: "presencial" | "online";
  status: "pending" | "active" | "finished";
  teams: TournamentTeam[];
  matches: BracketMatch[];
  season_id?: number;
  map_pool: string[];
  faceit_championship_id?: string;
  // Swiss-specific
  swiss_records?: SwissRecord[];
  swiss_current_round?: number;
  swiss_finished?: boolean;
}
```

### Double Elimination

- Fixo para **8 times**
- 15 matches gerados (WQF×4, WSF×2, WF, LR1×2, LR2×2, LR3, LF, GF)
- `advanceBracket()` propaga winner e loser automaticamente
- Grand Final: winner do upper bracket vs winner do lower bracket

### Swiss System

- **8-16 times**, rounds dinâmicos
- Buchholz como tiebreaker
- 3 vitórias = classificado, 3 derrotas = eliminado
- BO3 em rounds decisivos (record 2-2)
- `generateSwissNextRound()` pareia times com mesmo record

---

## 10. Integração Faceit

### Arquivos

| Arquivo | Função |
|---------|--------|
| `src/lib/faceit.ts` | Client HTTP para Faceit Data API v4 |
| `src/lib/faceit-mapper.ts` | Transforma dados Faceit → formato interno |
| `src/lib/faceit-sync.ts` | Orquestra sync Faceit → G5API |
| `src/lib/faceit-db.ts` | Persistência MySQL de partidas Faceit |
| `src/app/api/faceit/webhook/` | Receptor de webhooks |
| `src/app/api/faceit/match/` | Import/listagem |
| `src/app/api/faceit/sync/` | Sync manual |
| `src/app/api/faceit/live/` | Score ao vivo |
| `src/app/api/faceit/championship/` | Times de championship |
| `src/app/api/faceit/import-teams/` | Auto-cadastro times |

### Dados que a Faceit API retorna

| Dado | Disponível | Campo |
|------|-----------|-------|
| Steam64 ID | Sim | `roster[].game_player_id` |
| K/D/A | Sim | `Kills`, `Deaths`, `Assists` |
| ADR | Sim | `ADR` |
| Headshots | Sim | `Headshots`, `Headshots %` |
| Damage total | Sim | `Damage` |
| Flash assists | Sim | `Enemies Flashed` |
| Utility damage | Sim | `Utility Damage` |
| Entry frags | Sim | `First Kills`, `Entry Count/Wins` |
| Clutches | Sim | `Clutch Kills`, `1v1/1v2 Count/Wins` |
| Multi-kills | Sim | `Double/Triple/Quadro/Penta Kills` |
| Weapon kills | Sim | `Sniper/Pistol/Knife Kills` |
| Score por mapa | Sim | `Final Score`, `First/Second Half Score` |
| Demo | Sim | `demo_url[]` |
| KAST | **Não** | Estimado como `(K+A+Survived)/Rounds` |

### Fallback API Interna

Championships de organizadores free/não-publicados retornam 404 na Data API. O sistema usa fallback para `https://api.faceit.com` (API interna não documentada) que funciona sem autenticação.

---

## 11. Highlights Pipeline

### Fluxo completo

```
1. PARSE: python parse_all.py
   → Lê demo .dem via demoparser2
   → Extrai kills com metadata (arma, HS, wallbang, smoke, flash)
   → Scoring system: kills × multiplicadores (HS=1.5, smoke=1.3, etc)
   → Seleciona top 3 highlights por mapa
   → Salva JSON em parsed_highlights/

2. RECORD: python record.py <match_id> <map_number> [--rank N] [--all]
   → Lê JSON parseado
   → Executa CSDM CLI com demo
   → Grava clip focando no jogador (Steam ID)
   → Output: .mp4 cru em recordings/

3. POSTPROCESS: python postprocess.py <match_id> <map_number> [--rank N]
   → Lê clip + dados do highlight
   → Gera HUD overlay frame-by-frame (Pillow):
     - Barra de stats animada (kills, assists, headshots)
     - Avatar do jogador + nome + time
     - Fontes: Orbitron + JetBrains Mono
   → FFmpeg concat: intro + clip_com_hud + outro
   → Output: final_videos/match_X_map_Y/highlight_mX_mapY_rN_player.mp4

4. UPLOAD: python upload.py ou manual
   → Upload para Cloudflare R2 (bucket: orbitalroxa)
   → Key: highlights/match_X_map_Y_clip_N.mp4
   → Registro no DB: highlight_clips table
```

### Automação

`worker.py` — Daemon que monitora partidas finalizadas e roda a pipeline automaticamente:
```bash
python worker.py --daemon        # roda em loop
python worker.py --match 38      # processa match específico
python worker.py --match 38 --map 0  # processa mapa específico
```

---

## 12. Brand Command Center

### Páginas

| Rota | Função |
|------|--------|
| `/admin/brand` | Dashboard — progresso do plano 90 dias |
| `/admin/brand/cronograma` | Timeline semanal com tarefas por categoria |
| `/admin/brand/instagram` | Calendário de posts + IA (captions, prompts, hashtags) |
| `/admin/brand/patrocinio` | Pipeline de sponsors + IA (busca, abordagem, proposta) |
| `/admin/brand/assistente` | Ações IA pontuais (análise marca, concorrentes, leads) |

### IA Integrada (Claude Haiku)

A IA não é um chat — é um **motor de ações** dentro de cada aba:

| Ação | O que faz |
|------|----------|
| `gerar-caption` | Cria legenda para post Instagram |
| `gerar-prompt-imagem` | Cria prompt para Midjourney/DALL-E |
| `gerar-hashtags` | Sugere hashtags relevantes |
| `buscar-patrocinadores` | Lista empresas locais pra abordar |
| `gerar-abordagem` | Cria mensagem de prospecção |
| `gerar-proposta` | Cria proposta de patrocínio |
| `analise-marca` | Análise completa do posicionamento |
| `analise-concorrentes` | Compara com concorrentes |
| `buscar-leads` | Identifica oportunidades |
| `proximos-passos` | Sugere próximas ações |
| `gerar-cronograma` | Cria cronograma semanal |

O prompt da IA inclui o **briefing completo** da marca (BRAND_BRIEFING.md) com todas as limitações reais (orçamento, equipe, infraestrutura).

---

## 13. API Routes

### Dependências de cada rota

| Route | G5API | MySQL | Faceit API | Outro |
|-------|-------|-------|-----------|-------|
| `/api/tournaments` GET | — | ✅ | — | — |
| `/api/tournaments` POST/PUT/DELETE | ✅ (auth) | ✅ | — | — |
| `/api/faceit/match` GET | — | ✅ | — | — |
| `/api/faceit/match` POST | — | ✅ | ✅ | — |
| `/api/faceit/match/[id]` | — | ✅ | ✅ (fallback) | — |
| `/api/faceit/webhook` | ✅ (sync) | ✅ | ✅ | — |
| `/api/faceit/sync` | ✅ (sync) | ✅ | ✅ | — |
| `/api/faceit/live/[id]` | — | — | ✅ | — |
| `/api/faceit/championship/[id]/teams` | — | — | ✅ | — |
| `/api/faceit/import-teams` | ✅ | — | — | — |
| `/api/highlights/*` | ✅ (proxy) | — | — | — |
| `/api/highlights-proxy/[file]` | — | — | — | R2 redirect |
| `/api/brand/*` | ✅ (auth) | ✅ | — | Anthropic |
| `/api/upload` | — | — | — | Vercel Blob |
| `/api/team-logo` | — | ✅ | — | — |
| `/api/steam/avatar*` | — | — | — | Steam API |
| `/api/demo/[filename]` | ✅ (redirect) | — | — | — |
| `/write-proxy/*` | ✅ (proxy) | — | — | — |

---

## 14. Componentes

| Componente | Arquivo | Descrição |
|-----------|---------|-----------|
| `Navbar` | `navbar.tsx` | Navegação principal, menu mobile, user dropdown |
| `FullBracket` | `bracket.tsx` | Visualização bracket DE completo |
| `BracketExportButton` | `bracket-export-button.tsx` | Export bracket → PNG |
| `MatchCard` | `match-card.tsx` | Card de partida G5API |
| `FaceitMatchCard` | `faceit-match-card.tsx` | Card de partida Faceit |
| `HudCard` / `StatBox` | `hud-card.tsx` | Containers estilo HUD |
| `VideoPlayer` | `video-player.tsx` | Player com thumbnail auto |
| `LiveToastProvider` | `live-toast.tsx` | Notificações partida ao vivo |
| `BrandAIButton` | `brand-ai-button.tsx` | Botão IA com loading/feedback |
| `PlayerCardExport` | `player-card-export.tsx` | Export player card → PNG |

---

## 15. Banco de Dados

### MySQL Railway (`DATABASE_URL`)

Mesmo banco usado pelo G5API e pelas features do Next.js.

**Tabelas do G5API:**
```
match, team, team_auth_names, player_stats, map_stats,
season, season_cvar, user, veto, veto_side, game_server,
match_audit, match_bomb_plants, match_cvar, match_pause,
match_spectator, migrations, map_list, player_stat_extras
```

**Tabelas do ORBITAL ROXA (Next.js):**
```
tournament          — Torneios (estado em JSON)
faceit_match        — Cache partidas Faceit
highlight_clips     — Metadados dos highlights
brand_tasks         — Cronograma marketing
brand_checklist     — Checklist de ações
brand_sponsors      — Pipeline patrocinadores
brand_posts         — Calendário Instagram
brand_notes         — Notas por seção
brand_ai_reports    — Relatórios gerados pela IA
allstar_clips       — Clips do Allstar.gg
```

---

## 16. Deploy e Infraestrutura

### Vercel (Frontend)
- **Projeto:** orbital-cs2
- **Domínio:** www.orbitalroxa.com.br
- **Branch:** master
- **Build:** `next build`
- **Node:** 20.x

### Railway (Backend)
- **G5API:** Node.js Express
- **MySQL:** MariaDB
- **Redis:** Cache + sessões
- **G5V:** Frontend Vue.js original (deprecated)

### Cloudflare R2
- **Bucket:** orbitalroxa
- **URL pública:** `https://pub-894e2fa8c7684e2095cedd60a72f4536.r2.dev`
- **Conteúdo:** 45 highlight clips (4.1GB)

---

## 17. Variáveis de Ambiente

### Vercel (Next.js)

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_G5API_URL` | URL do G5API no Railway |
| `DATABASE_URL` | MySQL connection string |
| `STEAM_API_KEY` | Steam Web API key |
| `FACEIT_API_KEY` | Faceit Data API key |
| `FACEIT_WEBHOOK_SECRET` | Secret do webhook Faceit |
| `ANTHROPIC_API_KEY` | API key Claude (Haiku) |
| `R2_PUBLIC_URL` | URL pública do Cloudflare R2 |
| `BLOB_READ_WRITE_TOKEN` | Token Vercel Blob Storage |
| `NEXT_PUBLIC_SITE_URL` | URL pública do site |
| `HIGHLIGHTS_API_KEY` | Key para trigger highlights |
| `ALLSTAR_WEBHOOK_AUTH` | Auth Allstar webhook |

### Railway (G5API)

| Variável | Descrição |
|----------|-----------|
| `HOSTNAME` | URL do proxy Next.js + /api |
| `APIURL` | Mesma que HOSTNAME |
| `CLIENTHOME` | URL raiz do frontend |
| `DATABASE_URL` | MySQL internal URL |
| `STEAMAPIKEY` | Steam Web API key |
| `REDISURL` | Redis internal URL |

---

## 18. Desenvolvimento Local

### Pré-requisitos
- Node.js 20+
- Python 3.10+ (para highlights)
- Docker (para CSDM)
- CS2 instalado (para gravação HLAE)

### Setup

```bash
# Clone
git clone https://github.com/VANCIMJOAO/orbital-cs2.git
cd orbital-cs2

# Instalar dependências
npm install

# Configurar env
cp .env.example .env.local
# Preencher variáveis (DATABASE_URL, STEAM_API_KEY, etc)

# Rodar dev server
npm run dev
# Abre http://localhost:3001

# G5API (separado)
# Precisa estar rodando no Railway ou localmente
# HOSTNAME e APIURL devem apontar para http://localhost:3001/api
```

### Highlights Pipeline (local)

```bash
# 1. Docker PostgreSQL para CSDM
docker run -d --name csdm-postgres -p 5438:5432 \
  -e POSTGRES_PASSWORD=csdm postgres:17

# 2. Parse demos
cd highlights
python parse_all.py

# 3. Gravar clips (requer CS2 + HLAE)
python record.py 38 0 --all

# 4. Pós-processar
python postprocess.py 38 0 --all

# 5. Upload para R2
node ../scripts/upload-to-r2.js
```
