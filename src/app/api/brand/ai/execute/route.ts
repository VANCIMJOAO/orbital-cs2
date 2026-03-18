import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { dbPool } from "@/lib/tournaments-db";
import { ensureBrandTables } from "../../init-db";
import { checkAdmin } from "../../auth";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

const BRAND_CONTEXT = `Você é o agente de marketing da ORBITAL ROXA — crew de campeonatos de CS2 em Ribeirão Preto/SP.
Cup #1: 40 jogadores, 8 times, CHOPPADAS campeão, 60+ presenciais, 120 pico live, R$4k receita.
Top 5: leoking_ (1.39), linz1k (1.22), duum (1.19), pdX (1.15), nastyy (1.14).
Plataforma: orbitalroxa.com.br (stats, highlights, bracket ao vivo).
Instagram: @orbitalroxa. Visual: cyberpunk, roxo #A855F7, Orbitron.
Próximo: Cup #2 (~Maio 2026), 16 times, 80 jogadores.
Pacotes patrocínio: Bronze R$500, Prata R$1000, Ouro R$2000+.
Região: Ribeirão Preto, Franca, Araraquara (interior SP).
SEMPRE responda em português brasileiro.`;

async function getBrandState() {
  const [tasks] = await dbPool.execute("SELECT title, category, done, week FROM brand_tasks ORDER BY week");
  const [checks] = await dbPool.execute("SELECT title, category, done FROM brand_checklist ORDER BY sort_order");
  const [sponsors] = await dbPool.execute("SELECT name, type, estimated_value, status FROM brand_sponsors");
  const [posts] = await dbPool.execute("SELECT title, post_type, scheduled_date, published FROM brand_posts ORDER BY scheduled_date");

  const t = tasks as { title: string; done: boolean; week: number }[];
  const c = checks as { title: string; done: boolean }[];
  const s = sponsors as { name: string; status: string }[];
  const p = posts as { title: string; published: boolean }[];

  return `Estado atual: ${t.filter(x=>x.done).length}/${t.length} tasks, ${c.filter(x=>x.done).length}/${c.length} checklist, ${s.length} sponsors (${s.filter(x=>x.status==="closed").length} fechados), ${p.length} posts (${p.filter(x=>x.published).length} publicados).`;
}

async function callAI(prompt: string): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: BRAND_CONTEXT,
    messages: [{ role: "user", content: prompt }],
  });
  const block = msg.content[0];
  return block.type === "text" ? block.text : "";
}

function parseJSON(text: string): unknown {
  // Extract JSON from markdown code blocks or raw text
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\[[\s\S]*\])/);
  if (match) {
    return JSON.parse(match[1].trim());
  }
  return JSON.parse(text.trim());
}

export async function POST(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  try {
    await ensureBrandTables();
    const { action } = await req.json();
    const state = await getBrandState();

    switch (action) {
      case "gerar-cronograma": {
        const raw = await callAI(`${state}

Gere um cronograma de 6 semanas para o Cup #2 da ORBITAL ROXA. Retorne APENAS um JSON array (sem texto extra):
[
  {"title":"texto da task","category":"instagram|conteudo|negocio|tech|campeonato","priority":"high|med|low","week":1,"week_label":"Semana 1 — Título","week_date":"18-24 MAR 2026"}
]
Gere entre 20 e 30 tasks distribuídas nas 6 semanas. Categorias: instagram, conteudo, negocio, tech, campeonato. Use datas reais começando da semana atual.`);

        const tasks = parseJSON(raw) as { title: string; category: string; priority: string; week: number; week_label: string; week_date: string }[];

        // Clear existing and insert new
        await dbPool.execute("DELETE FROM brand_tasks");
        let count = 0;
        for (const t of tasks) {
          await dbPool.execute(
            "INSERT INTO brand_tasks (title, category, priority, week, week_label, week_date) VALUES (?, ?, ?, ?, ?, ?)",
            [t.title, t.category || "conteudo", t.priority || "med", t.week || 1, t.week_label || "", t.week_date || ""]
          );
          count++;
        }
        return NextResponse.json({ ok: true, count, message: `${count} tasks criadas pela IA` });
      }

      case "gerar-posts": {
        const raw = await callAI(`${state}

Gere um plano de conteúdo para Instagram da @orbitalroxa para as próximas 2 semanas. Retorne APENAS um JSON array:
[
  {"title":"título do post","post_type":"feed|story|reel","scheduled_date":"2026-03-20","scheduled_time":"19:30","caption":"caption completa com emojis e CTA","hashtags":"#orbitalroxa #cs2 ..."}
]
Gere entre 10 e 15 posts. Use dados reais do Cup #1 (CHOPPADAS campeão, leoking_ MVP, etc). Horários: Feed 19h30 Ter/Qua/Sex, Reel 14h Sáb, Story outros dias. Max 1 feed/dia.`);

        const posts = parseJSON(raw) as { title: string; post_type: string; scheduled_date: string; scheduled_time: string; caption: string; hashtags: string }[];

        let count = 0;
        for (const p of posts) {
          await dbPool.execute(
            "INSERT INTO brand_posts (title, post_type, scheduled_date, scheduled_time, caption, hashtags) VALUES (?, ?, ?, ?, ?, ?)",
            [p.title, p.post_type || "feed", p.scheduled_date || null, p.scheduled_time || "19:30", p.caption || "", p.hashtags || ""]
          );
          count++;
        }
        return NextResponse.json({ ok: true, count, message: `${count} posts criados pela IA` });
      }

      case "prospectar-sponsors": {
        const raw = await callAI(`${state}

Gere uma lista de potenciais patrocinadores para a ORBITAL ROXA em Ribeirão Preto/SP. Retorne APENAS um JSON array:
[
  {"name":"Nome da Empresa","type":"periferico|energetico|hardware|vestuario|alimentacao|outro","estimated_value":"R$500-1k","notes":"Por que faz sentido + como abordar"}
]
Gere entre 10 e 15 prospects. Tipos de empresa: lojas de periféricos, energéticos, hardware, barbearias, academias, fast food, delivery, vestuário streetwear. Valores realistas (Bronze R$500, Prata R$1000, Ouro R$2000).`);

        const sponsors = parseJSON(raw) as { name: string; type: string; estimated_value: string; notes: string }[];

        let count = 0;
        for (const s of sponsors) {
          await dbPool.execute(
            "INSERT INTO brand_sponsors (name, type, estimated_value, status, notes) VALUES (?, ?, ?, 'prospect', ?)",
            [s.name, s.type || "outro", s.estimated_value || "A definir", s.notes || ""]
          );
          count++;
        }
        return NextResponse.json({ ok: true, count, message: `${count} prospects adicionados pela IA` });
      }

      case "revisar-checklist": {
        const [checks] = await dbPool.execute("SELECT id, title, category, done FROM brand_checklist ORDER BY sort_order");
        const checkList = checks as { id: number; title: string; category: string; done: boolean }[];

        const raw = await callAI(`${state}

Checklist atual:
${checkList.map(c => `- [${c.done ? "x" : " "}] ${c.title} (${c.category})`).join("\n")}

Analise o checklist e sugira itens adicionais que estão faltando. Retorne APENAS um JSON array com os novos itens:
[
  {"title":"título do item","category":"visual|digital|patrocinio|campeonato","priority":"high|med|low"}
]
Gere entre 5 e 10 novos itens que NÃO existem no checklist atual. Foque no que é mais importante para o Cup #2.`);

        const newItems = parseJSON(raw) as { title: string; category: string; priority: string }[];

        const [maxOrder] = await dbPool.execute("SELECT MAX(sort_order) as m FROM brand_checklist");
        let order = ((maxOrder as { m: number }[])[0]?.m || 0) + 1;
        let count = 0;
        for (const item of newItems) {
          await dbPool.execute(
            "INSERT INTO brand_checklist (title, category, priority, sort_order) VALUES (?, ?, ?, ?)",
            [item.title, item.category || "campeonato", item.priority || "med", order++]
          );
          count++;
        }
        return NextResponse.json({ ok: true, count, message: `${count} novos itens adicionados ao checklist` });
      }

      case "analise-geral": {
        const raw = await callAI(`${state}

Faça uma análise rápida da ORBITAL ROXA em 5 pontos:
1. PROGRESSO GERAL (como está o andamento baseado nos dados)
2. PRÓXIMAS PRIORIDADES (top 3 ações urgentes)
3. RISCOS (o que pode dar errado)
4. OPORTUNIDADES (o que aproveitar agora)
5. NOTA DE 0 A 10 (preparação para o Cup #2)

Retorne APENAS um JSON:
{"progresso":"texto","prioridades":["ação 1","ação 2","ação 3"],"riscos":["risco 1","risco 2"],"oportunidades":["oport 1","oport 2"],"nota":7,"resumo":"uma frase resumindo tudo"}`);

        const analysis = parseJSON(raw);
        return NextResponse.json({ ok: true, analysis });
      }

      default:
        return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro";
    console.error("[AI EXECUTE]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
