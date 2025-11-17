const { Client } = require("pg");
require("dotenv").config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function fixExistingAudioPaths() {
  try {
    await client.connect();
    console.log("🔌 Connected to database");

    // Fix audio URLs that start with /audios/ to /public/audios/
    const result = await client.query(`
      UPDATE audio 
      SET file_url = '/public' || file_url 
      WHERE file_url LIKE '/audios/%' AND file_url NOT LIKE '/public/%'
    `);

    console.log(`✅ Fixed ${result.rowCount} audio records with incorrect paths`);

    // Show sample of updated records
    const sampleResult = await client.query(`
      SELECT audio_id, exhibit_id, file_url, title 
      FROM audio 
      WHERE file_url LIKE '/public/audios/%' 
      ORDER BY audio_id DESC 
      LIMIT 3
    `);

    console.log("\n📋 Sample corrected records:");
    sampleResult.rows.forEach(row => {
      console.log(`Audio ${row.audio_id}, Exhibit ${row.exhibit_id}: ${row.file_url}`);
    });

    await client.end();
    console.log("\n✅ Audio path fix complete!");
    
  } catch (error) {
    console.error("❌ Error fixing audio paths:", error);
    process.exit(1);
  }
}

fixExistingAudioPaths();