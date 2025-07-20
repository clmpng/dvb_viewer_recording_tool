import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Edit,
  Eye,
  RefreshCw,
  Settings,
  Calendar,
  Clock,
  Search,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { apiService, formatters } from '../services/api';
import LoadingSpinner, { LoadingCard } from './LoadingSpinner';
import ErrorAlert, { SuccessMessage } from './ErrorAlert';

function TaskManager({ channels, onError }) {
  // State management
  const [tasks, setTasks] = useState([]);
  const [taskTypes, setTaskTypes] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showTaskDetails, setShowTaskDetails] = useState(null);

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadTaskData();
  }, []);

  /**
   * Load tasks and task types
   */
  const loadTaskData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [tasksResponse, typesResponse] = await Promise.all([
        apiService.getTasks(),
        apiService.getTaskTypes()
      ]);

      setTasks(tasksResponse.data);
      setTaskTypes(typesResponse.data);

      console.log(`✅ Loaded ${tasksResponse.data.length} tasks`);
    } catch (err) {
      console.error('Failed to load task data:', err);
      setError(err.message);
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle task creation
   */
  const handleCreateTask = async (taskData) => {
    setIsSubmitting(true);
    try {
      const response = await apiService.createTask(taskData);
      
      // Add new task to local state
      setTasks(prev => [...prev, response.data]);
      
      setSuccess(`Task "${taskData.name}" erfolgreich erstellt`);
      setTimeout(() => setSuccess(null), 5000);
      
      setShowCreateModal(false);
      
      console.log(`✅ Created task: "${taskData.name}"`);
    } catch (err) {
      console.error('Failed to create task:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle task toggle (active/inactive)
   */
  const handleToggleTask = async (taskId) => {
    try {
      setError(null);
      const response = await apiService.toggleTask(taskId);
      
      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, active: response.data.active }
          : task
      ));

      setSuccess(`Task ${response.data.active ? 'aktiviert' : 'deaktiviert'}`);
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      console.error('Failed to toggle task:', err);
      setError(err.message);
    }
  };

  /**
   * Handle task execution
   */
  const handleExecuteTask = async (taskId) => {
    try {
      setError(null);
      console.log(`Executing task ${taskId}...`);
      
      const response = await apiService.executeTask(taskId);
      
      setSuccess(`Task ausgeführt: ${response.data.matches} Treffer, ${response.data.timersCreated} Timer erstellt`);
      setTimeout(() => setSuccess(null), 5000);

      // Reload tasks to update stats
      loadTaskData();

    } catch (err) {
      console.error('Failed to execute task:', err);
      setError(err.message);
    }
  };

  /**
   * Handle task deletion
   */
  const handleDeleteTask = async (taskId) => {
    if (!confirm('Task wirklich löschen?')) return;

    try {
      setError(null);
      await apiService.deleteTask(taskId);
      
      // Remove from local state
      setTasks(prev => prev.filter(task => task.id !== taskId));
      
      setSuccess('Task gelöscht');
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      console.error('Failed to delete task:', err);
      setError(err.message);
    }
  };

  /**
   * Get task type display name
   */
  const getTaskTypeName = (type) => {
    return taskTypes[type]?.name || type;
  };

  /**
   * Get task criteria display
   */
  const getTaskCriteriaDisplay = (task) => {
    if (typeof task.criteria === 'string') {
      return task.criteria;
    }
    
    if (typeof task.criteria === 'object') {
      return JSON.stringify(task.criteria);
    }
    
    return 'Keine Kriterien';
  };

  /**
   * Get task status badge
   */
  const getTaskStatusBadge = (task) => {
    if (task.active) {
      return <span className="badge badge-green">Aktiv</span>;
    }
    return <span className="badge badge-gray">Inaktiv</span>;
  };

  /**
   * Render task statistics
   */
  const TaskStats = () => {
    const activeTasks = tasks.filter(t => t.active).length;
    const totalMatches = tasks.reduce((sum, t) => sum + (t.matchCount || 0), 0);
    const totalTimers = tasks.reduce((sum, t) => sum + (t.timerCount || 0), 0);

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-blue-600">{tasks.length}</div>
            <div className="text-sm text-gray-600">Tasks gesamt</div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-green-600">{activeTasks}</div>
            <div className="text-sm text-gray-600">Aktive Tasks</div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-yellow-600">{totalMatches}</div>
            <div className="text-sm text-gray-600">Gefundene Treffer</div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-purple-600">{totalTimers}</div>
            <div className="text-sm text-gray-600">Erstellte Timer</div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render single task item
   */
  const TaskItem = ({ task }) => {
    return (
      <div className="card">
        <div className="card-body">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {task.name}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {getTaskStatusBadge(task)}
                <span className="badge badge-blue">
                  {getTaskTypeName(task.type)}
                </span>
                {task.channels && task.channels.length > 0 && (
                  <span className="badge badge-gray">
                    {task.channels.length} Sender
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowTaskDetails(task)}
                className="btn btn-outline btn-sm"
                title="Details anzeigen"
              >
                <Eye size={14} />
              </button>
              
              <button
                onClick={() => handleExecuteTask(task.id)}
                className="btn btn-primary btn-sm"
                title="Jetzt ausführen"
              >
                <Play size={14} />
              </button>
              
              <button
                onClick={() => handleToggleTask(task.id)}
                className={`btn btn-sm ${task.active ? 'btn-secondary' : 'btn-success'}`}
                title={task.active ? 'Deaktivieren' : 'Aktivieren'}
              >
                {task.active ? <Pause size={14} /> : <Play size={14} />}
              </button>
              
              <button
                onClick={() => setEditingTask(task)}
                className="btn btn-outline btn-sm"
                title="Bearbeiten"
              >
                <Edit size={14} />
              </button>
              
              <button
                onClick={() => handleDeleteTask(task.id)}
                className="btn btn-danger btn-sm"
                title="Löschen"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-gray-700">Kriterien:</span>
              <span className="ml-2 text-gray-600">
                {formatters.truncateText(getTaskCriteriaDisplay(task), 60)}
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
              <div>
                <span className="text-gray-500">Treffer:</span>
                <span className="ml-1 font-medium">{task.matchCount || 0}</span>
              </div>
              <div>
                <span className="text-gray-500">Timer:</span>
                <span className="ml-1 font-medium">{task.timerCount || 0}</span>
              </div>
              <div>
                <span className="text-gray-500">Priorität:</span>
                <span className="ml-1 font-medium">{task.priority || 50}</span>
              </div>
              <div>
                <span className="text-gray-500">Letzte Ausführung:</span>
                <span className="ml-1 font-medium">
                  {task.lastRun 
                    ? formatters.formatDate(task.lastRun)
                    : 'Nie'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Create Task Modal Component
   */
  const CreateTaskModal = () => {
    const [formData, setFormData] = useState({
      name: '',
      type: 'title_contains',
      criteria: '',
      channels: [],
      days: [0, 1, 2, 3, 4, 5, 6],
      active: true,
      priority: 50,
      preBuffer: 5,
      postBuffer: 10,
      folder: 'Auto',
      series: '',
      defaultDuration: 120
    });

    const [formErrors, setFormErrors] = useState({});

    const handleInputChange = (field, value) => {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
      
      // Clear error when user starts typing
      if (formErrors[field]) {
        setFormErrors(prev => ({
          ...prev,
          [field]: null
        }));
      }
    };

    const validateForm = () => {
      const errors = {};
      
      if (!formData.name.trim()) {
        errors.name = 'Name ist erforderlich';
      }
      
      if (!formData.type) {
        errors.type = 'Task-Typ ist erforderlich';
      }
      
      if (!formData.criteria.trim()) {
        errors.criteria = 'Kriterien sind erforderlich';
      }

      if (formData.priority < 0 || formData.priority > 100) {
        errors.priority = 'Priorität muss zwischen 0 und 100 liegen';
      }

      if (formData.preBuffer < 0) {
        errors.preBuffer = 'Pre-Buffer kann nicht negativ sein';
      }

      if (formData.postBuffer < 0) {
        errors.postBuffer = 'Post-Buffer kann nicht negativ sein';
      }

      if (formData.defaultDuration < 1) {
        errors.defaultDuration = 'Standard-Dauer muss mindestens 1 Minute betragen';
      }
      
      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      
      if (!validateForm()) {
        return;
      }

      // Parse criteria for complex types
      let processedCriteria = formData.criteria;
      if (formData.type === 'title_and_genre') {
        try {
          processedCriteria = JSON.parse(formData.criteria);
        } catch (err) {
          setFormErrors({ criteria: 'Ungültiges JSON-Format für Titel und Genre' });
          return;
        }
      }

      const taskData = {
        ...formData,
        criteria: processedCriteria,
        channels: formData.channels.filter(ch => ch && ch.trim()),
        priority: Number(formData.priority),
        preBuffer: Number(formData.preBuffer),
        postBuffer: Number(formData.postBuffer),
        defaultDuration: Number(formData.defaultDuration)
      };

      handleCreateTask(taskData);
    };

    const handleChannelChange = (channelList) => {
      const channels = channelList.split(',').map(ch => ch.trim()).filter(ch => ch);
      handleInputChange('channels', channels);
    };

    const handleDayToggle = (day) => {
      const currentDays = formData.days;
      const newDays = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day].sort();
      
      handleInputChange('days', newDays);
    };

    const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

    return (
      <div className="modal-overlay">
        <div className="modal-content max-w-2xl">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Neuen Task erstellen</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task-Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`input ${formErrors.name ? 'border-red-500' : ''}`}
                    placeholder="z.B. Tatort aufnehmen"
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task-Typ *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="input"
                  >
                    {Object.entries(taskTypes).map(([key, type]) => (
                      <option key={key} value={key}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Criteria */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Suchkriterien *
                </label>
                <input
                  type="text"
                  value={formData.criteria}
                  onChange={(e) => handleInputChange('criteria', e.target.value)}
                  className={`input ${formErrors.criteria ? 'border-red-500' : ''}`}
                  placeholder={
                    formData.type === 'title_and_genre' 
                      ? '{"title": "Krimi", "genre": "Serie"}'
                      : taskTypes[formData.type]?.example || 'Suchtext eingeben'
                  }
                />
                {formErrors.criteria && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.criteria}</p>
                )}
                {taskTypes[formData.type]?.description && (
                  <p className="text-gray-600 text-sm mt-1">
                    {taskTypes[formData.type].description}
                  </p>
                )}
              </div>

              {/* Channels */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sender (optional)
                </label>
                <input
                  type="text"
                  value={formData.channels.join(', ')}
                  onChange={(e) => handleChannelChange(e.target.value)}
                  className="input"
                  placeholder="z.B. Das Erste, ZDF, ProSieben (kommagetrennt)"
                />
                <p className="text-gray-600 text-sm mt-1">
                  Leer lassen für alle Sender
                </p>
              </div>

              {/* Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wochentage
                </label>
                <div className="flex gap-2">
                  {dayNames.map((dayName, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleDayToggle(index)}
                      className={`px-3 py-2 text-sm rounded ${
                        formData.days.includes(index)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {dayName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Erweiterte Einstellungen</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priorität (0-100)
                    </label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                      className={`input ${formErrors.priority ? 'border-red-500' : ''}`}
                      min="0"
                      max="100"
                    />
                    {formErrors.priority && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.priority}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Standard-Dauer (Minuten)
                    </label>
                    <input
                      type="number"
                      value={formData.defaultDuration}
                      onChange={(e) => handleInputChange('defaultDuration', e.target.value)}
                      className={`input ${formErrors.defaultDuration ? 'border-red-500' : ''}`}
                      min="1"
                    />
                    {formErrors.defaultDuration && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.defaultDuration}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pre-Buffer (Minuten)
                    </label>
                    <input
                      type="number"
                      value={formData.preBuffer}
                      onChange={(e) => handleInputChange('preBuffer', e.target.value)}
                      className={`input ${formErrors.preBuffer ? 'border-red-500' : ''}`}
                      min="0"
                    />
                    {formErrors.preBuffer && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.preBuffer}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Post-Buffer (Minuten)
                    </label>
                    <input
                      type="number"
                      value={formData.postBuffer}
                      onChange={(e) => handleInputChange('postBuffer', e.target.value)}
                      className={`input ${formErrors.postBuffer ? 'border-red-500' : ''}`}
                      min="0"
                    />
                    {formErrors.postBuffer && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.postBuffer}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ordner
                    </label>
                    <input
                      type="text"
                      value={formData.folder}
                      onChange={(e) => handleInputChange('folder', e.target.value)}
                      className="input"
                      placeholder="Auto"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Serie/Kategorie
                    </label>
                    <input
                      type="text"
                      value={formData.series}
                      onChange={(e) => handleInputChange('series', e.target.value)}
                      className="input"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => handleInputChange('active', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Task sofort aktivieren</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn btn-outline"
                disabled={isSubmitting}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Erstelle...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Task erstellen
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap size={24} />
            Automatische Tasks
          </h1>
          <p className="text-gray-600 mt-1">
            Erstellen Sie automatische Aufnahme-Regeln basierend auf EPG-Daten
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadTaskData}
            disabled={isLoading}
            className="btn btn-outline"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Aktualisieren
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <Plus size={16} />
            Neuer Task
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <ErrorAlert
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {success && (
        <SuccessMessage
          message={success}
          onClose={() => setSuccess(null)}
        />
      )}

      {/* Statistics */}
      {!isLoading && <TaskStats />}

      {/* Task List */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, index) => (
            <LoadingCard key={index} text="Lade Tasks..." />
          ))}
        </div>
      ) : tasks.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tasks.map(task => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="card-body text-center py-12">
            <Zap size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Noch keine automatischen Tasks
            </h3>
            <p className="text-gray-600 mb-4">
              Erstellen Sie Ihren ersten automatischen Aufnahme-Task.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              <Plus size={16} />
              Ersten Task erstellen
            </button>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-gray-900 mb-2">
                Wie funktionieren automatische Tasks?
              </h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• Tasks werden täglich um 6:00 Uhr automatisch ausgeführt</p>
                <p>• Sie durchsuchen die EPG-Daten der nächsten 7 Tage nach Ihren Kriterien</p>
                <p>• Bei Treffern werden automatisch Timer im DVB Viewer erstellt</p>
                <p>• Sie können Tasks auch jederzeit manuell ausführen</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && <CreateTaskModal />}

      {showTaskDetails && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Task Details</h2>
                <button
                  onClick={() => setShowTaskDetails(null)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Task Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                    <div><strong>Name:</strong> {showTaskDetails.name}</div>
                    <div><strong>Typ:</strong> {getTaskTypeName(showTaskDetails.type)}</div>
                    <div><strong>Status:</strong> {showTaskDetails.active ? 'Aktiv' : 'Inaktiv'}</div>
                    <div><strong>Kriterien:</strong> {getTaskCriteriaDisplay(showTaskDetails)}</div>
                    <div><strong>Priorität:</strong> {showTaskDetails.priority || 50}</div>
                    <div><strong>Sender:</strong> {showTaskDetails.channels?.length ? showTaskDetails.channels.join(', ') : 'Alle'}</div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Statistiken</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                    <div><strong>Treffer gefunden:</strong> {showTaskDetails.matchCount || 0}</div>
                    <div><strong>Timer erstellt:</strong> {showTaskDetails.timerCount || 0}</div>
                    <div><strong>Erstellt am:</strong> {formatters.formatDate(showTaskDetails.createdAt)}</div>
                    <div><strong>Letzte Ausführung:</strong> {showTaskDetails.lastRun ? formatters.formatDate(showTaskDetails.lastRun) : 'Nie'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskManager;