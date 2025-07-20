const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

// Default data structures
const defaultConfig = {
  dvbViewer: {
    host: process.env.DVB_VIEWER_HOST || 'localhost:8089',
    defaultFolder: 'Auto',
    defaultPriority: 50,
    defaultPreBuffer: 5,
    defaultPostBuffer: 10
  },
  epg: {
    cacheHours: parseInt(process.env.EPG_CACHE_HOURS) || 6,
    daysAhead: 7
  },
  channels: {}
};

const defaultTasks = {
  tasks: [],
  lastId: 0
};

const defaultChannels = {
  // Hörzu Channel ID -> DVB Viewer Channel ID mapping
  "37": { 
    name: "ZDF", 
    dvbId: "4135697148290266197",
    category: "öffentlich-rechtlich" 
  },
  "71": { 
    name: "Das Erste", 
    dvbId: "4135436344991125545",
    category: "öffentlich-rechtlich" 
  },
  "38": { 
    name: "RTL", 
    dvbId: "4135000000000000000",
    category: "privat" 
  }
  // Weitere Channels werden später hinzugefügt
};

/**
 * Ensures all data files exist with default content
 */
async function ensureDataFiles() {
  try {
    // Create data directory if it doesn't exist
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Check and create config.json
    await ensureFile('config.json', defaultConfig);
    
    // Check and create tasks.json
    await ensureFile('tasks.json', defaultTasks);
    
    // Check and create channels.json
    await ensureFile('channels.json', defaultChannels);
    
    console.log('✅ Data files initialized');
  } catch (error) {
    console.error('❌ Error initializing data files:', error);
    throw error;
  }
}

/**
 * Ensures a specific file exists with default content
 */
async function ensureFile(filename, defaultContent) {
  const filepath = path.join(DATA_DIR, filename);
  
  try {
    await fs.access(filepath);
    console.log(`📄 ${filename} exists`);
  } catch (error) {
    // File doesn't exist, create it
    await fs.writeFile(filepath, JSON.stringify(defaultContent, null, 2));
    console.log(`📄 Created ${filename}`);
  }
}

/**
 * Read JSON file
 */
async function readJsonFile(filename) {
  try {
    const filepath = path.join(DATA_DIR, filename);
    const data = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    throw error;
  }
}

/**
 * Write JSON file
 */
async function writeJsonFile(filename, data) {
  try {
    const filepath = path.join(DATA_DIR, filename);
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    console.log(`💾 Saved ${filename}`);
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
    throw error;
  }
}

/**
 * Append to log file
 */
async function appendLog(message) {
  try {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;
    const logPath = path.join(DATA_DIR, 'app.log');
    await fs.appendFile(logPath, logMessage);
  } catch (error) {
    console.error('Error writing to log:', error);
  }
}

/**
 * Get config value
 */
async function getConfig(key = null) {
  const config = await readJsonFile('config.json');
  return key ? config[key] : config;
}

/**
 * Update config value
 */
async function updateConfig(key, value) {
  const config = await readJsonFile('config.json');
  config[key] = value;
  await writeJsonFile('config.json', config);
}

module.exports = {
  ensureDataFiles,
  readJsonFile,
  writeJsonFile,
  appendLog,
  getConfig,
  updateConfig,
  DATA_DIR
};