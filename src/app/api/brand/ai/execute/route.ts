import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ensureBrandTables } from "../../init-db";
import { checkAdmin } from "../../auth";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

const SYSTEM = `Você é um agente de inteligência de marketing da ORBITAL ROXA. Responda SEMPRE em português brasileiro. Retorne APENAS JSON válido quando solicitado, sem texto extra, sem markdown code blocks.

BRIEFING COMPLETO DA MARCA:

A Orbital Roxa é uma crew de 4 amigos (nastyy, Vancim, z1k4mem0, loko) de Ribeirão Preto/SP que se conhecem há anos. Começaram como time de CS2, depois criaram uma marca de roupa streetwear (camisetas oversized com referências ao jogo, já tem produtos prontos, venderam 3 no Cup #1), e expandiram pra organização de campeonatos.

O nome vem de um ecstasy famoso no Brasil chamado "Orbital Roxa" — da época que frequentavam raves juntos.

CUP #1 (já realizado):
- LAN house alugada em RP, 10 PCs, 1 jogo por vez, 8 times DE
- 70 pessoas no local, 120 viewers na Twitch
- Custo: R$4.800 (R$2k aluguel + R$2k premiação + R$800 mercado)
- Receita: R$4k inscrições (8x R$500) + venda de comida/camisetas
- Campeão: CHOPPADAS, Vice: DoKuRosa, 14 partidas, 40 jogadores
- Top: leoking_ (1.39 rating), linz1k (1.22), duum (1.19)
- Play of Tournament: Lcszik444- ACE (5K, 4HS, wallbang AK-47)
- Feedbacks muito positivos, comunidade pediu Cup #2

PLATAFORMA PRÓPRIA (orbitalroxa.com.br):
- Stats em tempo real, leaderboard, highlights automáticos, bracket ao vivo
- Pipeline Python que gera highlights das demos automaticamente
- Integração Faceit em desenvolvimento pra campeonatos online

LIMITAÇÕES REAIS (IMPORTANTE - NÃO INVENTAR):
- 10 PCs alugados = máximo 8 times/campeonato (1 jogo por vez)
- 4 pessoas na crew, todos com outras ocupações
- Sem CNPJ (informal)
- ~R$500 de orçamento disponível pro Cup #2
- Sem contatos com patrocinadores
- Instagram @orbitalroxa.gg com 0 posts
- Sem fotos profissionais do evento (só celular)
- Sem experiência formal em marketing

MARCA DE ROUPA:
- Camisetas oversized streetwear com referências a CS2
- Produtos prontos em mãos, sem loja online ainda
- 3 vendas no Cup #1

PATROCÍNIO (o que podem oferecer de verdade):
- Logo no site orbitalroxa.com.br
- Banner nos mapas do servidor CS2
- Banner presencial no evento
- Anúncio na live (120+ viewers)
- Produto à venda no dia

CUP #2:
- Maio 2026, mesmo formato (8 times DE), inscrição R$500/time
- Premiação alvo: R$2k (R$1.5k + R$500)
- Antes: tentar campeonato online via Faceit

VISÃO:
- 6 meses: mais gente, mais procura, Instagram ativo
- 1 ano: 20 PCs (10 próprios + 10 alugados), campeonatos maiores
- 3 anos: espaço físico próprio com bar gamer, 20 PCs, eventos regulares
- Sonho: espaço próprio, bar gamer, marca consolidada

REFERÊNCIAS: Santos Games, Alcans Games, ESL, ESL Brazil
COMUNIDADE: Grupo WhatsApp ativo, jogadores engajados, 16-40 anos
TOM DE VOZ (IMPORTANTE — seguir SEMPRE):
- Confiante, direto, com personalidade. NÃO infantilizado.
- Linguagem gamer adulta — usa termos de CS2 naturalmente (clutch, ace, GG, push, rotate) mas sem forçar
- Frases curtas e impactantes. Sem exclamação excessiva (máx 1 por caption)
- Emojis: 1-3 por caption, estratégicos, sem spam (🏆 💜 🎯 são ok, 🔥🔥🔥😱😱 não)
- NÃO usa: "INCRÍVEL!!!", "ARRASOU!!!", "QUE JOGÃO!!!", caps lock excessivo
- Estilo referência: FURIA, Loud, MIBR — profissional mas com personalidade
- Dados concretos sempre que possível (score, rating, kills)
- CTA sutil no final (link na bio, marca um amigo, stats no site)

Exemplo do tom CORRETO:
"CHOPPADAS leva o título do Cup #1 🏆

Grand Final 2x0 contra DoKuRosa
Mirage 13:10 | Inferno 13:11

14 partidas, 40 jogadores, uma noite inteira de CS puro.
O cenário de RP mostrou que tem nível.

Stats completas no site — link na bio.

#orbitalroxa #cs2 #ribeiraopreto"

Exemplo do tom ERRADO (nunca fazer):
"🏆🔥 CAMPEÃOOOOO!!! 💜💜💜 CHOPPADAS ARRASOU!!! 😱😱 Que jogão incrível!!! 🎮✨ Parabéns!!! 🙌🙌🙌"

REGRA FUNDAMENTAL: Nunca sugira algo que a crew não tem capacidade de fazer. Considere SEMPRE as limitações (orçamento, equipe, infraestrutura). Sugestões devem ser realistas e acionáveis com os recursos disponíveis.`;

async function callAI(prompt: string): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  const block = msg.content[0];
  return block.type === "text" ? block.text : "";
}


export async function POST(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  try {
    await ensureBrandTables();
    const { action, context } = await req.json();

    switch (action) {
      // ═══ INSTAGRAM: Caption, Prompt Imagem, Hashtags ═══
      case "gerar-caption": {
        const raw = await callAI(`Crie uma caption para Instagram da ORBITAL ROXA.

Post: "${context?.title || "Post"}"
Tipo: ${context?.post_type || "feed"}
${context?.extra_context ? `Contexto adicional: ${context.extra_context}` : ""}

DADOS REAIS DO CUP #1 (use quando relevante):
- Campeão: CHOPPADAS (2x0 na GF contra DoKuRosa)
- Grand Final: Mirage 13:10, Inferno 13:11
- MVP: leoking_ (1.39 rating, 153K, 54% HS)
- Top 5: leoking_ (1.39), linz1k (1.22), duum (1.19), pdX (1.15), nastyy (1.14)
- Play of Tournament: Lcszik444- ACE (5K, 4HS, wallbang AK-47)
- 14 partidas, 40 jogadores, 8 times, ~70 presentes, 120 viewers live
- Local: LAN house em Ribeirão Preto/SP

Regras:
- Seguir o TOM DE VOZ definido (confiante, adulto, direto, poucos emojis)
- Máximo 2200 caracteres
- CTA sutil no final
- NÃO ser genérico — usar dados específicos do post

Retorne APENAS a caption pronta.`);
        return NextResponse.json({ result: raw });
      }

      case "gerar-prompt-imagem": {
        const raw = await callAI(`Crie um prompt detalhado para gerar uma imagem no Midjourney/DALL-E para o seguinte post de Instagram da ORBITAL ROXA:
Título: ${context?.title || "Post"}
Tipo: ${context?.post_type || "feed"}
Caption: ${context?.caption || ""}

A imagem deve seguir a identidade visual:
- Tema: cyberpunk/gamer HUD, sci-fi
- Cores: roxo #A855F7 como destaque, fundo preto/escuro
- Estilo: moderno, gaming, esports
- Formato: 1080x1080 (feed) ou 1080x1920 (story/reel)

Retorne APENAS o prompt em inglês, otimizado pra geração de imagem. Sem explicação.`);
        return NextResponse.json({ result: raw });
      }

      case "gerar-hashtags": {
        const raw = await callAI(`Gere hashtags para o seguinte post de Instagram da ORBITAL ROXA:
Título: ${context?.title || "Post"}
Tipo: ${context?.post_type || "feed"}
Caption: ${context?.caption || ""}

Regras:
- Máximo 15 hashtags
- Mix de: CS2/gaming (alto alcance), local (Ribeirão Preto), nicho (esports amador), próprias (#ORBITALROXA #ORBITALCUP)
- Sem hashtags muito genéricas (#love, #instagood)

Retorne APENAS as hashtags separadas por espaço, sem explicação.`);
        return NextResponse.json({ result: raw });
      }

      // ═══ PATROCÍNIO: Buscar, Abordagem, Proposta ═══
      case "buscar-patrocinadores": {
        const raw = await callAI(`Sugira 8 patrocinadores potenciais REAIS para a ORBITAL ROXA em Ribeirão Preto/SP.

Foque em:
- Comércios locais de games/informática em RP
- Marcas de energético que patrocinam esports no Brasil
- Marcas de periféricos com programa de patrocínio acessível
- Comércios locais (pizzaria, barbearia, academia) que atendem público jovem

Para cada um, inclua:
- Nome real da empresa/marca
- Tipo (energetico/periferico/local/hardware)
- Valor estimado que pediríamos (R$300 a R$3.000)
- Por que faz sentido abordar

Retorne como texto organizado com ## para cada sponsor. Texto puro.`);
        return NextResponse.json({ result: raw });
      }

      case "gerar-abordagem": {
        const raw = await callAI(`Crie uma mensagem de abordagem (DM ou email curto) para o seguinte patrocinador potencial da ORBITAL ROXA:
Nome: ${context?.name || "Empresa"}
Tipo: ${context?.type || "local"}
Valor estimado: ${context?.estimated_value || "R$600"}

A mensagem deve:
- Ser informal mas profissional
- Mencionar o Cup #1 (70 jogadores, 120 viewers, 14 partidas)
- Mencionar a plataforma própria (orbitalroxa.com.br)
- Ser direta sobre o que queremos (patrocínio)
- Ser curta (máx 150 palavras)
- Ter CTA claro (pode mandar a proposta?)

Retorne APENAS a mensagem pronta pra copiar e enviar.`);
        return NextResponse.json({ result: raw });
      }

      case "gerar-proposta": {
        const raw = await callAI(`Crie uma proposta de patrocínio curta e objetiva para:
Nome: ${context?.name || "Empresa"}
Tipo: ${context?.type || "local"}
Pacote: ${context?.package_tier || "bronze"}

Pacotes disponíveis:
- Bronze (R$600): Logo site + 2 menções live + 1 post IG
- Prata (R$1.500): Bronze + banner mapa CS2 + banner presencial + 3 posts + venda no local
- Ouro (R$3.000): Naming rights + exclusividade + tudo

Inclua:
- O que é a ORBITAL ROXA (breve)
- Números do Cup #1
- O que o patrocinador recebe (detalhado pro pacote escolhido)
- Valor e forma de pagamento (PIX)
- Possibilidade de permuta com produtos

Retorne a proposta formatada e pronta pra enviar. Texto puro com headers.`);
        return NextResponse.json({ result: raw });
      }

      // ═══ ASSISTENTE: Análises gerais ═══
      case "analise-marca": {
        const raw = await callAI(`Analise o posicionamento atual da ORBITAL ROXA no mercado. Considere:
- Presença digital (Instagram 0 posts, site orbitalroxa.com.br ativo)
- Cup #1 realizado com sucesso (70 presenciais, 120 viewers)
- Plataforma própria como diferencial
- Marca de roupa streetwear
- Comunidade WhatsApp ativa
- Zero patrocinadores
- Informal, sem CNPJ

Faça uma análise honesta com pontos fortes, fracos e recomendações imediatas. Texto organizado com headers.`);
        return NextResponse.json({ result: raw });
      }

      case "analise-concorrentes": {
        const raw = await callAI(`Identifique e analise os concorrentes/referências da ORBITAL ROXA:
- Cena CS2 amadora de Ribeirão Preto e interior SP
- Organizadores de campeonatos LAN no Brasil
- Referências: Santos Games, Alcans Games, ESL Brazil

Para cada concorrente/referência:
- O que fazem
- Tamanho e alcance
- O que fazem melhor que a Orbital
- O que a Orbital faz melhor que eles
- O que podemos aprender

Texto organizado com headers.`);
        return NextResponse.json({ result: raw });
      }

      case "buscar-leads": {
        const raw = await callAI(`Sugira leads concretos para a ORBITAL ROXA captar para o Cup #2:

1. TIMES: onde encontrar times de CS2 na região de Ribeirão Preto/interior SP
2. JOGADORES: comunidades, grupos, discords onde divulgar
3. ESPECTADORES: como atrair mais viewers pra live
4. COMUNIDADES: grupos de CS2 brasileiros pra se conectar

Para cada lead, dê:
- Onde encontrar (link/plataforma)
- Como abordar
- Expectativa de conversão

Foque em ações gratuitas e realistas. Texto organizado.`);
        return NextResponse.json({ result: raw });
      }

      case "proximos-passos": {
        const raw = await callAI(`Baseado na situação atual da ORBITAL ROXA (19 de março 2026):
- Cup #1 finalizado com sucesso
- Instagram @orbitalroxa.gg com 0 posts
- Cup #2 planejado pra maio 2026
- R$500 de orçamento
- 0 patrocinadores

Liste os 10 próximos passos mais importantes em ordem de prioridade. Para cada:
- O que fazer (específico)
- Quem da crew faz (nastyy, Vancim, z1k4mem0, loko)
- Prazo (esta semana, próxima semana, este mês)
- Custo (R$0, R$X)

Seja prático e realista. Texto organizado.`);
        return NextResponse.json({ result: raw });
      }

      case "sugerir-midia": {
        // Buscar fotos/vídeos do Google Drive do Cup #1 via OAuth refresh
        let driveFiles: string[] = [];
        try {
          const GDRIVE_CLIENT_ID = process.env.GDRIVE_CLIENT_ID || "";
          const GDRIVE_CLIENT_SECRET = process.env.GDRIVE_CLIENT_SECRET || "";
          const GDRIVE_REFRESH_TOKEN = process.env.GDRIVE_REFRESH_TOKEN || "";
          const GDRIVE_FOLDER_ID = "1vflsspQiRLE1kVQhNYwsrOOZubxx4GGi";

          if (GDRIVE_REFRESH_TOKEN) {
            // Refresh access token
            const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                client_id: GDRIVE_CLIENT_ID,
                client_secret: GDRIVE_CLIENT_SECRET,
                refresh_token: GDRIVE_REFRESH_TOKEN,
                grant_type: "refresh_token",
              }),
            });
            const tokenData = await tokenRes.json();

            if (tokenData.access_token) {
              const driveRes = await fetch(
                `https://www.googleapis.com/drive/v3/files?q="${GDRIVE_FOLDER_ID}"+in+parents&fields=files(id,name,mimeType,thumbnailLink,webViewLink)&pageSize=100&orderBy=name`,
                { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
              );
              const driveData = await driveRes.json();
              driveFiles = (driveData.files || []).map((f: { name: string; mimeType: string; webViewLink?: string }) =>
                `${f.name} (${f.mimeType.includes("video") ? "VIDEO" : "FOTO"})${f.webViewLink ? ` — ${f.webViewLink}` : ""}`
              );
            }
          }
        } catch { /* Drive not available */ }

        const raw = await callAI(`O admin quer postar no Instagram da ORBITAL ROXA sobre:
"${context?.title || "Post do campeonato"}"

Temos ${driveFiles.length} arquivos de mídia do Cup #1 no Google Drive:
${driveFiles.length > 0 ? driveFiles.join("\n") : "Nenhum arquivo encontrado no Drive."}

Também temos 45 highlight clips de vídeo no site (partidas gravadas com HUD animado).

Com base no título do post, sugira:
1. Quais 2-3 arquivos do Drive seriam os melhores pra esse post (pelo nome/tipo)
2. Se algum highlight do site seria melhor (qual partida/jogador)
3. Dica de como usar a mídia (carrossel? vídeo com caption? foto única?)

Seja direto e objetivo.`);
        return NextResponse.json({ result: raw, driveFiles: driveFiles.slice(0, 10) });
      }

      case "gerar-cronograma": {
        const raw = await callAI(`Crie o cronograma detalhado da PRÓXIMA SEMANA para a ORBITAL ROXA.
Hoje é ${new Date().toLocaleDateString("pt-BR")}.

Distribua tarefas entre os 4 membros:
- nastyy (idealizador, visão)
- Vancim (dev web, marketing)
- z1k4mem0 (investidor, organizador)
- loko (operacional)

Inclua:
- Posts pra Instagram (título, tipo, horário)
- Tarefas de patrocínio
- Tarefas de organização Cup #2
- Tarefas de comunidade

Formato:
## Segunda
- [ ] Tarefa (Responsável) — Horário/Prazo

## Terça
...

Seja realista — cada pessoa tem no máximo 1-2h por dia pra dedicar.`);
        return NextResponse.json({ result: raw });
      }

      default:
        return NextResponse.json({ error: "Ação desconhecida: " + action }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro";
    console.error("[AI EXECUTE]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
