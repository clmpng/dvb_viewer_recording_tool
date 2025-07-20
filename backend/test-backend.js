#!/usr/bin/env node
/**
 * DVB EPG Manager - Backend Test Script
 * 
 * Usage: node test-backend.js [test-name]
 * 
 * Available tests:
 * - health: Test server health
 * - epg: Test EPG fetching
 * - channels: Test channel loading
 * - timer: Test timer creation (dry run)
 * - tasks: Test task management
 * - search: Test EPG search
 * - all: Run all tests
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(colors.green, `✅ ${message}`);
}

function error(message) {
  log(colors.red, `❌ ${message}`);
}

function info(message) {
  log(colors.blue, `ℹ️  ${message}`);
}

function warn(message) {
  log(colors.yellow, `⚠️  ${message}`);
}

async function testHealth() {
  try {
    info('Testing server health...');
    const response = await axios.get(`${BASE_URL}/health`);
    
    if (response.status === 200) {
      success('Server is healthy');
      console.log(`   Status: ${response.data.status}`);
      console.log(`   Uptime: ${Math.round(response.data.uptime)}s`);
      return true;
    }
  } catch (err) {
    error(`Health check failed: ${err.message}`);
    return false;
  }
}

async function testChannels() {
  try {
    info('Testing channel loading...');
    const response = await axios.get(`${BASE_URL}/epg/channels`);
    
    if (response.status === 200) {
      const channels = response.data;
      const channelCount = Object.keys(channels).length;
      success(`Loaded ${channelCount} channels`);
      
      // Show first few channels
      const firstChannels = Object.entries(channels).slice(0, 3);
      firstChannels.forEach(([id, channel]) => {
        console.log(`   ${id}: ${channel.name} (${channel.category})`);
      });
      
      return true;
    }
  } catch (err) {
    error(`Channel loading failed: ${err.message}`);
    return false;
  }
}

async function testEPG() {
  try {
    info('Testing EPG fetching for ZDF (today)...');
    const response = await axios.get(`${BASE_URL}/epg/37/0`);
    
    if (response.status === 200 && response.data.success) {
      const epgData = response.data.data;
      success(`EPG fetched for ${epgData.channelName}`);
      console.log(`   Programs: ${epgData.programs.length}`);
      console.log(`   Last updated: ${epgData.lastUpdated}`);
      
      // Show first few programs
      const firstPrograms = epgData.programs.slice(0, 3);
      firstPrograms.forEach(program => {
        console.log(`   ${program.time}: ${program.title} (${program.genre})`);
      });
      
      return true;
    }
  } catch (err) {
    error(`EPG fetching failed: ${err.message}`);
    if (err.response?.data?.message) {
      console.log(`   Details: ${err.response.data.message}`);
    }
    return false;
  }
}

async function testSearch() {
  try {
    info('Testing EPG search for "Nachrichten"...');
    const response = await axios.post(`${BASE_URL}/epg/search`, {
      query: 'Nachrichten',
      channels: ['37', '71'], // ZDF and Das Erste
      days: [0, 1]
    });
    
    if (response.status === 200 && response.data.success) {
      const results = response.data.data;
      success(`Search found ${results.length} results`);
      
      // Show first few results
      const firstResults = results.slice(0, 3);
      firstResults.forEach(result => {
        console.log(`   ${result.time}: ${result.title} (Channel ${result.channelId})`);
      });
      
      return true;
    }
  } catch (err) {
    error(`Search failed: ${err.message}`);
    return false;
  }
}

async function testTimerValidation() {
  try {
    info('Testing timer validation...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toLocaleDateString('de-DE');
    
    const response = await axios.get(`${BASE_URL}/timer/validate`, {
      params: {
        channelId: '37',
        date: dateStr,
        startTime: '20:15',
        endTime: '21:45'
      }
    });
    
    if (response.status === 200) {
      const validation = response.data;
      if (validation.valid) {
        success('Timer validation passed');
      } else {
        warn(`Timer validation failed: ${validation.errors.join(', ')}`);
      }
      return true;
    }
  } catch (err) {
    error(`Timer validation failed: ${err.message}`);
    return false;
  }
}

async function testDVBConnection() {
  try {
    info('Testing DVB Viewer connection...');
    const response = await axios.get(`${BASE_URL}/timer/test`);
    
    if (response.status === 200 && response.data.success) {
      success('DVB Viewer connection successful');
      console.log(`   Host: ${response.data.data.host}`);
      return true;
    } else {
      warn('DVB Viewer connection failed (this is normal if DVB Viewer is not running)');
      console.log(`   Details: ${response.data.details?.error || 'Connection failed'}`);
      return false;
    }
  } catch (err) {
    warn('DVB Viewer connection failed (this is normal if DVB Viewer is not running)');
    console.log(`   Error: ${err.message}`);
    return false;
  }
}

async function testTasks() {
  try {
    info('Testing task management...');
    
    // Get current tasks
    let response = await axios.get(`${BASE_URL}/tasks`);
    const initialTaskCount = response.data.data.length;
    info(`Current tasks: ${initialTaskCount}`);
    
    // Create a test task
    const testTask = {
      name: 'Test Task - Tatort',
      type: 'title_contains',
      criteria: 'Tatort',
      channels: ['37', '71'],
      days: [0, 1],
      active: true
    };
    
    response = await axios.post(`${BASE_URL}/tasks`, testTask);
    if (response.status === 201) {
      success('Test task created');
      const taskId = response.data.data.id;
      
      // Get tasks again
      response = await axios.get(`${BASE_URL}/tasks`);
      const newTaskCount = response.data.data.length;
      
      if (newTaskCount === initialTaskCount + 1) {
        success('Task list updated correctly');
        
        // Clean up - delete test task
        await axios.delete(`${BASE_URL}/tasks/${taskId}`);
        success('Test task cleaned up');
        
        return true;
      }
    }
    
    return false;
  } catch (err) {
    error(`Task management failed: ${err.message}`);
    return false;
  }
}

async function testTaskTypes() {
  try {
    info('Testing task types...');
    const response = await axios.get(`${BASE_URL}/tasks/types`);
    
    if (response.status === 200 && response.data.success) {
      const types = response.data.data;
      const typeCount = Object.keys(types).length;
      success(`Loaded ${typeCount} task types`);
      
      Object.entries(types).forEach(([key, type]) => {
        console.log(`   ${key}: ${type.name}`);
      });
      
      return true;
    }
  } catch (err) {
    error(`Task types failed: ${err.message}`);
    return false;
  }
}

async function testSchedulerStatus() {
  try {
    info('Testing scheduler status...');
    const response = await axios.get(`${BASE_URL}/tasks/scheduler/status`);
    
    if (response.status === 200 && response.data.success) {
      const status = response.data.data;
      success('Scheduler status retrieved');
      console.log(`   Running: ${status.isRunning}`);
      console.log(`   Jobs: ${status.jobCount}`);
      status.jobs.forEach(job => {
        console.log(`   - ${job}`);
      });
      
      return true;
    }
  } catch (err) {
    error(`Scheduler status failed: ${err.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log(`${colors.bold}${colors.blue}=== DVB EPG Manager Backend Tests ===${colors.reset}\n`);
  
  const tests = [
    { name: 'Health Check', fn: testHealth },
    { name: 'Channel Loading', fn: testChannels },
    { name: 'EPG Fetching', fn: testEPG },
    { name: 'EPG Search', fn: testSearch },
    { name: 'Timer Validation', fn: testTimerValidation },
    { name: 'DVB Connection', fn: testDVBConnection },
    { name: 'Task Types', fn: testTaskTypes },
    { name: 'Task Management', fn: testTasks },
    { name: 'Scheduler Status', fn: testSchedulerStatus }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`\n--- ${test.name} ---`);
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (err) {
      error(`Test "${test.name}" threw an error: ${err.message}`);
      failed++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n${colors.bold}=== Test Results ===${colors.reset}`);
  success(`Passed: ${passed}`);
  if (failed > 0) {
    error(`Failed: ${failed}`);
  }
  console.log(`Total: ${passed + failed}`);
  
  if (failed === 0) {
    success('All tests passed! 🎉');
  } else {
    warn(`${failed} test(s) failed. Check the output above for details.`);
  }
}

// Main execution
async function main() {
  const testName = process.argv[2] || 'all';
  
  try {
    switch (testName) {
      case 'health':
        await testHealth();
        break;
      case 'channels':
        await testChannels();
        break;
      case 'epg':
        await testEPG();
        break;
      case 'search':
        await testSearch();
        break;
      case 'timer':
        await testTimerValidation();
        await testDVBConnection();
        break;
      case 'tasks':
        await testTasks();
        await testTaskTypes();
        break;
      case 'scheduler':
        await testSchedulerStatus();
        break;
      case 'all':
        await runAllTests();
        break;
      default:
        console.log('Available tests: health, channels, epg, search, timer, tasks, scheduler, all');
        process.exit(1);
    }
  } catch (err) {
    error(`Test execution failed: ${err.message}`);
    process.exit(1);
  }
}

// Check if axios is available
try {
  require('axios');
} catch (err) {
  error('axios is not installed. Run: npm install axios');
  process.exit(1);
}

main();