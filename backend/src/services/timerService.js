const axios = require('axios');
const { getConfig, appendLog } = require('../utils/fileManager');

class TimerService {
  constructor() {
    this.dvbHost = null;
  }

  async initialize() {
    const config = await getConfig();
    this.dvbHost = config.dvbViewer.host;
    console.log(`🔧 Timer service initialized with DVB host: ${this.dvbHost}`);
  }

  /**
   * Create a timer in DVB Viewer
   */
  async createTimer(timerData) {
    if (!this.dvbHost) {
      await this.initialize();
    }

    try {
      const config = await getConfig();
      const dvbConfig = config.dvbViewer;

      // Build timer URL with all parameters
      const timerUrl = this.buildTimerUrl(timerData, dvbConfig);
      
      console.log(`⏰ Creating timer: ${timerData.title}`);
      console.log(`📡 URL: ${timerUrl}`);

      const response = await axios.get(timerUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'DVB-EPG-Manager/1.0'
        }
      });

      // Check if timer was created successfully
      const success = response.status === 200 && !response.data.includes('Error');
      
      if (success) {
        await appendLog(`Timer created: ${timerData.title} (${timerData.channel})`);
        console.log(`✅ Timer created successfully`);
        return { success: true, message: 'Timer created successfully' };
      } else {
        throw new Error('DVB Viewer returned error response');
      }

    } catch (error) {
      const errorMsg = `Failed to create timer: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      await appendLog(`Timer error: ${timerData.title} - ${error.message}`);
      
      return { 
        success: false, 
        message: errorMsg,
        error: error.message 
      };
    }
  }

  /**
   * Build DVB Viewer timer URL with all parameters
   */
  buildTimerUrl(timerData, dvbConfig) {
    const {
      channelId,
      title,
      date,
      startTime,
      endTime,
      epgBefore = dvbConfig.defaultPreBuffer || 5,
      epgAfter = dvbConfig.defaultPostBuffer || 10,
      folder = dvbConfig.defaultFolder || 'Auto',
      priority = dvbConfig.defaultPriority || 50,
      series = ''
    } = timerData;

    // Get DVB channel ID from mapping
    const channels = this.getChannelMapping();
    const dvbChannelId = channels[channelId]?.dvbId;
    
    if (!dvbChannelId) {
      throw new Error(`No DVB channel mapping found for channel ${channelId}`);
    }

    const params = new URLSearchParams({
      active: 'active',
      chid: dvbChannelId,
      title: title,
      dor: date, // Format: DD.MM.YYYY
      epgbefore: epgBefore.toString(),
      starttime: startTime, // Format: HH:MM
      endtime: endTime,     // Format: HH:MM
      epgafter: epgAfter.toString(),
      Exitaktion: '0',       // No action after recording
      searchaction: 'none',  // No post-processing
      Aufnahmeaktion: '0',   // Record
      folder: folder,
      scheme: '%year-%date_%time_%station_%name',
      Series: series,
      TVFormat: '1',         // TS, MPEG2 Video as MPG
      RadioFormat: '0',      // MP2/MP3/AAC/AC3
      RecAllAudio: 'checkbox', // Record all audio tracks
      RecEITEPG: 'checkbox',   // Record EPG data
      prio: priority.toString(),
      aktion: 'timer_add',
      source: 'timer_add',
      referer: encodeURIComponent(`http://${this.dvbHost}/timer_list.html?aktion=timer_list`),
      timer_id: '',
      do: 'true',
      timertype: '0',
      save: 'Speichern',
      pdc: '',
      epgevent: '',
      _: Date.now().toString()
    });

    return `http://${this.dvbHost}/timer_new.html?${params.toString()}`;
  }

  /**
   * Get channel mapping from config
   */
  async getChannelMapping() {
    try {
      const channels = await require('../utils/fileManager').readJsonFile('channels.json');
      return channels;
    } catch (error) {
      console.error('Error loading channel mapping:', error);
      return {};
    }
  }

  /**
   * Test DVB Viewer connection
   */
  async testConnection() {
    if (!this.dvbHost) {
      await this.initialize();
    }

    try {
      const testUrl = `http://${this.dvbHost}/timer_list.html`;
      
      console.log(`🔍 Testing DVB Viewer connection: ${testUrl}`);
      
      const response = await axios.get(testUrl, {
        timeout: 5000,
        headers: {
          'User-Agent': 'DVB-EPG-Manager/1.0'
        }
      });

      const isAlive = response.status === 200;
      
      if (isAlive) {
        console.log(`✅ DVB Viewer connection successful`);
      } else {
        console.log(`❌ DVB Viewer connection failed`);
      }

      return {
        success: isAlive,
        status: response.status,
        host: this.dvbHost
      };

    } catch (error) {
      const errorMsg = `DVB Viewer connection failed: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      
      return {
        success: false,
        error: error.message,
        host: this.dvbHost
      };
    }
  }

  /**
   * Parse time from EPG format (HH:MM) and add date
   */
  parseDateTime(date, time) {
    // date format: DD.MM.YYYY
    // time format: HH:MM
    
    const [day, month, year] = date.split('.');
    const [hours, minutes] = time.split(':');
    
    return new Date(
      parseInt(year),
      parseInt(month) - 1, // Month is 0-indexed
      parseInt(day),
      parseInt(hours),
      parseInt(minutes)
    );
  }

  /**
   * Format date for DVB Viewer (DD.MM.YYYY)
   */
  formatDate(date) {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  }

  /**
   * Format time for DVB Viewer (HH:MM)
   */
  formatTime(date) {
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Calculate end time from start time and duration
   */
  calculateEndTime(startTime, durationMinutes) {
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    return this.formatTime(end);
  }
}

module.exports = new TimerService();