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
  CheckCircle
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

      {/* Modals would go here */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Neuen Task erstellen</h2>
              <p className="text-gray-600">
                Task-Erstellung wird in einer zukünftigen Version implementiert.
              </p>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-outline"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    <div><strong>Erstellt:</strong> {formatters.formatDateTime(showTaskDetails.createdAt)}</div>
                    {showTaskDetails.lastRun && (
                      <div><strong>Letzte Ausführung:</strong> {formatters.formatDateTime(showTaskDetails.lastRun)}</div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Statistiken</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded text-center">
                      <div className="text-xl font-bold text-blue-600">{showTaskDetails.matchCount || 0}</div>
                      <div className="text-sm text-blue-700">Treffer gesamt</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded text-center">
                      <div className="text-xl font-bold text-green-600">{showTaskDetails.timerCount || 0}</div>
                      <div className="text-sm text-green-700">Timer erstellt</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowTaskDetails(null)}
                  className="btn btn-outline"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskManager;