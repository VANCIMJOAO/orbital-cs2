const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const R2 = new S3Client({
  region: 'auto',
  endpoint: 'https://120b15bc353dbebd04f819bb60731725.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '5bd4579b66bd9c3fa26b1458aa180e65',
    secretAccessKey: 'c9891d5d263d0d1b1ee7039c2a562af870341ff6268100bb339825df746a34f7',
  },
});

const BUCKET = 'orbitalroxa';
const VIDEO_DIR = path.join(__dirname, 'highlights/final_videos');

async function upload() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [clips] = await conn.query('SELECT id, match_id, map_number, `rank`, player_name, video_file FROM highlight_clips WHERE status="ready" ORDER BY match_id, map_number, `rank`');

  console.log(`Total clips in DB: ${clips.length}`);
  console.log(`Starting uploads to R2...\n`);

  let uploaded = 0, skipped = 0, errors = 0;

  for (const clip of clips) {
    const folder = path.join(VIDEO_DIR, `match_${clip.match_id}_map_${clip.map_number}`);

    if (!fs.existsSync(folder)) {
      console.log(`SKIP: folder not found ${folder}`);
      skipped++;
      continue;
    }

    const files = fs.readdirSync(folder).filter(f => f.endsWith('.mp4'));
    const file = files.find(f => {
      const m = f.match(/highlight_m(\d+)_map(\d+)_r(\d+)_/);
      return m && parseInt(m[1]) === clip.match_id && parseInt(m[2]) === clip.map_number && parseInt(m[3]) === clip.rank;
    });

    if (!file) {
      console.log(`SKIP: no matching file for clip #${clip.id} (${clip.player_name}, rank ${clip.rank})`);
      skipped++;
      continue;
    }

    const filePath = path.join(folder, file);
    const r2Key = `highlights/${clip.video_file}`;
    const sizeMB = (fs.statSync(filePath).size / 1048576).toFixed(1);

    try {
      console.log(`[${uploaded + 1}/${clips.length}] Uploading ${r2Key} (${sizeMB}MB)...`);
      const buf = fs.readFileSync(filePath);
      await R2.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: r2Key,
        Body: buf,
        ContentType: 'video/mp4',
      }));
      uploaded++;
      console.log(`  ✓ Done`);
    } catch (e) {
      console.log(`  ✗ ERROR: ${e.message}`);
      errors++;
    }
  }

  console.log(`\n=============================`);
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Errors:   ${errors}`);
  console.log(`=============================`);

  await conn.end();
}

upload().catch(e => { console.error('FATAL:', e); process.exit(1); });
