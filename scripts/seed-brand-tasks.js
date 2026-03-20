const mysql = require('mysql2/promise');

async function seed() {
  const conn = await mysql.createConnection('mysql://root:zeZFNxJOVxihnMXrLfvEqpRWmUaijZRx@hopper.proxy.rlwy.net:37565/railway');

  await conn.query('DELETE FROM brand_tasks');
  console.log('Tasks antigas limpas');

  const tasks = [
    // FASE 1 - SEMANA 1 (18-24 MAR)
    { title: 'Logo reveal + "Algo chegou em RP" - post feed', cat: 'instagram', pri: 'high', w: 1, wl: 'Semana 1 - Presenca Digital', wd: '18-24 MAR 2026' },
    { title: '"O que e a ORBITAL ROXA" - carousel 5 slides (origem, crew, plataforma, cup #1, futuro)', cat: 'conteudo', pri: 'high', w: 1, wl: 'Semana 1 - Presenca Digital', wd: '18-24 MAR 2026' },
    { title: 'Highlight ACE Lcszik444- (5K, 4HS, wallbang) - reels 30s', cat: 'conteudo', pri: 'high', w: 1, wl: 'Semana 1 - Presenca Digital', wd: '18-24 MAR 2026' },
    { title: 'Foto do evento + numeros (70/8/120) - post feed', cat: 'instagram', pri: 'high', w: 1, wl: 'Semana 1 - Presenca Digital', wd: '18-24 MAR 2026' },
    { title: 'Configurar bio: CS2 Ribeirao Preto | Cup #1 | Cup #2 em breve | orbitalroxa.com.br', cat: 'instagram', pri: 'high', w: 1, wl: 'Semana 1 - Presenca Digital', wd: '18-24 MAR 2026' },
    { title: 'Criar Highlights do perfil: CUP #1, HIGHLIGHTS, LOJA', cat: 'instagram', pri: 'med', w: 1, wl: 'Semana 1 - Presenca Digital', wd: '18-24 MAR 2026' },
    { title: 'Definir data exata do Cup #2 (reuniao com grupo)', cat: 'campeonato', pri: 'high', w: 1, wl: 'Semana 1 - Presenca Digital', wd: '18-24 MAR 2026' },
    { title: 'Listar 5 comercios locais pra abordar (loja game, pizzaria, barbearia, energetico, informatica)', cat: 'negocio', pri: 'med', w: 1, wl: 'Semana 1 - Presenca Digital', wd: '18-24 MAR 2026' },

    // FASE 1 - SEMANA 2 (25-31 MAR)
    { title: 'Top 5 plays Cup #1 - reels 45s compilacao', cat: 'conteudo', pri: 'high', w: 2, wl: 'Semana 2 - Conteudo + 1a Abordagem', wd: '25-31 MAR 2026' },
    { title: 'Card resultado CHOPPADAS campeao (Mirage 13:10, Inferno 13:11) - feed Canva', cat: 'conteudo', pri: 'high', w: 2, wl: 'Semana 2 - Conteudo + 1a Abordagem', wd: '25-31 MAR 2026' },
    { title: 'Top 5 jogadores com stats (leoking 1.39, linz1k 1.22, duum 1.19) - carousel', cat: 'conteudo', pri: 'high', w: 2, wl: 'Semana 2 - Conteudo + 1a Abordagem', wd: '25-31 MAR 2026' },
    { title: 'Bastidores Cup #1 - 5+ stories com fotos do Drive', cat: 'instagram', pri: 'med', w: 2, wl: 'Semana 2 - Conteudo + 1a Abordagem', wd: '25-31 MAR 2026' },
    { title: 'Compilacao clutches - reels 30s', cat: 'conteudo', pri: 'med', w: 2, wl: 'Semana 2 - Conteudo + 1a Abordagem', wd: '25-31 MAR 2026' },
    { title: 'Camiseta oversized reveal - post feed foto produto', cat: 'conteudo', pri: 'med', w: 2, wl: 'Semana 2 - Conteudo + 1a Abordagem', wd: '25-31 MAR 2026' },
    { title: '"Cup #2 chegando..." teaser - post feed arte simples', cat: 'instagram', pri: 'med', w: 2, wl: 'Semana 2 - Conteudo + 1a Abordagem', wd: '25-31 MAR 2026' },

    // FASE 2 - SEMANA 3-4 (1-14 ABR)
    { title: 'Abordar 5 comercios locais (DM/presencial)', cat: 'negocio', pri: 'high', w: 3, wl: 'Semana 3-4 - Patrocinio + Hype', wd: '1-14 ABR 2026' },
    { title: 'Abordar 2 marcas de energetico (Fusion, TNT)', cat: 'negocio', pri: 'high', w: 3, wl: 'Semana 3-4 - Patrocinio + Hype', wd: '1-14 ABR 2026' },
    { title: 'Abordar 2 marcas de periferico (Redragon, Rise Mode)', cat: 'negocio', pri: 'med', w: 3, wl: 'Semana 3-4 - Patrocinio + Hype', wd: '1-14 ABR 2026' },
    { title: 'Continuar 3-4 posts/semana + stories diarios', cat: 'instagram', pri: 'high', w: 3, wl: 'Semana 3-4 - Patrocinio + Hype', wd: '1-14 ABR 2026' },
    { title: 'Player spotlights (leoking, linz1k, duum) - feed posts', cat: 'conteudo', pri: 'med', w: 3, wl: 'Semana 3-4 - Patrocinio + Hype', wd: '1-14 ABR 2026' },

    // FASE 2 - SEMANA 5-6 (15-30 ABR)
    { title: 'Anuncio oficial Cup #2 (data, local, inscricao, premiacao)', cat: 'campeonato', pri: 'high', w: 5, wl: 'Semana 5-6 - Inscricoes + Divulgacao', wd: '15-30 ABR 2026' },
    { title: 'Abrir inscricoes Cup #2', cat: 'campeonato', pri: 'high', w: 5, wl: 'Semana 5-6 - Inscricoes + Divulgacao', wd: '15-30 ABR 2026' },
    { title: 'Divulgar nos grupos WhatsApp + Discord/FB CS2 da regiao', cat: 'campeonato', pri: 'high', w: 5, wl: 'Semana 5-6 - Inscricoes + Divulgacao', wd: '15-30 ABR 2026' },
    { title: 'Revelar times confirmados (1 post por time)', cat: 'conteudo', pri: 'med', w: 5, wl: 'Semana 5-6 - Inscricoes + Divulgacao', wd: '15-30 ABR 2026' },
    { title: 'Revelar patrocinador (se fechou)', cat: 'instagram', pri: 'med', w: 5, wl: 'Semana 5-6 - Inscricoes + Divulgacao', wd: '15-30 ABR 2026' },
    { title: 'Meta: 8 times inscritos', cat: 'campeonato', pri: 'high', w: 5, wl: 'Semana 5-6 - Inscricoes + Divulgacao', wd: '15-30 ABR 2026' },

    // FASE 3 - SEMANA 7-8 (1-15 MAI)
    { title: 'Testar servidor + plataforma completa', cat: 'tech', pri: 'high', w: 7, wl: 'Semana 7-8 - Cup #2', wd: '1-15 MAI 2026' },
    { title: 'Confirmar 8 times inscritos', cat: 'campeonato', pri: 'high', w: 7, wl: 'Semana 7-8 - Cup #2', wd: '1-15 MAI 2026' },
    { title: 'Countdown stories (5 dias antes)', cat: 'instagram', pri: 'med', w: 7, wl: 'Semana 7-8 - Cup #2', wd: '1-15 MAI 2026' },
    { title: 'Preparar banners patrocinador (mapa + presencial)', cat: 'negocio', pri: 'med', w: 7, wl: 'Semana 7-8 - Cup #2', wd: '1-15 MAI 2026' },
    { title: 'Comprar mercado (comida/bebida pra vender)', cat: 'campeonato', pri: 'high', w: 7, wl: 'Semana 7-8 - Cup #2', wd: '1-15 MAI 2026' },
    { title: 'Levar camisetas pra vender no evento', cat: 'negocio', pri: 'med', w: 7, wl: 'Semana 7-8 - Cup #2', wd: '1-15 MAI 2026' },
    { title: 'DIA DO EVENTO - Live Twitch + Stories ao vivo + Fotos', cat: 'campeonato', pri: 'high', w: 7, wl: 'Semana 7-8 - Cup #2', wd: '1-15 MAI 2026' },
    { title: 'Postar resultado no Instagram (mesmo dia)', cat: 'instagram', pri: 'high', w: 7, wl: 'Semana 7-8 - Cup #2', wd: '1-15 MAI 2026' },

    // FASE 4 - SEMANA 9-12 (15 MAI - 15 JUN)
    { title: 'Publicar highlights na plataforma + 1 por dia no IG', cat: 'conteudo', pri: 'high', w: 9, wl: 'Semana 9-12 - Capitalizacao', wd: '15 MAI - 15 JUN 2026' },
    { title: 'Player spotlights top 5 Cup #2', cat: 'conteudo', pri: 'med', w: 9, wl: 'Semana 9-12 - Capitalizacao', wd: '15 MAI - 15 JUN 2026' },
    { title: 'Pesquisa de feedback (Google Forms no WhatsApp)', cat: 'campeonato', pri: 'med', w: 9, wl: 'Semana 9-12 - Capitalizacao', wd: '15 MAI - 15 JUN 2026' },
    { title: 'Reuniao com patrocinador (mostrar resultados, propor Cup #3)', cat: 'negocio', pri: 'high', w: 9, wl: 'Semana 9-12 - Capitalizacao', wd: '15 MAI - 15 JUN 2026' },
    { title: 'Agradecer patrocinador publicamente no IG', cat: 'instagram', pri: 'med', w: 9, wl: 'Semana 9-12 - Capitalizacao', wd: '15 MAI - 15 JUN 2026' },
    { title: 'Teaser Cup #3', cat: 'conteudo', pri: 'med', w: 9, wl: 'Semana 9-12 - Capitalizacao', wd: '15 MAI - 15 JUN 2026' },
    { title: 'Meta: 500 seguidores no Instagram', cat: 'instagram', pri: 'high', w: 9, wl: 'Semana 9-12 - Capitalizacao', wd: '15 MAI - 15 JUN 2026' },
  ];

  for (const t of tasks) {
    await conn.query(
      'INSERT INTO brand_tasks (title, category, priority, week, week_label, week_date) VALUES (?, ?, ?, ?, ?, ?)',
      [t.title, t.cat, t.pri, t.w, t.wl, t.wd]
    );
  }

  console.log('Inseridas ' + tasks.length + ' tasks do plano 90 dias');
  await conn.end();
}

seed().catch(console.error);
