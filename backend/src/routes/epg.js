const express = require('express');
const router = express.Router();
const epgService = require('../services/epgService');
const { readJsonFile } = require('../utils/fileManager');

/**
 * GET /api/epg/channels
 * Get all available channels
 */
router.get('/channels', async (req, res) => {
  try {
    const channels = await readJsonFile('channels.json');
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load channels', message: error.message });
  }
});

/**
 * GET /api/epg/program/:broadcastId
 * Get detailed program information
 * ⚠️ WICHTIG: Diese Route MUSS vor /:channelId/:day? stehen!
 */
router.get('/program/:broadcastId', async (req, res) => {
  try {
    const { broadcastId } = req.params;

    if (!broadcastId || !/^\d+$/.test(broadcastId)) {
      return res.status(400).json({ 
        error: 'Invalid broadcast ID' 
      });
    }

    console.log(`🔍 Fetching details for broadcast ID: ${broadcastId}`);
    const programDetails = await epgService.getProgramDetails(broadcastId);
    
    res.json({
      success: true,
      data: programDetails
    });

  } catch (error) {
    console.error('Program details error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch program details', 
      message: error.message 
    });
  }
});

/**
 * GET /api/epg/today/:channelId?
 * Get today's EPG for specific channel or all channels
 */
router.get('/today/:channelId?', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { timeday = 'ganztags' } = req.query;

    if (channelId) {
      // Single channel
      const channels = await readJsonFile('channels.json');
      if (!channels[channelId]) {
        return res.status(404).json({ 
          error: 'Channel not found', 
          channelId 
        });
      }

      const epgData = await epgService.getEPG(channelId, 0, timeday);
      return res.json({
        success: true,
        data: [epgData]
      });
    } else {
      // All channels
      const channels = await readJsonFile('channels.json');
      const channelIds = Object.keys(channels);
      const allEpgData = [];

      // Fetch EPG for all channels (in parallel, but limited)
      const chunkSize = 3; // Limit concurrent requests
      for (let i = 0; i < channelIds.length; i += chunkSize) {
        const chunk = channelIds.slice(i, i + chunkSize);
        
        const promises = chunk.map(async (chId) => {
          try {
            return await epgService.getEPG(chId, 0, timeday);
          } catch (error) {
            console.error(`Failed to fetch EPG for channel ${chId}:`, error.message);
            return null;
          }
        });

        const results = await Promise.all(promises);
        allEpgData.push(...results.filter(Boolean));
      }

      res.json({
        success: true,
        data: allEpgData
      });
    }

  } catch (error) {
    console.error('Today EPG error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch today EPG', 
      message: error.message 
    });
  }
});

/**
 * DELETE /api/epg/cache
 * Clear EPG cache
 */
router.delete('/cache', (req, res) => {
  try {
    epgService.clearCache();
    res.json({ 
      success: true, 
      message: 'Cache cleared' 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to clear cache', 
      message: error.message 
    });
  }
});

/**
 * GET /api/epg/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', (req, res) => {
  try {
    const stats = epgService.getCacheStats();
    res.json({ 
      success: true, 
      data: stats 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get cache stats', 
      message: error.message 
    });
  }
});

/**
 * POST /api/epg/search
 * Search programs across channels and days
 */
router.post('/search', async (req, res) => {
  try {
    const { 
      query = '', 
      channels = [], 
      days = [0, 1], 
      genre = null,
      timeday = 'ganztags' 
    } = req.body;

    // Validate channels
    const availableChannels = await readJsonFile('channels.json');
    const validChannels = channels.filter(ch => availableChannels[ch]);

    if (validChannels.length === 0) {
      return res.status(400).json({ 
        error: 'No valid channels specified' 
      });
    }

    // Validate days
    const validDays = days.filter(d => Number.isInteger(d) && d >= 0 && d <= 7);
    if (validDays.length === 0) {
      return res.status(400).json({ 
        error: 'No valid days specified' 
      });
    }

    const searchResults = await epgService.searchPrograms(query, {
      channels: validChannels,
      days: validDays,
      genre,
      timeday
    });

    res.json({
      success: true,
      query,
      filters: { channels: validChannels, days: validDays, genre, timeday },
      resultsCount: searchResults.length,
      data: searchResults
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Search failed', 
      message: error.message 
    });
  }
});

/**
 * GET /api/epg/:channelId/:day?
 * Get EPG for specific channel and day
 * ⚠️ WICHTIG: Diese allgemeine Route MUSS nach den spezifischen Routen kommen!
 */
router.get('/:channelId/:day?', async (req, res) => {
  try {
    const { channelId, day = '0' } = req.params;
    const { timeday = 'ganztags' } = req.query;

    // Validate channelId
    const channels = await readJsonFile('channels.json');
    if (!channels[channelId]) {
      return res.status(404).json({ 
        error: 'Channel not found', 
        channelId 
      });
    }

    // Validate day (0-7)
    const dayNum = parseInt(day);
    if (isNaN(dayNum) || dayNum < 0 || dayNum > 7) {
      return res.status(400).json({ 
        error: 'Invalid day parameter. Must be 0-7' 
      });
    }

    const epgData = await epgService.getEPG(channelId, dayNum, timeday);
    
    res.json({
      success: true,
      data: epgData
    });

  } catch (error) {
    console.error('EPG route error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch EPG', 
      message: error.message 
    });
  }
});

module.exports = router;