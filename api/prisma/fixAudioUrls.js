const { Client } = require("pg");
require("dotenv").config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function fixAudioUrls() {
  try {
    await client.connect();
    console.log("🔌 Connected to database");

    // Update all audio file URLs to include the leading slash
    const result = await client.query(`
      UPDATE audio 
      SET file_url = '/' || file_url 
      WHERE file_url NOT LIKE '/public/%'
    `);

    console.log(`✅ Updated ${result.rowCount} audio records with leading slash`);

    // Show sample of updated records
    const sampleResult = await client.query(`
      SELECT audio_id, exhibit_id, file_url, title 
      FROM audio 
      WHERE exhibit_id IN (5, 1, 10) 
      ORDER BY exhibit_id, audio_id 
      LIMIT 5
    `);

    console.log("\n📋 Sample updated records:");
    sampleResult.rows.forEach(row => {
      console.log(`Audio ${row.audio_id}, Exhibit ${row.exhibit_id}: ${row.file_url}`);
      console.log(`  Title: ${row.title}`);
    });

    await client.end();
    console.log("\n✅ Audio URL fix complete!");
    
  } catch (error) {
    console.error("❌ Error fixing audio URLs:", error);
    process.exit(1);
  }
}

fixAudioUrls();