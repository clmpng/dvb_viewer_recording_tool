const express = require('express');
const router = express.Router();
const timerService = require('../services/timerService');

/**
 * POST /api/timer
 * Create a new timer
 */
router.post('/', async (req, res) => {
  try {
    const {
      channelId,
      title,
      date,
      startTime,
      endTime,
      duration, // Optional: if endTime not provided
      epgBefore,
      epgAfter,
      folder,
      priority,
      series
    } = req.body;

    // Validate required fields
    if (!channelId || !title || !date || !startTime) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['channelId', 'title', 'date', 'startTime']
      });
    }

    // Validate date format (DD.MM.YYYY)
    const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        error: 'Invalid date format. Expected DD.MM.YYYY'
      });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(startTime)) {
      return res.status(400).json({
        error: 'Invalid start time format. Expected HH:MM'
      });
    }

    // Calculate endTime if not provided
    let finalEndTime = endTime;
    if (!finalEndTime && duration) {
      finalEndTime = timerService.calculateEndTime(startTime, parseInt(duration));
    }

    if (!finalEndTime) {
      return res.status(400).json({
        error: 'Either endTime or duration must be provided'
      });
    }

    if (!timeRegex.test(finalEndTime)) {
      return res.status(400).json({
        error: 'Invalid end time format. Expected HH:MM'
      });
    }

    // Create timer data object
    const timerData = {
      channelId,
      title: title.trim(),
      date,
      startTime,
      endTime: finalEndTime,
      epgBefore: epgBefore || 5,
      epgAfter: epgAfter || 10,
      folder: folder || 'Auto',
      priority: priority || 50,
      series: series || ''
    };

    console.log('🎬 Creating timer:', timerData);

    const result = await timerService.createTimer(timerData);

    if (result.success) {
      res.json({
        success: true,
        message: 'Timer created successfully',
        data: {
          ...timerData,
          createdAt: new Date().toISOString()
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.message,
        details: result.error
      });
    }

  } catch (error) {
    console.error('Timer creation error:', error);
    res.status(500).json({
      error: 'Failed to create timer',
      message: error.message
    });
  }
});

/**
 * POST /api/timer/quick
 * Create timer from EPG program data
 */
router.post('/quick', async (req, res) => {
  try {
    const {
      program,
      epgBefore,
      epgAfter,
      folder,
      priority,
      series
    } = req.body;

    if (!program || !program.channelId || !program.title || !program.time) {
      return res.status(400).json({
        error: 'Invalid program data',
        required: ['program.channelId', 'program.title', 'program.time']
      });
    }

    // Convert day offset to actual date
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + (program.day || 0));

    const timerData = {
      channelId: program.channelId,
      title: program.title,
      date: timerService.formatDate(targetDate),
      startTime: program.time,
      endTime: program.endTime || timerService.calculateEndTime(program.time, 120), // Default 2h
      epgBefore: epgBefore || 5,
      epgAfter: epgAfter || 10,
      folder: folder || 'Auto',
      priority: priority || 50,
      series: series || ''
    };

    console.log('⚡ Creating quick timer from program:', program.title);

    const result = await timerService.createTimer(timerData);

    if (result.success) {
      res.json({
        success: true,
        message: 'Timer created successfully from program',
        data: {
          ...timerData,
          programId: program.id,
          createdAt: new Date().toISOString()
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.message,
        details: result.error
      });
    }

  } catch (error) {
    console.error('Quick timer creation error:', error);
    res.status(500).json({
      error: 'Failed to create quick timer',
      message: error.message
    });
  }
});

/**
 * GET /api/timer/test
 * Test DVB Viewer connection
 */
router.get('/test', async (req, res) => {
  try {
    const result = await timerService.testConnection();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'DVB Viewer connection successful',
        data: result
      });
    } else {
      res.status(503).json({
        success: false,
        error: 'DVB Viewer connection failed',
        details: result
      });
    }

  } catch (error) {
    console.error('Connection test error:', error);
    res.status(500).json({
      error: 'Connection test failed',
      message: error.message
    });
  }
});

/**
 * GET /api/timer/validate
 * Validate timer parameters
 */
router.get('/validate', async (req, res) => {
  try {
    const { channelId, date, startTime, endTime } = req.query;

    const validation = {
      valid: true,
      errors: []
    };

    // Validate channelId
    if (channelId) {
      const channels = await timerService.getChannelMapping();
      if (!channels[channelId]) {
        validation.valid = false;
        validation.errors.push('Invalid channel ID');
      }
    }

    // Validate date
    if (date) {
      const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
      if (!dateRegex.test(date)) {
        validation.valid = false;
        validation.errors.push('Invalid date format (expected DD.MM.YYYY)');
      } else {
        // Check if date is in the past
        const [day, month, year] = date.split('.');
        const targetDate = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (targetDate < today) {
          validation.valid = false;
          validation.errors.push('Date cannot be in the past');
        }
      }
    }

    // Validate time format
    const timeRegex = /^\d{2}:\d{2}$/;
    if (startTime && !timeRegex.test(startTime)) {
      validation.valid = false;
      validation.errors.push('Invalid start time format (expected HH:MM)');
    }

    if (endTime && !timeRegex.test(endTime)) {
      validation.valid = false;
      validation.errors.push('Invalid end time format (expected HH:MM)');
    }

    // Validate time logic
    if (startTime && endTime && timeRegex.test(startTime) && timeRegex.test(endTime)) {
      const start = new Date(`2000-01-01T${startTime}:00`);
      const end = new Date(`2000-01-01T${endTime}:00`);
      
      if (end <= start) {
        // Handle next day scenario
        end.setDate(end.getDate() + 1);
        if (end <= start) {
          validation.valid = false;
          validation.errors.push('End time must be after start time');
        }
      }
    }

    res.json(validation);

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: error.message
    });
  }
});

module.exports = router;