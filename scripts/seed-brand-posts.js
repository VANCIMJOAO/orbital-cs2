const mysql = require('mysql2/promise');

async function seed() {
  const conn = await mysql.createConnection('mysql://root:zeZFNxJOVxihnMXrLfvEqpRWmUaijZRx@hopper.proxy.rlwy.net:37565/railway');

  await conn.query('DELETE FROM brand_posts');
  console.log('Posts antigos limpos');

  const posts = [
    // SEMANA 1 (18-24 MAR)
    { title: 'Logo reveal + "Algo chegou em RP"', type: 'feed', date: '2026-03-20', time: '19:30', caption: '', hashtags: '' },
    { title: '"O que e a ORBITAL ROXA" - carousel 5 slides', type: 'feed', date: '2026-03-21', time: '19:30', caption: '', hashtags: '' },
    { title: 'Highlight ACE Lcszik444- (5K, 4HS, wallbang)', type: 'reel', date: '2026-03-22', time: '14:00', caption: '', hashtags: '' },
    { title: 'Foto do evento + numeros (70 players, 8 times, 120 viewers)', type: 'feed', date: '2026-03-23', time: '19:30', caption: '', hashtags: '' },

    // SEMANA 2 (25-31 MAR)
    { title: 'Top 5 plays Cup #1 - compilacao', type: 'reel', date: '2026-03-25', time: '14:00', caption: '', hashtags: '' },
    { title: 'Card resultado CHOPPADAS campeao (Mirage 13:10, Inferno 13:11)', type: 'feed', date: '2026-03-26', time: '19:30', caption: '', hashtags: '' },
    { title: 'Top 5 jogadores com stats (leoking 1.39, linz1k 1.22, duum 1.19)', type: 'feed', date: '2026-03-27', time: '19:30', caption: '', hashtags: '' },
    { title: 'Bastidores Cup #1 - fotos do Drive', type: 'story', date: '2026-03-28', time: '19:00', caption: '', hashtags: '' },
    { title: 'Compilacao clutches Cup #1', type: 'reel', date: '2026-03-29', time: '14:00', caption: '', hashtags: '' },
    { title: 'Camiseta oversized reveal - foto produto', type: 'feed', date: '2026-03-30', time: '19:30', caption: '', hashtags: '' },
    { title: '"Cup #2 chegando..." teaser', type: 'feed', date: '2026-03-31', time: '20:00', caption: '', hashtags: '' },

    // SEMANA 3-4 (1-14 ABR)
    { title: 'Player Spotlight: leoking_ (1.39 rating, 153K, 54% HS)', type: 'feed', date: '2026-04-01', time: '19:30', caption: '', hashtags: '' },
    { title: 'Player Spotlight: linz1k (1.22 rating, 136K)', type: 'feed', date: '2026-04-03', time: '19:30', caption: '', hashtags: '' },
    { title: 'Player Spotlight: duum (1.19 rating, 53K)', type: 'feed', date: '2026-04-05', time: '19:30', caption: '', hashtags: '' },
    { title: 'Highlight compilacao semana', type: 'reel', date: '2026-04-07', time: '14:00', caption: '', hashtags: '' },
    { title: 'Stats curiosas do Cup #1', type: 'feed', date: '2026-04-09', time: '19:30', caption: '', hashtags: '' },
    { title: 'Rivalidades do Cup #1 - quem quer revanche?', type: 'reel', date: '2026-04-11', time: '14:00', caption: '', hashtags: '' },

    // SEMANA 5-6 (15-30 ABR)
    { title: 'ANUNCIO OFICIAL: Cup #2 - data, local, inscricao', type: 'feed', date: '2026-04-15', time: '20:00', caption: '', hashtags: '' },
    { title: 'Como se inscrever no Cup #2 - tutorial', type: 'feed', date: '2026-04-17', time: '19:30', caption: '', hashtags: '' },
    { title: 'Time confirmado #1', type: 'feed', date: '2026-04-19', time: '19:30', caption: '', hashtags: '' },
    { title: 'Time confirmado #2', type: 'feed', date: '2026-04-21', time: '19:30', caption: '', hashtags: '' },
    { title: 'Time confirmado #3', type: 'feed', date: '2026-04-23', time: '19:30', caption: '', hashtags: '' },
    { title: 'Patrocinador reveal', type: 'feed', date: '2026-04-25', time: '19:30', caption: '', hashtags: '' },
    { title: 'Enquete: qual time vai ganhar o Cup #2?', type: 'story', date: '2026-04-27', time: '19:00', caption: '', hashtags: '' },
    { title: 'Prize pool anunciado', type: 'feed', date: '2026-04-29', time: '19:30', caption: '', hashtags: '' },

    // SEMANA 7-8 (1-15 MAI)
    { title: 'Countdown -5 dias pro Cup #2', type: 'story', date: '2026-05-05', time: '19:00', caption: '', hashtags: '' },
    { title: 'Countdown -3 dias', type: 'story', date: '2026-05-07', time: '19:00', caption: '', hashtags: '' },
    { title: 'Countdown -1 dia - AMANHA', type: 'story', date: '2026-05-09', time: '20:00', caption: '', hashtags: '' },
    { title: 'DIA DO EVENTO - ao vivo', type: 'story', date: '2026-05-10', time: '10:00', caption: '', hashtags: '' },
    { title: 'Resultado Cup #2 - campeao', type: 'feed', date: '2026-05-10', time: '23:00', caption: '', hashtags: '' },

    // SEMANA 9-12 (15 MAI - 15 JUN)
    { title: 'Highlight #1 Cup #2', type: 'reel', date: '2026-05-15', time: '14:00', caption: '', hashtags: '' },
    { title: 'Highlight #2 Cup #2', type: 'reel', date: '2026-05-16', time: '14:00', caption: '', hashtags: '' },
    { title: 'Highlight #3 Cup #2', type: 'reel', date: '2026-05-17', time: '14:00', caption: '', hashtags: '' },
    { title: 'Top 5 jogadores Cup #2', type: 'feed', date: '2026-05-18', time: '19:30', caption: '', hashtags: '' },
    { title: 'Obrigado patrocinador!', type: 'feed', date: '2026-05-20', time: '19:30', caption: '', hashtags: '' },
    { title: 'Feedback da galera - melhores momentos', type: 'reel', date: '2026-05-22', time: '14:00', caption: '', hashtags: '' },
    { title: 'Cup #3 - teaser "Ele vem ai..."', type: 'feed', date: '2026-05-30', time: '20:00', caption: '', hashtags: '' },
  ];

  for (const p of posts) {
    await conn.query(
      'INSERT INTO brand_posts (title, post_type, scheduled_date, scheduled_time, caption, hashtags) VALUES (?, ?, ?, ?, ?, ?)',
      [p.title, p.type, p.date, p.time, p.caption, p.hashtags]
    );
  }

  console.log('Inseridos ' + posts.length + ' posts do plano 90 dias');
  await conn.end();
}

seed().catch(console.error);
