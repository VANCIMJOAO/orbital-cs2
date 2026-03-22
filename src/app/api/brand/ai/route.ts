import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { dbPool } from "@/lib/tournaments-db";
import { ensureBrandTables } from "../init-db";
import { checkAdmin } from "../auth";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

const SYSTEM_PROMPT = `Você é um agente de inteligência de marketing da ORBITAL ROXA, uma crew de produção de campeonatos de CS2 baseada em Ribeirão Preto — SP.

Você NÃO é um chatbot. Você é um analista estratégico que gera RELATÓRIOS COMPLETOS e ACIONÁVEIS.

CONTEXTO DA MARCA:
- Campeonatos presenciais e online de CS2 no interior de SP
- Cup #1 realizado: 40 jogadores, 8 times, 60+ presenciais, 120 pico live, double elimination
- Campeão: CHOPPADAS (iguizik-, hoppe, leoking_, sabiahzera, linz1k)
- Grand Final: CHOPPADAS 2x0 DoKuRosa (Mirage 13:10, Inferno 13:11)
- Top 5: leoking_ (1.39), linz1k (1.22), duum (1.19), pdX (1.15), nastyy (1.14)
- Play of Tournament: Lcszik444- ACE (5K, 4HS, wallbang AK-47)
- Receita Cup #1: R$4k (8x R$500), Aluguel R$2k, Premiação R$2k
- Plataforma própria: orbitalroxa.com.br (stats ao vivo, leaderboard, highlights, bracket)
- Instagram: @orbitalroxa.gg (em construção)
- Público: gamers CS2, 18-35 anos, Ribeirão Preto/Franca/Araraquara
- Visual: sci-fi/cyberpunk, preto + roxo #A855F7, Orbitron + JetBrains Mono
- Próximo: Cup #2 (~Maio 2026), meta 80 jogadores, 16 times, R$4k+ premiação

PACOTES DE PATROCÍNIO:
- Bronze R$500: logo site + menção live + story
- Prata R$1.000: + banner servidor + banner evento + post dedicado + logo crachá
- Ouro R$2.000+: + nome no torneio + espaço divulgação + fotos pódio + relatório

REGRAS:
- Sempre em português brasileiro
- Relatórios completos com seções claras em markdown
- Dados específicos, nomes reais, valores reais
- Ações concretas com responsável e prazo quando possível
- Considere o contexto regional (interior de SP, não capital)
- Use emojis com moderação pra organizar seções`;

const ACTION_PROMPTS: Record<string, { title: string; prompt: string }> = {
  "analise-marca": {
    title: "Análise de Marca",
    prompt: `Faça uma análise COMPLETA da marca ORBITAL ROXA no mercado de esports brasileiro. Cubra:

## 1. POSICIONAMENTO ATUAL
- Onde a marca se encaixa no ecossistema de CS2 brasileiro
- Forças (plataforma própria, dados reais, highlights automáticos)
- Fraquezas (marca nova, sem redes sociais, sem patrocínio)
- Oportunidades (interior de SP sem competição, cena crescendo)
- Ameaças (GamersClub, Faceit, outras ligas)

## 2. DIFERENCIAL COMPETITIVO
- O que a Orbital Roxa oferece que ninguém mais faz
- Como comunicar isso

## 3. PÚBLICO-ALVO DETALHADO
- Perfil demográfico e psicográfico
- Onde estão (plataformas, grupos, locais)
- O que valorizam

## 4. IDENTIDADE DE MARCA
- Tom de voz recomendado
- Pilares de comunicação (3-5)
- Mensagem central

## 5. RECOMENDAÇÕES IMEDIATAS (top 5)
- Ações prioritárias com prazo`,
  },

  "analise-concorrentes": {
    title: "Análise de Concorrentes",
    prompt: `Analise os principais concorrentes e referências da ORBITAL ROXA no cenário de CS2 brasileiro. Para CADA concorrente, detalhe:

## CONCORRENTES DIRETOS (ligas/torneios regionais)
- Ligas de CS2 no interior de SP
- Torneios presenciais (LAN houses, eventos)
- Comunidades locais de CS2

## REFERÊNCIAS NACIONAIS
- GamersClub (modelo de negócio, como captam jogadores)
- Gamers Academy (formato educacional + competitivo)
- Draft5 (cobertura de esports BR)
- ESEA Brasil (modelo de liga online)
- Ligas universitárias (CBDE, UniLiga)

Para cada um analise:
1. O que fazem bem (pra copiar)
2. O que fazem mal (pra evitar)
3. O que NÃO fazem (oportunidade pra nós)
4. Presença no Instagram (seguidores, frequência, tipo de conteúdo)
5. Modelo de monetização

## MAPA DE POSICIONAMENTO
- Onde cada player se posiciona (casual vs competitivo, local vs nacional)
- Onde a Orbital Roxa deve se posicionar

## AÇÕES PARA SE DIFERENCIAR`,
  },

  "captar-leads": {
    title: "Estratégia de Captação de Leads",
    prompt: `Crie uma estratégia COMPLETA de captação de leads (jogadores e times) para o Cup #2 da ORBITAL ROXA. Seja específico pra região de Ribeirão Preto, Franca e Araraquara.

## 1. CANAIS DE CAPTAÇÃO
Para cada canal, detalhe: como usar, mensagem-tipo, meta de leads, custo

### WhatsApp
- Grupos de CS2 da região (quais, como encontrar)
- Mensagem de abordagem (texto pronto)

### Discord
- Servidores de CS2 BR relevantes
- Como abordar sem ser spam

### Instagram
- Estratégia de direct
- Posts de captação
- Parcerias com influencers locais

### Presencial
- LAN houses da região (listar as principais)
- Faculdades com cena gamer
- Eventos locais

### Faceit/GamersClub
- Hubs e comunidades da região

## 2. FUNIL DE CONVERSÃO
Interesse → Inscrição → Confirmação → Check-in

## 3. TIMELINE (6 semanas antes do evento)
Semana por semana, o que fazer

## 4. METAS
- Quantos leads por canal
- Taxa de conversão esperada
- Meta final: 16 times (80 jogadores)

## 5. MENSAGENS PRONTAS
- 5 templates de mensagem pra cada canal`,
  },

  "captar-patrocinadores": {
    title: "Prospecção de Patrocinadores",
    prompt: `Crie um PLANO COMPLETO de prospecção de patrocinadores para a ORBITAL ROXA, focando em empresas de Ribeirão Preto e região + marcas nacionais do universo gamer.

## 1. LISTA DE 20 PROSPECTS
Para cada um:
- Nome/tipo da empresa
- Por que faz sentido patrocinar (fit com público gamer)
- Valor estimado (qual pacote: Bronze/Prata/Ouro)
- Canal de abordagem (WhatsApp/email/presencial/Instagram)
- Pitch personalizado de 3 linhas

### Categorias:
- Periféricos e hardware (lojas locais + e-commerce)
- Energéticos e bebidas (distribuidoras regionais)
- Alimentação (delivery, fast food, snacks)
- Vestuário/streetwear (lojas locais + marcas)
- Informática e tech (lojas, assistências)
- Barbearias/estética masculina
- Academias/suplementos
- Cripto/fintech/bancos digitais
- Educação (cursos, faculdades)
- Marcas nacionais gamers

## 2. SCRIPT DE ABORDAGEM
- Primeira mensagem (WhatsApp)
- Email formal
- Abordagem presencial (elevator pitch)
- Follow-up (1 semana depois)

## 3. PROPOSTA DE VALOR
- O que cada pacote oferece em detalhes
- ROI estimado pra cada pacote
- Dados de audiência (reais do Cup #1)

## 4. TIMELINE DE PROSPECÇÃO
- Quando abordar, quando fazer follow-up, deadline pra fechar

## 5. MÉTRICAS
- Meta: pelo menos 2 patrocinadores fechados
- Valor alvo: R$2.000-3.000 em patrocínio`,
  },

  "gerar-cronograma": {
    title: "Cronograma de Lançamento Cup #2",
    prompt: `Crie um CRONOGRAMA DETALHADO de 8 semanas para o lançamento do ORBITAL ROXA CUP #2. Para cada semana:

## FORMATO POR SEMANA:
### SEMANA X — [TÍTULO] (data)
**Objetivo:** [frase]
**Tarefas:**
1. [tarefa] — categoria: [instagram/conteudo/negocio/tech/campeonato] — prioridade: [alta/media/baixa]
2. ...

**Posts Instagram da semana:**
- [dia]: [tipo] — [título do post]

**Meta da semana:** [métrica específica]

## SEMANAS:
1. Presença Digital (criar Instagram, primeiros posts)
2. Conteúdo do Cup #1 (stats, highlights, player spotlights)
3. Prospecção de Patrocínio (listar, abordar, negociar)
4. Anúncio Cup #2 (teaser, reveal, hype)
5. Inscrições Abertas (formulário, divulgação, captação)
6. Confirmação de Times (apresentação, rivalidades)
7. Preparação Final (servidor, logística, patrocinadores)
8. Semana do Evento (countdown, check-in, dia do evento, pós-evento)

Considere que já temos a plataforma pronta (orbitalroxa.com.br), o servidor CS2 configurado, e a pipeline de highlights funcionando.`,
  },

  "conteudo-semanal": {
    title: "Plano de Conteúdo Semanal",
    prompt: `Crie o PLANO DE CONTEÚDO da próxima semana para o Instagram @orbitalroxa.gg. Para cada dia:

## FORMATO:
### [DIA DA SEMANA] — [DATA]
**Tipo:** Feed / Reel / Story
**Horário:** [baseado nos melhores horários pro público gamer]
**Título:** [título do post]
**Caption completa:**
[caption pronta pra copiar e colar, com emojis, mentions e CTA]

**Hashtags:** (máximo 15)
[lista de hashtags]

**Notas de produção:** [o que precisa ser feito/criado pra esse post]

## REGRAS:
- Máximo 1 post no feed por dia
- Stories podem ser diários
- Reels nos fins de semana (14h)
- Feed terça/quarta/sexta (19h30)
- Usar dados reais do Cup #1 (stats, highlights, resultados)
- Alternar tipos: resultado, stats, highlight, player spotlight, teaser, enquete
- Incluir CTA (call to action) em todo post
- Manter identidade visual (roxo, cyberpunk, dados)

Gere 7 dias completos com conteúdo pronto pra executar.`,
  },

  "posicionamento": {
    title: "Estratégia de Posicionamento",
    prompt: `Defina a ESTRATÉGIA DE POSICIONAMENTO completa da ORBITAL ROXA no mercado de esports brasileiro.

## 1. MANIFESTO DA MARCA (100 palavras)
O que a Orbital Roxa representa

## 2. PROPOSTA DE VALOR ÚNICA
Uma frase que resume por que somos diferentes

## 3. PILARES DA MARCA (5 pilares)
Para cada pilar: nome, descrição, como comunicar

## 4. TOM DE VOZ
- Adjetivos que definem (ex: técnico, acessível, apaixonado)
- Exemplos de como escrever em cada contexto (post, bio, resposta a comentário)
- O que NUNCA fazer (anti-exemplos)

## 5. PÚBLICO-ALVO (3 personas)
Para cada persona: nome fictício, idade, profissão, hábitos, motivação, onde está, como alcançar

## 6. NARRATIVA DE CRESCIMENTO
- De onde viemos (amigos que jogam CS há 10+ anos)
- Onde estamos (Cup #1 realizado com sucesso)
- Pra onde vamos (a maior liga regional do interior de SP)

## 7. PLANO DE AÇÃO IMEDIATO
Top 10 ações pra consolidar o posicionamento nas próximas 4 semanas`,
  },

  "analise-instagram": {
    title: "Estratégia de Instagram",
    prompt: `Crie a ESTRATÉGIA COMPLETA de Instagram para @orbitalroxa.gg, do zero ao primeiro mês.

## 1. PERFIL
- Nome de exibição
- Bio (150 caracteres, com emojis e CTA)
- Link (linktree ou direto)
- Foto de perfil (descrição do que deve ser)
- Destaques (quais criar, nome e capa de cada)

## 2. ESTÉTICA DO FEED
- Grid de 9 posts planejado (3x3)
- Paleta de cores (consistência visual)
- Tipos de post que se alternam
- Referências visuais do universo gamer/esports

## 3. ESTRATÉGIA DE CONTEÚDO
- 5 pilares de conteúdo (o que postar)
- Frequência (posts/semana)
- Melhor horário por tipo
- Proporção: educativo / entretenimento / vendas

## 4. PRIMEIROS 20 POSTS
Para cada: tipo, título curto, ideia visual, melhor dia/horário

## 5. ESTRATÉGIA DE CRESCIMENTO
- Como ganhar os primeiros 500 seguidores
- Hashtag strategy (grupos de 15)
- Engagement strategy (comentários, DMs, collabs)
- Parcerias com outros perfis

## 6. MÉTRICAS
- KPIs pra acompanhar semanalmente
- Meta de 30 dias
- Meta de 90 dias`,
  },
};

async function getBrandContext() {
  try {
    await ensureBrandTables();
    const [tasks] = await dbPool.execute("SELECT title, category, done, week FROM brand_tasks ORDER BY week");
    const [checks] = await dbPool.execute("SELECT title, category, done FROM brand_checklist ORDER BY sort_order");
    const [sponsors] = await dbPool.execute("SELECT name, type, estimated_value, status FROM brand_sponsors");
    const [posts] = await dbPool.execute("SELECT title, post_type, scheduled_date, status FROM instagram_posts ORDER BY scheduled_date");

    const taskList = tasks as { title: string; category: string; done: boolean; week: number }[];
    const checkList = checks as { title: string; category: string; done: boolean }[];
    const sponsorList = sponsors as { name: string; type: string; estimated_value: string; status: string }[];
    const postList = posts as { title: string; post_type: string; scheduled_date: string; published: boolean }[];

    return `\n\nESTADO ATUAL:
- Tarefas: ${taskList.filter(t => t.done).length}/${taskList.length} concluídas
- Checklist: ${checkList.filter(c => c.done).length}/${checkList.length}
- Posts: ${postList.length} planejados (${postList.filter(p => p.published).length} publicados)
- Sponsors: ${sponsorList.map(s => `${s.name} (${s.status})`).join(", ") || "nenhum"}
- Tasks pendentes: ${taskList.filter(t => !t.done).slice(0, 5).map(t => t.title).join("; ")}`;
  } catch {
    return "";
  }
}

// POST — Generate a report
export async function POST(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  try {
    await ensureBrandTables();
    const { action } = await req.json();

    const actionConfig = ACTION_PROMPTS[action];
    if (!actionConfig) {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }

    const brandContext = await getBrandContext();
    const prompt = actionConfig.prompt + brandContext;

    // Create report record
    const [result] = await dbPool.execute(
      "INSERT INTO brand_ai_reports (action_id, title, status) VALUES (?, ?, 'generating')",
      [action, actionConfig.title]
    );
    const reportId = (result as { insertId: number }).insertId;

    // Stream response
    const stream = client.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const encoder = new TextEncoder();
    let fullContent = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ reportId })}\n\n`));

          for await (const event of stream) {
            if (event.type === "content_block_delta" && "delta" in event && "text" in event.delta) {
              const text = event.delta.text;
              fullContent += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }

          // Save to DB
          await dbPool.execute(
            "UPDATE brand_ai_reports SET content = ?, status = 'ready' WHERE id = ?",
            [fullContent, reportId]
          );

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, reportId })}\n\n`));
          controller.close();
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Erro";
          await dbPool.execute(
            "UPDATE brand_ai_reports SET content = ?, status = 'error' WHERE id = ?",
            [`Erro: ${errMsg}`, reportId]
          ).catch(() => {});
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro" }, { status: 500 });
  }
}

// GET — List saved reports
export async function GET(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    await ensureBrandTables();
    const [rows] = await dbPool.execute(
      "SELECT id, action_id, title, status, created_at FROM brand_ai_reports ORDER BY created_at DESC LIMIT 50"
    );
    return NextResponse.json({ reports: rows });
  } catch {
    return NextResponse.json({ reports: [] });
  }
}

// DELETE — Remove a report
export async function DELETE(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    const { id } = await req.json();
    await dbPool.execute("DELETE FROM brand_ai_reports WHERE id = ?", [id]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
