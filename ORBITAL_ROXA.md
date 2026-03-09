# ORBITAL ROXA - Documentação do Projeto

## Visão Geral
Frontend Next.js 15 (App Router) para gerenciamento de torneios CS2, substituindo o G5V (Vue.js).
Consome o mesmo backend G5API hospedado no Railway.

- **Nome**: ORBITAL ROXA
- **Tech Stack**: Next.js 15, Tailwind CSS v4, Framer Motion, Lucide React, Google Fonts (Orbitron, JetBrains Mono, Inter)
- **Backend**: G5API em `https://g5api-production-998f.up.railway.app`
- **Diretório**: `c:\Users\vancimj\Desktop\maisum\orbital-cs2`
- **Dev Server**: `http://localhost:3001`

## Estilo Visual
- **Tema**: Sci-fi/cyberpunk gamer HUD, fundo preto #0A0A0A
- **Cores**: Purple primário #A855F7, cards #111111, borders #1A1A1A/#2A2A2A
- **Fontes**: Orbitron (headings), JetBrains Mono (stats/dados), Inter (body)
- **Efeitos**: Purple glow, scanlines overlay, grid patterns, chanfered corners (clip-path)
- **Animações**: Framer Motion (fade up, scale, stagger, glitch)
- **Elementos HUD**: Corner brackets, status indicators, tech borders

## Estrutura de Páginas

### Públicas
| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/` | `src/app/page.tsx` | Dashboard - hero, matches recentes, stats |
| `/partidas` | `src/app/partidas/page.tsx` | Lista de partidas com filtros (ao vivo/pendente/finalizada) |
| `/partidas/[id]` | `src/app/partidas/[id]/page.tsx` | Match ao vivo - SSE, scoreboard, player stats |
| `/times` | `src/app/times/page.tsx` | Cards de times com logos e rosters |
| `/leaderboard` | `src/app/leaderboard/page.tsx` | Ranking de jogadores com stats |
| `/perfil/[steamId]` | `src/app/perfil/[steamId]/page.tsx` | Perfil do jogador |

### Admin (requer autenticação)
| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/admin` | `src/app/admin/page.tsx` | Dashboard admin |
| `/admin/partidas` | `src/app/admin/partidas/page.tsx` | Criar partida |
| `/admin/times` | `src/app/admin/times/page.tsx` | CRUD de times |
| `/admin/servidores` | `src/app/admin/servidores/page.tsx` | CRUD de servidores |
| `/admin/seasons` | `src/app/admin/seasons/page.tsx` | CRUD de seasons |

## Componentes Compartilhados
- `src/components/navbar.tsx` - Navegação principal com auth status
- `src/components/hud-card.tsx` - Card estilizado com chanfered corners e glow
- `src/components/match-card.tsx` - Card de partida com status e scores

## Arquivos Core
- `src/lib/api.ts` - Cliente API completo (todas as interfaces, funções de fetch, auth, CRUD)
- `src/lib/auth-context.tsx` - React Context para estado de autenticação
- `src/app/layout.tsx` - Layout root com AuthProvider e Navbar
- `next.config.ts` - Config com rewrites (proxy /api → G5API) e image remotePatterns

## Autenticação - Steam OAuth (SOLUÇÃO ENCONTRADA)

### Problema
O G5API usa Passport-Steam com session cookies (`connect.sid`). Quando o frontend (localhost:3001) e o backend (railway.app) estão em domínios diferentes, o cookie `connect.sid` é setado no domínio do G5API e não pode ser enviado pelo frontend (SameSite restriction).

### Solução: Proxy Completo via Next.js Rewrites
O Next.js já tem um rewrite que faz proxy de `/api/*` para o G5API. A solução foi fazer o **fluxo inteiro do OAuth passar pelo proxy**:

1. **next.config.ts** tem o rewrite em `fallback` (para que API routes tenham prioridade):
   ```typescript
   async rewrites() {
     return {
       beforeFiles: [],
       afterFiles: [],
       fallback: [{
         source: "/api/:path*",
         destination: "https://g5api-production-998f.up.railway.app/:path*",
       }],
     };
   }
   ```

2. **Variáveis de ambiente do G5API no Railway** (CRÍTICO):
   - `HOSTNAME = http://localhost:3001/api`
   - `APIURL = http://localhost:3001/api` ← Passport-Steam usa esta para construir o returnURL
   - `CLIENTHOME = http://localhost:3001` ← Redirect após login bem-sucedido

3. **Fluxo completo**:
   ```
   Usuário clica "Login" → /api/auth/steam (proxy) → G5API redireciona para Steam
   Steam autentica → callback para http://localhost:3001/api/auth/steam/return (proxy)
   G5API processa callback → Set-Cookie: connect.sid (domínio: localhost) → redirect para CLIENTHOME
   Frontend chama /api/isloggedin com credentials:include → cookie enviado → usuário autenticado!
   ```

4. **Frontend** (`src/lib/api.ts`):
   - `getSteamLoginUrl()` retorna `/api/auth/steam` (proxy)
   - `getCurrentUser()` faz fetch para `/api/isloggedin` com `credentials: "include"`
   - `logout()` faz fetch para `/api/logout` com `credentials: "include"`

### Abordagens que NÃO Funcionaram
- **API Routes como proxy de auth** (`src/app/api/auth/*`): Tentamos criar rotas Next.js que interceptavam o fluxo OAuth, mas Steam rejeitava porque `openid.realm` não correspondia ao `return_to` modificado
- **Fetch cross-domain com credentials**: CORS permite, mas o cookie fica no domínio errado

### Para Deploy em Produção
Quando fizer deploy do frontend em um domínio de produção, atualizar no Railway:
- `HOSTNAME` → `https://seu-dominio.com/api`
- `APIURL` → `https://seu-dominio.com/api`
- `CLIENTHOME` → `https://seu-dominio.com`

⚠️ **IMPORTANTE**: Enquanto HOSTNAME/APIURL apontam para localhost:3001, o G5V original e outros clientes não conseguem fazer login. Isso é apenas para desenvolvimento local.

## API Client (`src/lib/api.ts`)

### Padrão de Fetch
- **Server-side**: Usa URL direta (`https://g5api-production-998f.up.railway.app`) para SSR
- **Client-side**: Usa proxy (`/api`) para evitar CORS e manter cookies
- Função `getApiBase()` detecta automaticamente

### Endpoints Implementados
- Matches: list, get, create
- Teams: list, get, create, update, delete
- Servers: list, available, create, update, delete
- Seasons: list, create, update, delete
- Player Stats: by match, by steam_id
- Map Stats: by match
- Leaderboard: com filtro por season
- Auth: login (Steam), logout, isLoggedIn
- SSE: stream de match ao vivo

## Descobertas Técnicas

### G5API
- `APIURL` (não `HOSTNAME`) é usado pelo Passport-Steam para construir o `returnURL` do OAuth
- A validação do Steam OpenID exige que `openid.realm` e `openid.return_to` sejam do mesmo domínio
- SSE endpoint: `/matches/:id/stream`
- Cookie de sessão: `connect.sid` (Express session)

### Next.js
- API routes em `src/app/api/` têm prioridade sobre rewrites **SOMENTE se rewrites usam `fallback`**
- Usar `return [...]` no rewrites (array simples) faz o rewrite capturar ANTES das API routes
- Usar `return { fallback: [...] }` faz API routes serem verificadas ANTES do rewrite
- Rewrites preservam headers de response incluindo `Set-Cookie`, o que permite o proxy de auth funcionar
- `credentials: "include"` é necessário em todas as chamadas que precisam enviar o cookie

### Proxy de Escrita (POST/PUT/DELETE)
- **Problema**: O rewrite do Next.js causa `ECONNRESET` / `socket hang up` em POSTs para o G5API
- **Solução**: API route em `src/app/api/proxy/[...path]/route.ts` faz proxy manual com cookies
- Operações de escrita (createTeam, updateTeam, deleteTeam, etc.) usam `/api/proxy/` em vez de `/api/`
- A API route lê o cookie do request e repassa explicitamente para o G5API
- `next.config.ts` usa `fallback` para que `/api/proxy/*` vá para a API route em vez do rewrite

### Endpoints da G5API Descobertos
- `GET /leaderboard` → retorna ranking de **times** (wins, losses, rounddiff) - NÃO jogadores
- `GET /leaderboard/players` → retorna ranking de **jogadores** (steamId camelCase, kills, deaths, trp, hsp, average_rating, wins)
- `GET /playerstats/:steamId` → retorna array de stats **por partida** (não agregado)
- `GET /seasons` → retorna 404 (endpoint pode não existir nesta versão do G5API)
- `POST /teams` → espera `{ name, tag, flag, public_team, auth_name: { steamId: name } }`

## Status Atual
- ✅ Todas as páginas públicas funcionando (home, partidas, times, leaderboard, perfil)
- ✅ Painel admin carregando com sessão autenticada (dashboard, times, servidores, partidas, seasons)
- ✅ Autenticação Steam OAuth funcionando via proxy
- ✅ SSE para partidas ao vivo
- ✅ Perfil do jogador - agrega stats de múltiplas partidas
- ✅ Leaderboard corrigido - usa `/leaderboard/players` (jogadores individuais, não times)
- ✅ Links de perfil no leaderboard corrigidos (steamId camelCase)
- 🔧 CRUD admin (POST/PUT/DELETE) - proxy manual `/api/proxy/` criado, **em teste**
  - O rewrite com `fallback` precisa ser validado (estava dando 404 antes de reiniciar)
  - Se falhar, alternativa: mover proxy para rota fora de `/api/` (ex: `/write-proxy/`)
- 🔲 Seasons retorna 404 - endpoint pode não existir no G5API
- 🔲 Deploy em produção
- 🔲 Ajustar env vars do G5API para produção
