const axios = require('axios');
const cheerio = require('cheerio');
const { appendLog } = require('../utils/fileManager');

class EPGService {
  constructor() {
    this.baseUrl = 'https://www.hoerzu.de/text/tv-programm';
    this.cache = new Map(); // In-memory cache
    this.cacheTimeout = 1000 * 60 * 60 * 6; // 6 hours
  }

  /**
   * Get EPG for a specific channel and day
   */
  async getEPG(channelId, day = 0, timeday = 'ganztags') {
    const cacheKey = `${channelId}-${day}-${timeday}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`📱 Cache hit for ${cacheKey}`);
        return cached.data;
      }
    }

    try {
      console.log(`🔄 Fetching EPG for channel ${channelId}, day ${day}`);
      
      const url = `${this.baseUrl}/sender.php`;
      const params = {
        newday: day,
        tvchannelid: channelId,
        timeday: timeday
      };

      const response = await axios.get(url, { 
        params,
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DVB-EPG-Manager/1.0)'
        }
      });

      const programs = this.parseEPGHtml(response.data, channelId, day);
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: programs,
        timestamp: Date.now()
      });

      await appendLog(`EPG fetched for channel ${channelId}, ${programs.length} programs`);
      return programs;

    } catch (error) {
      console.error(`❌ Error fetching EPG for channel ${channelId}:`, error.message);
      await appendLog(`EPG fetch error for channel ${channelId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse HTML response from Hörzu
   */
  parseEPGHtml(html, channelId, day) {
    const $ = cheerio.load(html);
    const programs = [];

    // Find all program links
    $('a[href*="detail.php"]').each((index, element) => {
      const $link = $(element);
      const href = $link.attr('href');
      const text = $link.text().trim();

      // Extract broadcast_id from href
      const broadcastMatch = href.match(/broadcast_id=(\d+)/);
      if (!broadcastMatch) return;

      const broadcastId = broadcastMatch[1];

      // Parse program text: "05:30 Uhr , ARD-Morgenmagazin , Information"
      const timeMatch = text.match(/^(\d{2}:\d{2})\s*Uhr\s*,\s*(.+?)\s*,\s*(.+)$/);
      if (!timeMatch) return;

      const [, time, title, genre] = timeMatch;

      programs.push({
        id: broadcastId,
        channelId: channelId,
        time: time,
        title: title.trim(),
        genre: genre.trim(),
        day: day,
        detailUrl: `${this.baseUrl}/${href}`
      });
    });

    // Extract channel name from page title/header
    let channelName = '';
    const headerMatch = html.match(/<h3>Sender\s+(.+?)\s+für/);
    if (headerMatch) {
      channelName = headerMatch[1];
    }

    console.log(`📺 Parsed ${programs.length} programs for ${channelName || `channel ${channelId}`}`);
    return {
      channelId,
      channelName,
      day,
      programs,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get program details
   */
  async getProgramDetails(broadcastId) {
    try {
      const url = `${this.baseUrl}/detail.php`;
      const params = {
        broadcast_id: broadcastId,
        seite: 's'
      };

      const response = await axios.get(url, { 
        params,
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DVB-EPG-Manager/1.0)'
        }
      });

      return this.parseProgramDetails(response.data);

    } catch (error) {
      console.error(`❌ Error fetching program details for ${broadcastId}:`, error.message);
      throw error;
    }
  }

  /**
   * Parse program detail HTML
   */
  parseProgramDetails(html) {
    const $ = cheerio.load(html);
    
    // Extract main info from bold header
    const headerText = $('.tabtextbold').text().trim();
    const headerMatch = headerText.match(/(\d{2}\.\d{2})\.\s+(\d{2}:\d{2})\s+Uhr\s*,\s*(.+?)\s*,\s*(.+?)\s*\./);
    
    let date, time, channel, title;
    if (headerMatch) {
      [, date, time, channel, title] = headerMatch;
    }

    // Extract description
    const description = $('p').first().text().trim();

    // Extract additional info (duration, format, etc.)
    const additionalInfo = [];
    $('br').each((i, elem) => {
      const nextText = $(elem).next().text();
      if (nextText && nextText.trim() && !nextText.includes('Zur')) {
        additionalInfo.push(nextText.trim());
      }
    });

    return {
      date,
      time,
      channel,
      title,
      description,
      additionalInfo: additionalInfo.join(' | ')
    };
  }

  /**
   * Search programs across multiple channels and days
   */
  async searchPrograms(query, options = {}) {
    const {
      channels = [],
      days = [0, 1], // Today and tomorrow by default
      genre = null,
      timeday = 'ganztags'
    } = options;

    const results = [];
    
    for (const channelId of channels) {
      for (const day of days) {
        try {
          const epgData = await this.getEPG(channelId, day, timeday);
          
          // Filter programs
          const filtered = epgData.programs.filter(program => {
            let matches = true;
            
            // Text search in title
            if (query) {
              matches = matches && program.title.toLowerCase().includes(query.toLowerCase());
            }
            
            // Genre filter
            if (genre) {
              matches = matches && program.genre.toLowerCase().includes(genre.toLowerCase());
            }
            
            return matches;
          });

          results.push(...filtered);
          
        } catch (error) {
          console.error(`Error searching channel ${channelId}, day ${day}:`, error.message);
        }
      }
    }

    console.log(`🔍 Search "${query}" found ${results.length} results`);
    return results;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ EPG cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

module.exports = new EPGService();