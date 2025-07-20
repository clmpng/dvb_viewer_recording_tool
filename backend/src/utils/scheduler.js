const cron = require('node-cron');
const epgService = require('../services/epgService');
const timerService = require('../services/timerService');
const { readJsonFile, writeJsonFile, appendLog } = require('./fileManager');

class TaskScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Initialize scheduler with cron jobs
   */
  async initialize() {
    console.log('📅 Initializing task scheduler...');

    // Daily EPG check at 6:00 AM
    this.scheduleJob('daily-epg-check', '0 6 * * *', this.runDailyEPGCheck.bind(this));
    
    // Hourly task check (for immediate tasks)
    this.scheduleJob('hourly-task-check', '0 * * * *', this.runTaskCheck.bind(this));

    // Daily cleanup at midnight
    this.scheduleJob('daily-cleanup', '0 0 * * *', this.runDailyCleanup.bind(this));

    console.log('✅ Task scheduler initialized');
  }

  /**
   * Schedule a cron job
   */
  scheduleJob(name, cronPattern, taskFunction) {
    if (this.jobs.has(name)) {
      this.jobs.get(name).destroy();
    }

    const job = cron.schedule(cronPattern, taskFunction, {
      scheduled: false,
      timezone: "Europe/Berlin"
    });

    this.jobs.set(name, job);
    job.start();
    
    console.log(`⏰ Scheduled job "${name}" with pattern "${cronPattern}"`);
  }

  /**
   * Run daily EPG check and execute automatic tasks
   */
  async runDailyEPGCheck() {
    if (this.isRunning) {
      console.log('⏸️ Daily EPG check already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Starting daily EPG check...');

    try {
      // Clear EPG cache to force fresh data
      epgService.clearCache();

      // Load active tasks
      const tasksData = await readJsonFile('tasks.json');
      const activeTasks = tasksData.tasks.filter(task => task.active);

      if (activeTasks.length === 0) {
        console.log('📝 No active tasks found');
        return;
      }

      console.log(`📝 Processing ${activeTasks.length} active tasks`);

      // Load channels
      const channels = await readJsonFile('channels.json');
      const channelIds = Object.keys(channels);

      let totalMatches = 0;
      let totalTimers = 0;

      // Process each task
      for (const task of activeTasks) {
        try {
          const matches = await this.processTask(task, channelIds);
          totalMatches += matches.length;

          // Create timers for matches
          for (const match of matches) {
            try {
              const result = await this.createTimerFromMatch(match, task);
              if (result.success) {
                totalTimers++;
              }
            } catch (error) {
              console.error(`Failed to create timer for match:`, error.message);
            }
          }

          await this.sleep(1000); // Rate limiting

        } catch (error) {
          console.error(`Error processing task "${task.name}":`, error.message);
        }
      }

      await appendLog(`Daily EPG check completed: ${totalMatches} matches found, ${totalTimers} timers created`);
      console.log(`✅ Daily EPG check completed: ${totalMatches} matches, ${totalTimers} timers`);

    } catch (error) {
      console.error('❌ Daily EPG check failed:', error);
      await appendLog(`Daily EPG check failed: ${error.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process a single task and find matching programs
   */
  async processTask(task, channelIds) {
    const matches = [];
    const targetChannels = task.channels && task.channels.length > 0 ? task.channels : channelIds;
    const targetDays = task.days && task.days.length > 0 ? task.days : [0, 1, 2]; // Today + next 2 days

    console.log(`🔍 Processing task "${task.name}" (${task.type})`);

    for (const channelId of targetChannels) {
      for (const day of targetDays) {
        try {
          const epgData = await epgService.getEPG(channelId, day);
          
          for (const program of epgData.programs) {
            if (this.matchesTask(program, task)) {
              matches.push({
                ...program,
                taskId: task.id,
                taskName: task.name
              });
            }
          }

          await this.sleep(500); // Rate limiting
        } catch (error) {
          console.error(`Error fetching EPG for channel ${channelId}, day ${day}:`, error.message);
        }
      }
    }

    console.log(`📊 Task "${task.name}" found ${matches.length} matches`);
    return matches;
  }

  /**
   * Check if a program matches a task's criteria
   */
  matchesTask(program, task) {
    switch (task.type) {
      case 'title_contains':
        return program.title.toLowerCase().includes(task.criteria.toLowerCase());
      
      case 'title_exact':
        return program.title.toLowerCase() === task.criteria.toLowerCase();
      
      case 'genre':
        return program.genre.toLowerCase().includes(task.criteria.toLowerCase());
      
      case 'title_and_genre':
        const titleMatch = program.title.toLowerCase().includes(task.criteria.title.toLowerCase());
        const genreMatch = program.genre.toLowerCase().includes(task.criteria.genre.toLowerCase());
        return titleMatch && genreMatch;
      
      case 'regex':
        try {
          const regex = new RegExp(task.criteria, 'i');
          return regex.test(program.title);
        } catch (error) {
          console.error(`Invalid regex in task "${task.name}":`, error.message);
          return false;
        }
      
      default:
        console.warn(`Unknown task type: ${task.type}`);
        return false;
    }
  }

  /**
   * Create timer from matching program
   */
  async createTimerFromMatch(match, task) {
    // Calculate target date
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + match.day);

    // Build timer data
    const timerData = {
      channelId: match.channelId,
      title: match.title,
      date: timerService.formatDate(targetDate),
      startTime: match.time,
      endTime: match.endTime || timerService.calculateEndTime(match.time, task.defaultDuration || 120),
      epgBefore: task.preBuffer || 5,
      epgAfter: task.postBuffer || 10,
      folder: task.folder || 'Auto',
      priority: task.priority || 50,
      series: task.series || ''
    };

    console.log(`⏺️ Creating timer for "${match.title}" from task "${task.name}"`);
    
    const result = await timerService.createTimer(timerData);
    
    if (result.success) {
      await appendLog(`Auto-timer created: ${match.title} (${match.channelName}) from task "${task.name}"`);
    }

    return result;
  }

  /**
   * Run hourly task check for immediate tasks
   */
  async runTaskCheck() {
    console.log('⏰ Running hourly task check...');
    // Implement immediate task checking if needed
  }

  /**
   * Daily cleanup
   */
  async runDailyCleanup() {
    console.log('🧹 Running daily cleanup...');
    
    try {
      // Clear old EPG cache
      epgService.clearCache();
      
      // Log cleanup
      await appendLog('Daily cleanup completed');
      
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  /**
   * Manual task execution
   */
  async executeTaskNow(taskId) {
    try {
      const tasksData = await readJsonFile('tasks.json');
      const task = tasksData.tasks.find(t => t.id === taskId);
      
      if (!task) {
        throw new Error('Task not found');
      }

      console.log(`🚀 Manually executing task "${task.name}"`);
      
      const channels = await readJsonFile('channels.json');
      const channelIds = Object.keys(channels);
      
      const matches = await this.processTask(task, channelIds);
      let timersCreated = 0;

      for (const match of matches) {
        const result = await this.createTimerFromMatch(match, task);
        if (result.success) {
          timersCreated++;
        }
      }

      await appendLog(`Manual task execution: "${task.name}" - ${matches.length} matches, ${timersCreated} timers created`);
      
      return {
        success: true,
        matches: matches.length,
        timersCreated
      };

    } catch (error) {
      console.error('Manual task execution error:', error);
      throw error;
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    console.log('🛑 Stopping task scheduler...');
    
    for (const [name, job] of this.jobs) {
      job.destroy();
      console.log(`⏹️ Stopped job "${name}"`);
    }
    
    this.jobs.clear();
    console.log('✅ Task scheduler stopped');
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobs: Array.from(this.jobs.keys()),
      jobCount: this.jobs.size
    };
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
const scheduler = new TaskScheduler();

// Initialize scheduler
function initializeScheduler() {
  scheduler.initialize().catch(error => {
    console.error('Failed to initialize scheduler:', error);
  });
}

module.exports = {
  initializeScheduler,
  scheduler
};