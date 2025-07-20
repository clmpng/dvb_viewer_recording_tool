const express = require('express');
const router = express.Router();
const { readJsonFile, writeJsonFile, appendLog } = require('../utils/fileManager');
const { scheduler } = require('../utils/scheduler');

/**
 * GET /api/tasks
 * Get all tasks
 */
router.get('/', async (req, res) => {
  try {
    const tasksData = await readJsonFile('tasks.json');
    res.json({
      success: true,
      data: tasksData.tasks
    });
  } catch (error) {
    console.error('Error loading tasks:', error);
    res.status(500).json({
      error: 'Failed to load tasks',
      message: error.message
    });
  }
});

/**
 * POST /api/tasks
 * Create a new task
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      type,
      criteria,
      channels = [],
      days = [0, 1, 2],
      active = true,
      priority = 50,
      preBuffer = 5,
      postBuffer = 10,
      folder = 'Auto',
      series = '',
      defaultDuration = 120
    } = req.body;

    // Validate required fields
    if (!name || !type || !criteria) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'type', 'criteria']
      });
    }

    // Validate task type
    const validTypes = ['title_contains', 'title_exact', 'genre', 'title_and_genre', 'regex'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Invalid task type',
        validTypes
      });
    }

    // Load existing tasks
    const tasksData = await readJsonFile('tasks.json');

    // Check for duplicate names
    const existingTask = tasksData.tasks.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (existingTask) {
      return res.status(409).json({
        error: 'Task with this name already exists'
      });
    }

    // Create new task
    const newTask = {
      id: (tasksData.lastId + 1).toString(),
      name: name.trim(),
      type,
      criteria,
      channels,
      days,
      active,
      priority,
      preBuffer,
      postBuffer,
      folder,
      series,
      defaultDuration,
      createdAt: new Date().toISOString(),
      lastRun: null,
      matchCount: 0,
      timerCount: 0
    };

    // Add to tasks
    tasksData.tasks.push(newTask);
    tasksData.lastId++;

    // Save to file
    await writeJsonFile('tasks.json', tasksData);
    await appendLog(`Task created: "${name}" (${type})`);

    console.log(`✅ Created task: "${name}"`);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: newTask
    });

  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      error: 'Failed to create task',
      message: error.message
    });
  }
});

/**
 * PUT /api/tasks/:id
 * Update a task
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const tasksData = await readJsonFile('tasks.json');
    const taskIndex = tasksData.tasks.findIndex(t => t.id === id);

    if (taskIndex === -1) {
      return res.status(404).json({
        error: 'Task not found'
      });
    }

    // Update task
    const originalTask = tasksData.tasks[taskIndex];
    const updatedTask = {
      ...originalTask,
      ...updates,
      id: originalTask.id, // Preserve ID
      createdAt: originalTask.createdAt, // Preserve creation date
      updatedAt: new Date().toISOString()
    };

    tasksData.tasks[taskIndex] = updatedTask;

    // Save to file
    await writeJsonFile('tasks.json', tasksData);
    await appendLog(`Task updated: "${updatedTask.name}"`);

    console.log(`📝 Updated task: "${updatedTask.name}"`);

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask
    });

  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      error: 'Failed to update task',
      message: error.message
    });
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete a task
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const tasksData = await readJsonFile('tasks.json');
    const taskIndex = tasksData.tasks.findIndex(t => t.id === id);

    if (taskIndex === -1) {
      return res.status(404).json({
        error: 'Task not found'
      });
    }

    const taskName = tasksData.tasks[taskIndex].name;
    
    // Remove task
    tasksData.tasks.splice(taskIndex, 1);

    // Save to file
    await writeJsonFile('tasks.json', tasksData);
    await appendLog(`Task deleted: "${taskName}"`);

    console.log(`🗑️ Deleted task: "${taskName}"`);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      error: 'Failed to delete task',
      message: error.message
    });
  }
});

/**
 * POST /api/tasks/:id/execute
 * Execute a task manually
 */
router.post('/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;

    const tasksData = await readJsonFile('tasks.json');
    const task = tasksData.tasks.find(t => t.id === id);

    if (!task) {
      return res.status(404).json({
        error: 'Task not found'
      });
    }

    console.log(`🚀 Executing task manually: "${task.name}"`);

    const result = await scheduler.executeTaskNow(id);

    // Update task stats
    const taskIndex = tasksData.tasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
      tasksData.tasks[taskIndex].lastRun = new Date().toISOString();
      tasksData.tasks[taskIndex].matchCount += result.matches;
      tasksData.tasks[taskIndex].timerCount += result.timersCreated;
      
      await writeJsonFile('tasks.json', tasksData);
    }

    res.json({
      success: true,
      message: 'Task executed successfully',
      data: {
        taskName: task.name,
        matches: result.matches,
        timersCreated: result.timersCreated
      }
    });

  } catch (error) {
    console.error('Error executing task:', error);
    res.status(500).json({
      error: 'Failed to execute task',
      message: error.message
    });
  }
});

/**
 * POST /api/tasks/:id/toggle
 * Toggle task active status
 */
router.post('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;

    const tasksData = await readJsonFile('tasks.json');
    const taskIndex = tasksData.tasks.findIndex(t => t.id === id);

    if (taskIndex === -1) {
      return res.status(404).json({
        error: 'Task not found'
      });
    }

    // Toggle active status
    tasksData.tasks[taskIndex].active = !tasksData.tasks[taskIndex].active;
    tasksData.tasks[taskIndex].updatedAt = new Date().toISOString();

    const task = tasksData.tasks[taskIndex];

    // Save to file
    await writeJsonFile('tasks.json', tasksData);
    await appendLog(`Task ${task.active ? 'activated' : 'deactivated'}: "${task.name}"`);

    console.log(`🔄 Task "${task.name}" ${task.active ? 'activated' : 'deactivated'}`);

    res.json({
      success: true,
      message: `Task ${task.active ? 'activated' : 'deactivated'}`,
      data: task
    });

  } catch (error) {
    console.error('Error toggling task:', error);
    res.status(500).json({
      error: 'Failed to toggle task',
      message: error.message
    });
  }
});

/**
 * GET /api/tasks/types
 * Get available task types with descriptions
 */
router.get('/types', (req, res) => {
  const taskTypes = {
    'title_contains': {
      name: 'Titel enthält',
      description: 'Sucht nach Sendungen, deren Titel den angegebenen Text enthalten',
      criteriaType: 'string',
      example: 'Tatort'
    },
    'title_exact': {
      name: 'Exakter Titel',
      description: 'Sucht nach Sendungen mit exakt dem angegebenen Titel',
      criteriaType: 'string',
      example: 'Tagesschau'
    },
    'genre': {
      name: 'Genre',
      description: 'Sucht nach Sendungen eines bestimmten Genres',
      criteriaType: 'string',
      example: 'Spielfilm'
    },
    'title_and_genre': {
      name: 'Titel und Genre',
      description: 'Sucht nach Sendungen, die sowohl Titel- als auch Genre-Kriterien erfüllen',
      criteriaType: 'object',
      example: { title: 'Krimi', genre: 'Serie' }
    },
    'regex': {
      name: 'Regulärer Ausdruck',
      description: 'Erweiterte Suche mit regulären Ausdrücken',
      criteriaType: 'string',
      example: '^(Tatort|Polizeiruf).*'
    }
  };

  res.json({
    success: true,
    data: taskTypes
  });
});

/**
 * GET /api/tasks/scheduler/status
 * Get scheduler status
 */
router.get('/scheduler/status', (req, res) => {
  try {
    const status = scheduler.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get scheduler status',
      message: error.message
    });
  }
});

module.exports = router;