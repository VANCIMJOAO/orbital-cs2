import { dbPool } from "@/lib/tournaments-db";

let tablesEnsured = false;

export async function ensureBrandTables() {
  if (tablesEnsured) {
    // Verify at least one table actually exists (cold start protection)
    try {
      await dbPool.execute("SELECT 1 FROM brand_tasks LIMIT 1");
      return;
    } catch {
      tablesEnsured = false; // Table doesn't exist, recreate
    }
  }

  try {
    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS brand_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category ENUM('instagram','conteudo','negocio','tech','campeonato') NOT NULL DEFAULT 'conteudo',
        priority ENUM('high','med','low') NOT NULL DEFAULT 'med',
        week INT NOT NULL DEFAULT 1,
        week_label VARCHAR(255) NOT NULL DEFAULT '',
        week_date VARCHAR(100) NOT NULL DEFAULT '',
        done BOOLEAN DEFAULT FALSE,
        done_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS brand_checklist (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category ENUM('visual','digital','patrocinio','campeonato') NOT NULL DEFAULT 'visual',
        priority ENUM('high','med','low') NOT NULL DEFAULT 'med',
        done BOOLEAN DEFAULT FALSE,
        done_at DATETIME,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS brand_sponsors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100),
        contact_name VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(100),
        estimated_value VARCHAR(100),
        actual_value INT,
        status ENUM('prospect','contact','nego','closed','lost') DEFAULT 'prospect',
        notes TEXT,
        package_tier VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        contacted_at DATETIME,
        closed_at DATETIME
      )
    `);

    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS brand_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        section_key VARCHAR(100) NOT NULL UNIQUE,
        content TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS brand_posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        post_type ENUM('feed','story','reel') DEFAULT 'feed',
        scheduled_date DATE,
        scheduled_time VARCHAR(10),
        caption TEXT,
        hashtags TEXT,
        published BOOLEAN DEFAULT FALSE,
        published_at DATETIME,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS brand_ai_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action_id VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content LONGTEXT,
        status ENUM('generating','ready','error') DEFAULT 'generating',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await seedDefaults();
  } catch (err) {
    console.error("[BRAND INIT]", err);
  }

  tablesEnsured = true;
}

async function seedDefaults() {
  // Seed tasks
  const [taskRows] = await dbPool.execute("SELECT COUNT(*) as cnt FROM brand_tasks");
  const taskCount = (taskRows as { cnt: number }[])[0].cnt;
  if (taskCount === 0) {
    const tasks = [
      // SEMANA 1
      { title: "Criar conta @orbitalroxa.gg no Instagram", category: "instagram", priority: "high", week: 1, week_label: "Semana 1 — Presença Digital", week_date: "18-24 MAR 2026" },
      { title: "Configurar bio com link do site", category: "instagram", priority: "high", week: 1, week_label: "Semana 1 — Presença Digital", week_date: "18-24 MAR 2026" },
      { title: "Postar card de resultado CHOPPADAS Cup #1", category: "conteudo", priority: "high", week: 1, week_label: "Semana 1 — Presença Digital", week_date: "18-24 MAR 2026" },
      { title: "Postar card Top 5 Jogadores", category: "conteudo", priority: "high", week: 1, week_label: "Semana 1 — Presença Digital", week_date: "18-24 MAR 2026" },
      { title: "Postar highlight Play of the Tournament (Lcszik444- ACE)", category: "conteudo", priority: "high", week: 1, week_label: "Semana 1 — Presença Digital", week_date: "18-24 MAR 2026" },
      { title: "Marcar todos os jogadores nas publicações", category: "instagram", priority: "med", week: 1, week_label: "Semana 1 — Presença Digital", week_date: "18-24 MAR 2026" },
      { title: "Definir orçamento alvo e data aproximada do Cup #2", category: "negocio", priority: "high", week: 1, week_label: "Semana 1 — Presença Digital", week_date: "18-24 MAR 2026" },
      // SEMANA 2
      { title: "Postar Reels com highlights em vídeo", category: "conteudo", priority: "high", week: 2, week_label: "Semana 2 — Conteúdo + 1ª Abordagem Patrocínio", week_date: "25-31 MAR 2026" },
      { title: "Story: bastidores do Cup #1", category: "instagram", priority: "med", week: 2, week_label: "Semana 2 — Conteúdo + 1ª Abordagem Patrocínio", week_date: "25-31 MAR 2026" },
      { title: "Post: stats curiosas do campeonato", category: "conteudo", priority: "med", week: 2, week_label: "Semana 2 — Conteúdo + 1ª Abordagem Patrocínio", week_date: "25-31 MAR 2026" },
      { title: "Listar 5 potenciais patrocinadores locais com contato", category: "negocio", priority: "high", week: 2, week_label: "Semana 2 — Conteúdo + 1ª Abordagem Patrocínio", week_date: "25-31 MAR 2026" },
      { title: "Fazer contato com 1º patrocinador com proposta", category: "negocio", priority: "high", week: 2, week_label: "Semana 2 — Conteúdo + 1ª Abordagem Patrocínio", week_date: "25-31 MAR 2026" },
      { title: "Negociar data e preço do local para Cup #2", category: "campeonato", priority: "high", week: 2, week_label: "Semana 2 — Conteúdo + 1ª Abordagem Patrocínio", week_date: "25-31 MAR 2026" },
      // SEMANA 3-4
      { title: "Publicar anúncio oficial Cup #2 com data e prize pool", category: "campeonato", priority: "high", week: 3, week_label: "Semana 3-4 — Hype + Inscrições", week_date: "1-15 ABR 2026" },
      { title: "Divulgar em grupos WhatsApp/Discord de CS2 da região", category: "campeonato", priority: "high", week: 3, week_label: "Semana 3-4 — Hype + Inscrições", week_date: "1-15 ABR 2026" },
      { title: "Abrir inscrições (formulário com Steam IDs, logo, contato)", category: "tech", priority: "high", week: 3, week_label: "Semana 3-4 — Hype + Inscrições", week_date: "1-15 ABR 2026" },
      { title: "Fechar negociação com pelo menos 1 patrocinador", category: "negocio", priority: "high", week: 3, week_label: "Semana 3-4 — Hype + Inscrições", week_date: "1-15 ABR 2026" },
      { title: "Postar apresentação dos times confirmados", category: "conteudo", priority: "med", week: 3, week_label: "Semana 3-4 — Hype + Inscrições", week_date: "1-15 ABR 2026" },
      { title: "Conteúdo de 'revanche' — rivalidades do Cup #1", category: "conteudo", priority: "med", week: 3, week_label: "Semana 3-4 — Hype + Inscrições", week_date: "1-15 ABR 2026" },
      // SEMANA 5-6
      { title: "Confirmar todos os times inscritos", category: "campeonato", priority: "high", week: 5, week_label: "Semana 5-6 — Produção + Countdown", week_date: "16-30 ABR 2026" },
      { title: "Testar servidor dedicado e stack completa", category: "tech", priority: "high", week: 5, week_label: "Semana 5-6 — Produção + Countdown", week_date: "16-30 ABR 2026" },
      { title: "Definir caster/comentarista para a live", category: "campeonato", priority: "med", week: 5, week_label: "Semana 5-6 — Produção + Countdown", week_date: "16-30 ABR 2026" },
      { title: "Planejar logística: lanche, bebida, crachás, banners", category: "campeonato", priority: "med", week: 5, week_label: "Semana 5-6 — Produção + Countdown", week_date: "16-30 ABR 2026" },
      { title: "Stories diários de countdown (5 dias antes)", category: "instagram", priority: "med", week: 5, week_label: "Semana 5-6 — Produção + Countdown", week_date: "16-30 ABR 2026" },
      { title: "Preparar banners com logo dos patrocinadores para o servidor", category: "negocio", priority: "med", week: 5, week_label: "Semana 5-6 — Produção + Countdown", week_date: "16-30 ABR 2026" },
    ];
    for (const t of tasks) {
      await dbPool.execute(
        "INSERT INTO brand_tasks (title, category, priority, week, week_label, week_date) VALUES (?, ?, ?, ?, ?, ?)",
        [t.title, t.category, t.priority, t.week, t.week_label, t.week_date]
      );
    }
  }

  // Seed checklist
  const [checkRows] = await dbPool.execute("SELECT COUNT(*) as cnt FROM brand_checklist");
  const checkCount = (checkRows as { cnt: number }[])[0].cnt;
  if (checkCount === 0) {
    const items = [
      // IDENTIDADE VISUAL
      { title: "Logo da Orbital Roxa definida", category: "visual", priority: "high", done: true, sort_order: 1 },
      { title: "Cores e fonte definidas (purple #A855F7, Orbitron, JetBrains Mono)", category: "visual", priority: "high", done: true, sort_order: 2 },
      { title: "Templates de post Instagram criados", category: "visual", priority: "high", done: false, sort_order: 3 },
      { title: "Foto de capa do Instagram (1080x1080 com logo)", category: "visual", priority: "high", done: false, sort_order: 4 },
      // PRESENÇA DIGITAL
      { title: "Criar @orbitalroxa.gg no Instagram", category: "digital", priority: "high", done: false, sort_order: 5 },
      { title: "Configurar bio com localização, link do site e descrição", category: "digital", priority: "high", done: false, sort_order: 6 },
      { title: "Site orbitalroxa.com.br no ar e funcionando", category: "digital", priority: "high", done: true, sort_order: 7 },
      { title: "Criar grupo WhatsApp 'Orbital Roxa CS2' para comunicados", category: "digital", priority: "med", done: false, sort_order: 8 },
      { title: "Criar servidor Discord Orbital Roxa", category: "digital", priority: "low", done: false, sort_order: 9 },
      // CAPTAÇÃO DE PATROCÍNIO
      { title: "Listar 10 potenciais patrocinadores locais com contato", category: "patrocinio", priority: "high", done: false, sort_order: 10 },
      { title: "Proposta de patrocínio personalizada pronta", category: "patrocinio", priority: "high", done: false, sort_order: 11 },
      { title: "1º contato feito com patrocinador prioritário", category: "patrocinio", priority: "high", done: false, sort_order: 12 },
      { title: "Pelo menos 1 patrocinador fechado antes do Cup #2", category: "patrocinio", priority: "high", done: false, sort_order: 13 },
      // ORGANIZAÇÃO CUP #2
      { title: "Definir data e local com confirmação formal", category: "campeonato", priority: "high", done: false, sort_order: 14 },
      { title: "Definir formato (16 times? grupos + playoffs?)", category: "campeonato", priority: "high", done: false, sort_order: 15 },
      { title: "Definir valor de inscrição e estrutura de premiação", category: "campeonato", priority: "high", done: false, sort_order: 16 },
      { title: "Criar formulário de inscrição online", category: "campeonato", priority: "med", done: false, sort_order: 17 },
      { title: "Definir caster/comentarista para a live", category: "campeonato", priority: "med", done: false, sort_order: 18 },
      { title: "Planejar venda de lanche/bebida no evento", category: "campeonato", priority: "low", done: false, sort_order: 19 },
    ];
    for (const c of items) {
      await dbPool.execute(
        "INSERT INTO brand_checklist (title, category, priority, done, done_at, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
        [c.title, c.category, c.priority, c.done, c.done ? new Date() : null, c.sort_order]
      );
    }
  }

  // Seed sponsors
  const [sponsorRows] = await dbPool.execute("SELECT COUNT(*) as cnt FROM brand_sponsors");
  const sponsorCount = (sponsorRows as { cnt: number }[])[0].cnt;
  if (sponsorCount === 0) {
    const sponsors = [
      { name: "Loja de Periférico Local", type: "periferico", estimated_value: "R$500-1k", status: "prospect" },
      { name: "Distribuidora Monster/Red Bull", type: "energetico", estimated_value: "R$500-2k", status: "prospect" },
      { name: "Loja de Informática", type: "hardware", estimated_value: "R$300-800", status: "prospect" },
    ];
    for (const s of sponsors) {
      await dbPool.execute(
        "INSERT INTO brand_sponsors (name, type, estimated_value, status) VALUES (?, ?, ?, ?)",
        [s.name, s.type, s.estimated_value, s.status]
      );
    }
  }

  // Seed posts
  const [postRows] = await dbPool.execute("SELECT COUNT(*) as cnt FROM brand_posts");
  const postCount = (postRows as { cnt: number }[])[0].cnt;
  if (postCount === 0) {
    const posts = [
      { title: "Card Resultado Cup #1", type: "feed", date: "2026-03-19", time: "19:30", caption: "🏆 ORBITAL ROXA CUP #1 — CAMPEÃO\n\nCHOPPADAS dominou o campeonato do começo ao fim e levou o título do nosso primeiro evento. 8 times, 40 players, uma noite inteira de CS2 puro.\n\nParabéns @iguizik @hoppe @leoking_ @sabiahzera @linz1k 💜\n\n📊 Stats completas em orbitalroxa.com.br\n🎬 Highlights disponíveis na plataforma", hashtags: "#orbitalroxa #cs2 #cs2brasil #counterstrike2 #ribeiraopreto #esportsbrasil #campeonatocs2 #lanhouse #gamer #cs2highlights #choppadas #orbitalroxacup" },
      { title: "Bastidores do evento", type: "story", date: "2026-03-20", time: "19:30", caption: "", hashtags: "#orbitalroxa #cs2 #bastidores #cs2brasil" },
      { title: "Highlight ACE Lcszik444-", type: "reel", date: "2026-03-21", time: "14:00", caption: "🎯 PLAY OF THE TOURNAMENT | ORBITAL ROXA CUP #1\n\nLcszik444- fechou o round 20 com um ACE impossível — 5 kills, 4 headshots, 1 wallbang com AK-47.\n\nScore de highlight: 243 pontos 🔥\n\nMIDWEST vs NOTAG | Dust2 | Round 20\n\nTodos os highlights do campeonato estão em orbitalroxa.com.br 👆", hashtags: "#orbitalroxa #cs2highlights #ace #cs2 #counterstrike2 #highlight #cs2brasil #ribeiraopreto #gaming #clutch #wallbang #ak47" },
      { title: "Top 5 Stats Cup #1", type: "feed", date: "2026-03-22", time: "19:00", caption: "📊 TOP 5 — ORBITAL ROXA CUP #1\n\nRating, kills e HS% dos melhores jogadores do campeonato. Os números não mentem.\n\n🥇 leoking_ — 1.39 rating | 153K | 54% HS\n🥈 linz1k — 1.22 rating | 136K | 44% HS\n🥉 duum — 1.19 rating | 53K | 49% HS\n4️⃣ pdX — 1.15 rating | 88K | 61% HS\n5️⃣ nastyy — 1.14 rating | 73K | 37% HS\n\nRanking completo em 👉 orbitalroxa.com.br", hashtags: "#orbitalroxa #cs2brasil #cs2stats #counterstrike2 #ribeiraopreto #ranking #campeonatocs2 #gamer #esports #cs2" },
      { title: "Enquete: qual foi o melhor mapa?", type: "story", date: "2026-03-23", time: "19:30", caption: "", hashtags: "#orbitalroxa #cs2 #enquete" },
      { title: "Player Spotlight: leoking_", type: "feed", date: "2026-03-24", time: "19:30", caption: "👤 PLAYER SPOTLIGHT | ORBITAL ROXA CUP #1\n\nleoking_ 💜\n\nO melhor jogador do campeonato em números:\n📊 Rating: 1.39\n💀 153 kills | 84 deaths | K/D 1.82\n🎯 54% headshot rate\n⚡ 104 ADR | 6 vitórias\n\nPerfil completo em orbitalroxa.com.br 👆", hashtags: "#orbitalroxa #cs2 #playerspotlight #cs2brasil #ribeiraopreto #counterstrike2 #esports #gamer #cs2stats #rating" },
      { title: "Highlights compilação Cup #1", type: "reel", date: "2026-03-26", time: "14:00", caption: "", hashtags: "#orbitalroxa #cs2highlights #cs2 #highlight #gaming" },
      { title: "Stats curiosas do campeonato", type: "feed", date: "2026-03-27", time: "19:30", caption: "", hashtags: "#orbitalroxa #cs2stats #cs2brasil #counterstrike2" },
      { title: "Em breve... Cup #2", type: "story", date: "2026-03-29", time: "20:00", caption: "", hashtags: "#orbitalroxa #cs2 #breve" },
      { title: "Teaser Cup #2", type: "feed", date: "2026-03-30", time: "20:00", caption: "🟣 Ele vem aí.\n\nORBITAL ROXA CUP #2 — em breve.\n\nQuem tá dentro? 👇", hashtags: "#orbitalroxa #cs2 #campeonato #ribeiraopreto #cs2brasil #counterstrike2 #orbitalroxacup #esports #breve #lanhouse" },
      { title: "Recap Cup #1 completo", type: "reel", date: "2026-03-31", time: "14:00", caption: "", hashtags: "#orbitalroxa #cs2 #recap #cs2brasil" },
      { title: "Inscrições Abertas! Cup #2", type: "feed", date: "2026-04-02", time: "19:30", caption: "", hashtags: "#orbitalroxa #cs2 #inscricoes #campeonatocs2 #ribeiraopreto" },
      { title: "Times inscritos ao vivo", type: "story", date: "2026-04-03", time: "19:30", caption: "", hashtags: "#orbitalroxa #cs2 #times" },
      { title: "Time confirmado #1", type: "feed", date: "2026-04-05", time: "19:30", caption: "", hashtags: "#orbitalroxa #cs2 #timeconfirmado" },
      { title: "Time confirmado #2", type: "feed", date: "2026-04-06", time: "19:30", caption: "", hashtags: "#orbitalroxa #cs2 #timeconfirmado" },
      { title: "Rivais do Cup #1 — revanche?", type: "reel", date: "2026-04-08", time: "14:00", caption: "", hashtags: "#orbitalroxa #cs2 #revanche #cs2brasil" },
      { title: "Prize pool anunciado", type: "feed", date: "2026-04-09", time: "19:30", caption: "", hashtags: "#orbitalroxa #cs2 #prizepool #campeonatocs2" },
      { title: "Patrocinador reveal", type: "story", date: "2026-04-11", time: "19:30", caption: "", hashtags: "#orbitalroxa #patrocinador #cs2" },
      { title: "Player Spotlight: linz1k", type: "feed", date: "2026-04-12", time: "19:30", caption: "", hashtags: "#orbitalroxa #cs2 #playerspotlight #cs2brasil" },
    ];
    for (const p of posts) {
      await dbPool.execute(
        "INSERT INTO brand_posts (title, post_type, scheduled_date, scheduled_time, caption, hashtags) VALUES (?, ?, ?, ?, ?, ?)",
        [p.title, p.type, p.date, p.time, p.caption, p.hashtags]
      );
    }
  }

  // Seed notes
  const [noteRows] = await dbPool.execute("SELECT COUNT(*) as cnt FROM brand_notes");
  const noteCount = (noteRows as { cnt: number }[])[0].cnt;
  if (noteCount === 0) {
    await dbPool.execute(
      "INSERT INTO brand_notes (section_key, content) VALUES (?, ?)",
      ["global", "Bem-vindo ao Command Center da ORBITAL ROXA! Use esta área para gerenciar toda a estratégia de marca."]
    );
    await dbPool.execute(
      "INSERT INTO brand_notes (section_key, content) VALUES (?, ?)",
      ["patrocinio", "Focar em marcas que atendem o público gamer. Periféricos, energéticos e hardware são os segmentos principais."]
    );
    await dbPool.execute(
      "INSERT INTO brand_notes (section_key, content) VALUES (?, ?)",
      ["cup2_date", "2026-05-15"]
    );
    await dbPool.execute(
      "INSERT INTO brand_notes (section_key, content) VALUES (?, ?)",
      ["desbloqueadores", JSON.stringify([
        { id: "instagram", label: "Instagram ativo", done: false },
        { id: "patrocinador", label: "1 patrocinador fechado", done: false },
        { id: "local", label: "Local negociado", done: false },
        { id: "divulgacao", label: "Divulgação regional", done: false },
      ])]
    );
  }
}
