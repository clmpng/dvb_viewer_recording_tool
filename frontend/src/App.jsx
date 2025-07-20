import React, { useState, useEffect } from 'react';
import { apiService, errorHandler } from './services/api';
import Navigation from './components/Navigation';
import EPGView from './components/EPGView';
import TaskManager from './components/TaskManager';
import SystemStatus from './components/SystemStatus';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorAlert from './components/ErrorAlert';

function App() {
  // Application state
  const [currentView, setCurrentView] = useState('epg');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [channels, setChannels] = useState({});
  const [systemStatus, setSystemStatus] = useState({
    backend: false,
    dvbViewer: false,
    scheduler: false
  });

  // Initialize application
  useEffect(() => {
    initializeApp();
  }, []);

  /**
   * Initialize the application by loading channels and checking system status
   */
  const initializeApp = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load channels first (required for EPG)
      console.log('Loading channels...');
      const channelsData = await apiService.getChannels();
      
      // Filter and process channels to show availability
      const processedChannels = Object.entries(channelsData).reduce((acc, [id, channel]) => {
        acc[id] = {
          ...channel,
          isAvailable: !channel.note || !channel.note.includes('Nicht in DVB Viewer verfügbar'),
          displayName: channel.name.replace(' HD', '') // Cleaner display names
        };
        return acc;
      }, {});
      
      setChannels(processedChannels);
      
      const availableCount = Object.values(processedChannels).filter(ch => ch.isAvailable).length;
      const totalCount = Object.keys(processedChannels).length;
      
      console.log(`✅ Loaded ${totalCount} channels (${availableCount} available in DVB Viewer)`);

      // Check system status
      await checkSystemStatus();

      console.log('✅ Application initialized successfully');
    } catch (err) {
      console.error('❌ Application initialization failed:', err);
      setError(errorHandler.extractMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Check system components status
   */
  const checkSystemStatus = async () => {
    const status = { ...systemStatus };

    try {
      // Check backend health
      await apiService.checkHealth();
      status.backend = true;
      console.log('✅ Backend is healthy');
    } catch (err) {
      console.warn('⚠️ Backend health check failed:', err.message);
      status.backend = false;
    }

    try {
      // Check DVB Viewer connection
      const dvbResult = await apiService.testDVBConnection();
      status.dvbViewer = dvbResult.success;
      if (dvbResult.success) {
        console.log('✅ DVB Viewer connection successful');
      } else {
        console.warn('⚠️ DVB Viewer connection failed (may be offline)');
      }
    } catch (err) {
      console.warn('⚠️ DVB Viewer connection failed:', err.message);
      status.dvbViewer = false;
    }

    try {
      // Check scheduler status
      const schedulerResult = await apiService.getSchedulerStatus();
      status.scheduler = schedulerResult.success && schedulerResult.data.isRunning;
      if (status.scheduler) {
        console.log('✅ Scheduler is running');
      } else {
        console.warn('⚠️ Scheduler is not running properly');
      }
    } catch (err) {
      console.warn('⚠️ Scheduler status check failed:', err.message);
      status.scheduler = false;
    }

    setSystemStatus(status);
  };

  /**
   * Handle navigation between views
   */
  const handleNavigation = (view) => {
    setCurrentView(view);
    setError(null); // Clear errors when switching views
  };

  /**
   * Handle system refresh
   */
  const handleRefresh = async () => {
    await initializeApp();
  };

  /**
   * Handle global error display
   */
  const handleError = (error) => {
    const message = errorHandler.extractMessage(error);
    setError(message);
    
    // Auto-clear non-critical errors after 10 seconds
    if (!errorHandler.isServerError(error)) {
      setTimeout(() => setError(null), 10000);
    }
  };

  /**
   * Clear current error
   */
  const clearError = () => {
    setError(null);
  };

  /**
   * Get system health summary
   */
  const getSystemHealth = () => {
    const healthy = systemStatus.backend && systemStatus.dvbViewer;
    const warning = systemStatus.backend && !systemStatus.dvbViewer;
    const critical = !systemStatus.backend;
    
    return {
      status: critical ? 'critical' : warning ? 'warning' : 'healthy',
      message: critical ? 'Backend offline' : 
               warning ? 'DVB Viewer offline' : 
               'Alle Systeme bereit',
      color: critical ? 'red' : warning ? 'yellow' : 'green'
    };
  };

  // Show loading screen during initialization
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-6 text-lg text-gray-600">DVB EPG Manager wird geladen...</p>
          <p className="mt-2 text-sm text-gray-500">Lade Kanäle und prüfe Systemstatus</p>
        </div>
      </div>
    );
  }

  // Show error screen if initialization failed completely
  if (error && Object.keys(channels).length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="card">
            <div className="card-body text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-red-600 mb-4">
                Initialisierung fehlgeschlagen
              </h1>
              <p className="text-gray-600 mb-6">
                {error}
              </p>
              <button 
                onClick={handleRefresh}
                className="btn btn-primary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Erneut versuchen
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const systemHealth = getSystemHealth();

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <Navigation 
        currentView={currentView}
        onNavigate={handleNavigation}
        systemStatus={systemStatus}
        onRefresh={handleRefresh}
      />

      {/* Main Content */}
      <main className="container py-6">
        {/* Global Error Alert */}
        {error && (
          <ErrorAlert 
            message={error}
            onClose={clearError}
            className="mb-6"
          />
        )}

        {/* System Status Warning (only when there are issues) */}
        {systemHealth.status !== 'healthy' && (
          <div className={`alert ${systemHealth.status === 'critical' ? 'alert-error' : 'alert-warning'} mb-6`}>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold">{systemHealth.message}</p>
                <p className="text-sm opacity-90 mt-1">
                  {systemHealth.status === 'critical' 
                    ? 'Backend ist nicht erreichbar. Überprüfen Sie die Verbindung.' 
                    : 'DVB Viewer ist offline. Aufnahmen können nicht erstellt werden.'}
                </p>
              </div>
              <button
                onClick={checkSystemStatus}
                className="btn btn-outline btn-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Prüfen
              </button>
            </div>
          </div>
        )}

        {/* View Content */}
        {currentView === 'epg' && (
          <EPGView 
            channels={channels}
            onError={handleError}
          />
        )}

        {currentView === 'tasks' && (
          <TaskManager 
            channels={channels}
            onError={handleError}
          />
        )}

        {currentView === 'status' && (
          <SystemStatus 
            status={systemStatus}
            channels={channels}
            onRefresh={checkSystemStatus}
            showDetails={true}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/10 backdrop-filter backdrop-blur-lg border-t border-white/20 mt-12">
        <div className="container py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="font-semibold">DVB EPG Manager v1.0</span>
            </div>
            
            <div className="flex flex-wrap gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="font-medium">Kanäle:</span> 
                <span>{Object.values(channels).filter(ch => ch.isAvailable).length}</span>
                <span className="text-gray-400">/ {Object.keys(channels).length}</span>
              </span>
              
              <span className="flex items-center gap-2">
                <span className="font-medium">Backend:</span>
                <div className={`w-2 h-2 rounded-full ${systemStatus.backend ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className={systemStatus.backend ? 'text-green-600' : 'text-red-600'}>
                  {systemStatus.backend ? 'Online' : 'Offline'}
                </span>
              </span>
              
              <span className="flex items-center gap-2">
                <span className="font-medium">DVB Viewer:</span>
                <div className={`w-2 h-2 rounded-full ${systemStatus.dvbViewer ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className={systemStatus.dvbViewer ? 'text-green-600' : 'text-yellow-600'}>
                  {systemStatus.dvbViewer ? 'Bereit' : 'Offline'}
                </span>
              </span>
              
              <span className="flex items-center gap-2">
                <span className="font-medium">Scheduler:</span>
                <div className={`w-2 h-2 rounded-full ${systemStatus.scheduler ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className={systemStatus.scheduler ? 'text-green-600' : 'text-gray-500'}>
                  {systemStatus.scheduler ? 'Aktiv' : 'Pausiert'}
                </span>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;