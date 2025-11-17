const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function seedAudioAnalytics() {
  try {
    await client.connect();
    console.log("🔌 Connected to database for audio analytics seeding");

    // Get all exhibits and languages from database
    const exhibitsResult = await client.query('SELECT exhibit_id, title FROM exhibit ORDER BY exhibit_id');
    const languagesResult = await client.query('SELECT language_id, lang_code FROM language ORDER BY language_id');
    const usersResult = await client.query('SELECT user_id FROM "user" WHERE user_id > 2 ORDER BY user_id');
    
    const exhibits = exhibitsResult.rows;
    const languages = languagesResult.rows;
    const users = usersResult.rows;

    // Create language code to ID mapping
    const langCodeToId = {};
    languages.forEach(lang => {
      langCodeToId[lang.lang_code] = lang.language_id;
      // Handle simplified Chinese mapping
      if (lang.lang_code === 'zh-CN') {
        langCodeToId['zh'] = lang.language_id;
      }
    });

    console.log(`📊 Found ${exhibits.length} exhibits, ${languages.length} languages, ${users.length} users`);

    // Read actual audio files from the public/audios directory
    const audiosDir = path.join(__dirname, '..', 'public', 'audios');
    let audioFiles = [];
    
    try {
      audioFiles = fs.readdirSync(audiosDir).filter(file => file.endsWith('.mp3'));
      console.log(`🎵 Found ${audioFiles.length} audio files in public/audios`);
    } catch (error) {
      console.log("📁 No audio files directory found, creating sample records based on database");
    }

    // Clear existing audio records to avoid duplicates
    await client.query('DELETE FROM audio');
    console.log("🗑️ Cleared existing audio records");

    const audioInserts = [];
    const processedFiles = new Set();

    // Process actual audio files
    for (const audioFile of audioFiles) {
      // Parse filename patterns: audio-{exhibitId}-{langCode}-{timestamp}.mp3 or exhibit-{exhibitId}-{langCode}-{timestamp}.mp3
      const match = audioFile.match(/^(audio|exhibit)-(\d+)-([a-z]{2}|zh|ko)-(\d+)\.mp3$/);
      
      if (match) {
        const [, prefix, exhibitIdStr, langCode, timestamp] = match;
        const exhibitId = parseInt(exhibitIdStr);
        const languageId = langCodeToId[langCode];

        // Check if exhibit exists
        const exhibitExists = exhibits.find(e => e.exhibit_id == exhibitId);
        
        if (exhibitExists && languageId) {
          const fileKey = `${exhibitId}-${langCode}`;
          
          // Only add one audio record per exhibit-language combination (use the latest file)
          if (!processedFiles.has(fileKey)) {
            const audioTitle = `${exhibitExists.title} - ${langCode.toUpperCase()} Audio Guide`;
            const audioDescription = `Audio guide for ${exhibitExists.title} in ${langCode.toUpperCase()}`;
            const audioUrl = `/public/audios/${audioFile}`;
            
            audioInserts.push(`(${exhibitId}, ${languageId}, '${audioUrl}', '${audioTitle.replace(/'/g, "''")}', '${audioDescription.replace(/'/g, "''")}', CURRENT_TIMESTAMP - INTERVAL '${Math.floor(Math.random() * 30)} days')`);
            processedFiles.add(fileKey);
            
            console.log(`✅ Processed: ${audioFile} -> Exhibit ${exhibitId}, Language ${langCode}`);
          }
        } else {
          console.log(`⚠️ Skipped ${audioFile}: Exhibit ${exhibitId} or language ${langCode} not found in database`);
        }
      } else {
        console.log(`⚠️ Skipped ${audioFile}: Filename doesn't match expected pattern`);
      }
    }

    // If no audio files found or processed, create sample data
    if (audioInserts.length === 0) {
      console.log("📝 No matching audio files found, creating sample data for all exhibit-language combinations");
      
      for (const exhibit of exhibits.slice(0, 10)) { // Limit to first 10 exhibits for sample
        for (const language of languages.slice(0, 5)) { // Limit to first 5 languages
          const audioTitle = `${exhibit.title} - ${language.lang_code.toUpperCase()} Audio Guide`;
          const audioDescription = `Audio guide for ${exhibit.title} in ${language.lang_code.toUpperCase()}`;
          const audioUrl = `/public/audios/exhibit-${exhibit.exhibit_id}-${language.lang_code}-${Date.now()}.mp3`;
          
          audioInserts.push(`(${exhibit.exhibit_id}, ${language.language_id}, '${audioUrl}', '${audioTitle.replace(/'/g, "''")}', '${audioDescription.replace(/'/g, "''")}', CURRENT_TIMESTAMP - INTERVAL '${Math.floor(Math.random() * 90)} days')`);
        }
      }
    }

    console.log(`🎵 Creating ${audioInserts.length} audio records...`);

    // Insert audio records in batches
    const batchSize = 50;
    for (let i = 0; i < audioInserts.length; i += batchSize) {
      const batch = audioInserts.slice(i, i + batchSize);
      await client.query(`
        INSERT INTO audio (exhibit_id, language_id, file_url, title, description, created_at) VALUES
        ${batch.join(', ')};
      `);
    }

    console.log(`✅ Inserted ${audioInserts.length} audio records`);

    // Get all audio IDs for playback log generation
    const audioResult = await client.query('SELECT audio_id, exhibit_id, language_id FROM audio ORDER BY audio_id');
    const audioRecords = audioResult.rows;

    // Generate realistic audio playback logs
    console.log("🎧 Generating audio playback logs...");
    
    const playbackLogs = [];
    const totalLogs = 2500; // Generate 2500 playback events

    // Create weighted distribution for more realistic data
    const popularExhibits = exhibits.slice(0, 8); // First 8 exhibits are more popular
    const popularLanguages = languages.slice(0, 4); // First 4 languages are more popular

    for (let i = 0; i < totalLogs; i++) {
      // Bias towards popular exhibits (70% chance)
      const usePopularExhibit = Math.random() < 0.7;
      const selectedExhibits = usePopularExhibit ? popularExhibits : exhibits;
      const randomExhibit = selectedExhibits[Math.floor(Math.random() * selectedExhibits.length)];

      // Bias towards popular languages (80% chance)
      const usePopularLanguage = Math.random() < 0.8;
      const selectedLanguages = usePopularLanguage ? popularLanguages : languages;
      const randomLanguage = selectedLanguages[Math.floor(Math.random() * selectedLanguages.length)];

      // Find corresponding audio record
      const audioRecord = audioRecords.find(a => 
        a.exhibit_id == randomExhibit.exhibit_id && a.language_id == randomLanguage.language_id
      );

      if (audioRecord) {
        // Random user
        const randomUser = users[Math.floor(Math.random() * users.length)];
        
        // Generate realistic listening session
        const daysAgo = Math.floor(Math.random() * 60); // Last 60 days
        const hoursAgo = Math.floor(Math.random() * 24);
        const minutesAgo = Math.floor(Math.random() * 60);
        
        const audioStart = `CURRENT_TIMESTAMP - INTERVAL '${daysAgo} days' - INTERVAL '${hoursAgo} hours' - INTERVAL '${minutesAgo} minutes'`;
        
        // Realistic listen duration (30 seconds to 8 minutes)
        const baseDuration = Math.floor(Math.random() * 420) + 30; // 30-450 seconds
        const actualDuration = Math.max(15, Math.floor(baseDuration * (0.3 + Math.random() * 0.7))); // 15 seconds minimum
        
        const audioEnd = `${audioStart} + INTERVAL '${actualDuration} seconds'`;
        
        playbackLogs.push(`(${randomUser.user_id}, ${audioRecord.audio_id}, ${audioStart}, ${audioEnd}, ${actualDuration}, ${audioStart})`);
      }
    }

    // Insert playback logs in batches
    console.log(`📝 Inserting ${playbackLogs.length} playback logs...`);
    
    for (let i = 0; i < playbackLogs.length; i += batchSize) {
      const batch = playbackLogs.slice(i, i + batchSize);
      await client.query(`
        INSERT INTO audio_playback_logs (user_id, audio_id, audio_start, audio_end, duration_listened, created_at) VALUES
        ${batch.join(', ')};
      `);
      
      // Progress indicator
      if ((i + batchSize) % 500 === 0 || i + batchSize >= playbackLogs.length) {
        console.log(`   ... inserted ${Math.min(i + batchSize, playbackLogs.length)} / ${playbackLogs.length} logs`);
      }
    }

    // Generate some additional recent activity for better demo
    console.log("🕒 Adding recent activity logs...");
    
    const recentLogs = [];
    for (let i = 0; i < 100; i++) {
      const randomAudio = audioRecords[Math.floor(Math.random() * audioRecords.length)];
      const randomUser = users[Math.floor(Math.random() * users.length)];
      
      // Recent activity (last 7 days)
      const hoursAgo = Math.floor(Math.random() * 168); // 7 days = 168 hours
      const audioStart = `CURRENT_TIMESTAMP - INTERVAL '${hoursAgo} hours'`;
      
      const duration = Math.floor(Math.random() * 300) + 30; // 30-330 seconds
      const audioEnd = `${audioStart} + INTERVAL '${duration} seconds'`;
      
      recentLogs.push(`(${randomUser.user_id}, ${randomAudio.audio_id}, ${audioStart}, ${audioEnd}, ${duration}, ${audioStart})`);
    }

    await client.query(`
      INSERT INTO audio_playback_logs (user_id, audio_id, audio_start, audio_end, duration_listened, created_at) VALUES
      ${recentLogs.join(', ')};
    `);

    // Insert some sample audit logs for audio-related activities
    console.log("📋 Adding audio-related audit logs...");
    
    const adminUsers = await client.query('SELECT user_id, username FROM "user" WHERE user_id <= 2');
    const auditLogInserts = [];
    
    // Generate realistic audit logs for audio activities
    const audioActions = [
      { action: 'create', resource: 'audio', description: 'New audio guide uploaded' },
      { action: 'update', resource: 'audio', description: 'Audio guide updated' },
      { action: 'generate_tts', resource: 'audio', description: 'Text-to-speech generated' },
      { action: 'upload', resource: 'audio', description: 'Audio file uploaded' },
      { action: 'create', resource: 'exhibit', description: 'New exhibit created' }
    ];

    for (let i = 0; i < 25; i++) {
      const randomAction = audioActions[Math.floor(Math.random() * audioActions.length)];
      const randomAdmin = adminUsers.rows[Math.floor(Math.random() * adminUsers.rows.length)];
      const randomUser = Math.random() < 0.3 ? users[Math.floor(Math.random() * users.length)] : null;
      
      const hoursAgo = Math.floor(Math.random() * 72); // Last 3 days
      const timestamp = `CURRENT_TIMESTAMP - INTERVAL '${hoursAgo} hours'`;
      
      const changes = JSON.stringify({
        resource_id: Math.floor(Math.random() * 100) + 1,
        description: randomAction.description
      });
      
      const metadata = JSON.stringify({
        ip_address: `192.168.1.${Math.floor(Math.random() * 200) + 1}`,
        user_agent: 'AudioMuseumApp/1.0'
      });

      auditLogInserts.push(
        `(${randomAdmin.user_id}, ${randomUser ? randomUser.user_id : 'NULL'}, '${randomAction.resource}', '${randomAction.action}', '${changes.replace(/'/g, "''")}', '${metadata.replace(/'/g, "''")}', ${timestamp})`
      );
    }

    await client.query(`
      INSERT INTO audit_logs (admin_user_id, target_user_id, resource, action, changes, metadata, timestamp) VALUES
      ${auditLogInserts.join(', ')};
    `);

    console.log("✅ Audio analytics seeding complete!");
    console.log("📈 Generated data includes:");
    console.log(`   - ${audioRecords.length} audio guides (${exhibits.length} exhibits × ${languages.length} languages)`);
    console.log(`   - ${playbackLogs.length + recentLogs.length} audio playback sessions`);
    console.log(`   - ${auditLogInserts.length} audio-related audit log entries`);
    console.log("   - Realistic listening patterns with popular exhibits and languages");
    console.log("   - Recent activity for real-time demo purposes");
    
  } catch (err) {
    console.error("❌ Error during audio analytics seeding:", err);
    throw err;
  } finally {
    await client.end();
  }
}

seedAudioAnalytics().catch(console.error);