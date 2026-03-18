import { dbPool } from "@/lib/tournaments-db";

let tablesEnsured = false;

export async function ensureBrandTables() {
  if (tablesEnsured) return;

  try {
    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS brand_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        done BOOLEAN DEFAULT FALSE,
        due_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS brand_checklist (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        done BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS brand_sponsors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100),
        value VARCHAR(50),
        status ENUM('prospect','contact','nego','closed','lost') DEFAULT 'prospect',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS brand_posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        caption TEXT,
        post_type ENUM('feed','story','reel') DEFAULT 'feed',
        hashtags TEXT,
        scheduled_for DATETIME,
        posted BOOLEAN DEFAULT FALSE,
        posted_at DATETIME,
        instagram_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS brand_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        section VARCHAR(50) NOT NULL,
        content TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Seed default data if tables are empty
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
    const defaultTasks = [
      // Semana 1
      { category: "semana1", title: "Definir data e formato da Cup #2", description: "BO1 groups + BO3 playoffs" },
      { category: "semana1", title: "Criar arte de anúncio da Cup #2", description: "Post feed + story" },
      { category: "semana1", title: "Publicar anúncio nas redes sociais", description: "Instagram, Twitter, Discord" },
      { category: "semana1", title: "Abrir inscrições no site", description: "Formulário + pagamento" },
      // Semana 2
      { category: "semana2", title: "Contatar potenciais patrocinadores", description: "Enviar proposta comercial" },
      { category: "semana2", title: "Criar conteúdo de bastidores", description: "Stories mostrando preparação" },
      { category: "semana2", title: "Definir premiação e regulamento", description: "Documento oficial" },
      // Semana 3
      { category: "semana3", title: "Fechar parcerias de mídia", description: "Streamers e casters" },
      { category: "semana3", title: "Criar grade de conteúdo semanal", description: "3 posts/semana mínimo" },
      { category: "semana3", title: "Testar servidores e configurações", description: "MatchZy configs" },
      // Semana 4
      { category: "semana4", title: "Divulgação final das inscrições", description: "Countdown + urgência" },
      { category: "semana4", title: "Sortear grupos", description: "Live no Discord/Twitch" },
      { category: "semana4", title: "Publicar chaves e calendário", description: "No site e redes" },
      // Semana 5
      { category: "semana5", title: "Início das partidas - Fase de grupos", description: "Transmissão ao vivo" },
      { category: "semana5", title: "Postar highlights diários", description: "Reels com melhores jogadas" },
      { category: "semana5", title: "Engajar comunidade no Discord", description: "Polls, predictions" },
      // Semana 6
      { category: "semana6", title: "Playoffs e Grande Final", description: "Produção especial" },
      { category: "semana6", title: "Compilar estatísticas finais", description: "MVP, top fraggers, etc" },
      { category: "semana6", title: "Post-mortem e planejamento Cup #3", description: "Análise do que funcionou" },
    ];
    for (const t of defaultTasks) {
      await dbPool.execute(
        "INSERT INTO brand_tasks (category, title, description) VALUES (?, ?, ?)",
        [t.category, t.title, t.description]
      );
    }
  }

  // Seed checklist
  const [checkRows] = await dbPool.execute("SELECT COUNT(*) as cnt FROM brand_checklist");
  const checkCount = (checkRows as { cnt: number }[])[0].cnt;
  if (checkCount === 0) {
    const defaultChecklist = [
      // Identidade Visual
      { category: "identidade_visual", title: "Logo principal finalizada" },
      { category: "identidade_visual", title: "Paleta de cores definida (Purple #A855F7, Black #0A0A0A)" },
      { category: "identidade_visual", title: "Tipografia definida (Orbitron + JetBrains Mono + Inter)" },
      { category: "identidade_visual", title: "Templates de post para Instagram" },
      { category: "identidade_visual", title: "Overlay para transmissão" },
      { category: "identidade_visual", title: "Banner do Discord" },
      { category: "identidade_visual", title: "Thumbnail padrão para VODs" },
      // Presença Digital
      { category: "presenca_digital", title: "Instagram @orbitalroxa configurado" },
      { category: "presenca_digital", title: "Twitter/X @orbitalroxa configurado" },
      { category: "presenca_digital", title: "Discord servidor criado e configurado" },
      { category: "presenca_digital", title: "Canal Twitch configurado" },
      { category: "presenca_digital", title: "Site orbitalroxa.com.br no ar" },
      { category: "presenca_digital", title: "Google Analytics configurado" },
      // Patrocínio
      { category: "patrocinio", title: "Mídia kit / proposta comercial pronta" },
      { category: "patrocinio", title: "Lista de potenciais patrocinadores" },
      { category: "patrocinio", title: "Template de email para contato" },
      { category: "patrocinio", title: "Pacotes de patrocínio definidos (Bronze/Prata/Ouro)" },
      { category: "patrocinio", title: "Contrato modelo de patrocínio" },
    ];
    for (const c of defaultChecklist) {
      await dbPool.execute(
        "INSERT INTO brand_checklist (category, title) VALUES (?, ?)",
        [c.category, c.title]
      );
    }
  }

  // Seed sponsors
  const [sponsorRows] = await dbPool.execute("SELECT COUNT(*) as cnt FROM brand_sponsors");
  const sponsorCount = (sponsorRows as { cnt: number }[])[0].cnt;
  if (sponsorCount === 0) {
    const defaultSponsors = [
      { name: "HyperX", type: "Periférico", value: "R$1k-3k", status: "prospect" },
      { name: "Red Bull", type: "Energético", value: "R$2k-5k", status: "prospect" },
      { name: "Pichau", type: "Hardware", value: "R$500-1k", status: "prospect" },
    ];
    for (const s of defaultSponsors) {
      await dbPool.execute(
        "INSERT INTO brand_sponsors (name, type, value, status) VALUES (?, ?, ?, ?)",
        [s.name, s.type, s.value, s.status]
      );
    }
  }

  // Seed notes
  const [noteRows] = await dbPool.execute("SELECT COUNT(*) as cnt FROM brand_notes");
  const noteCount = (noteRows as { cnt: number }[])[0].cnt;
  if (noteCount === 0) {
    await dbPool.execute(
      "INSERT INTO brand_notes (section, content) VALUES (?, ?)",
      ["global", "Bem-vindo ao Command Center da ORBITAL ROXA! Use esta área para gerenciar toda a estratégia de marca."]
    );
    await dbPool.execute(
      "INSERT INTO brand_notes (section, content) VALUES (?, ?)",
      ["patrocinio", "Focar em marcas que atendem o público gamer. Periféricos, energéticos e hardware são os segmentos principais."]
    );
  }
}
