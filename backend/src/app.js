const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const epgRoutes = require('./routes/epg');
const timerRoutes = require('./routes/timer');
const taskRoutes = require('./routes/tasks');

const { initializeScheduler } = require('./utils/scheduler');
const { ensureDataFiles } = require('./utils/fileManager');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/epg', epgRoutes);
app.use('/api/timer', timerRoutes);
app.use('/api/tasks', taskRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.get('/api/status', async (req, res) => {
  try {
    const { getConfig } = require('./utils/fileManager');
    const timerService = require('./services/timerService');
    const { scheduler } = require('./utils/scheduler');

    // Get configuration
    const config = await getConfig();
    const dvbHost = process.env.DVB_VIEWER_HOST || config.dvbViewer.host;

    // Test DVB Viewer connection
    let dvbViewerStatus = false;
    try {
      const dvbTest = await timerService.testConnection();
      dvbViewerStatus = dvbTest.success;
    } catch (error) {
      console.warn('DVB Viewer test failed:', error.message);
    }

    // Get scheduler status
    const schedulerStatus = scheduler.getJobCount() > 0;

    res.json({
      success: true,
      data: {
        backend: true,
        dvbViewerAvailable: dvbViewerStatus,
        schedulerRunning: schedulerStatus,
        dvbHost: dvbHost,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system status',
      message: error.message
    });
  }
});

// Initialize
async function startServer() {
  try {
    // Ensure data files exist
    await ensureDataFiles();
    
    // Start cron jobs
    initializeScheduler();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 DVB Viewer: ${process.env.DVB_VIEWER_HOST}`);
      console.log(`🕐 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

startServer();