import React, { useState, useEffect } from 'react';
import { apiService, errorHandler } from './services/api';
import Navigation from './components/Navigation';
import EPGView from './components/EPGView';
//import TaskManager from './components/TaskManager';
import SystemStatus from './components/SystemStatus';
import LoadingSpinner from './components/LoadingSpinner';
//import ErrorAlert from './components/ErrorAlert';

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
      setChannels(channelsData);
      console.log(`✅ Loaded ${Object.keys(channelsData).length} channels`);

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
    } catch (err) {
      console.warn('Backend health check failed:', err.message);
      status.backend = false;
    }

    try {
      // Check DVB Viewer connection
      await apiService.testDVBConnection();
      status.dvbViewer = true;
    } catch (err) {
      console.warn('DVB Viewer connection failed:', err.message);
      status.dvbViewer = false;
    }

    try {
      // Check scheduler status
      await apiService.getSchedulerStatus();
      status.scheduler = true;
    } catch (err) {
      console.warn('Scheduler status check failed:', err.message);
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
    setError(errorHandler.extractMessage(error));
  };

  /**
   * Clear current error
   */
  const clearError = () => {
    setError(null);
  };

  // Show loading screen during initialization
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">DVB EPG Manager wird geladen...</p>
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
                Erneut versuchen
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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

        {/* System Status (shown when there are issues) */}
        {(!systemStatus.backend || !systemStatus.dvbViewer) && (
          <SystemStatus 
            status={systemStatus}
            onRefresh={checkSystemStatus}
            className="mb-6"
          />
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
            onRefresh={checkSystemStatus}
            showDetails={true}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="container py-4">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>
              DVB EPG Manager v1.0
            </div>
            <div className="flex gap-4">
              <span>
                Channels: {Object.keys(channels).length}
              </span>
              <span className={systemStatus.backend ? 'text-green-600' : 'text-red-600'}>
                Backend: {systemStatus.backend ? 'OK' : 'Error'}
              </span>
              <span className={systemStatus.dvbViewer ? 'text-green-600' : 'text-yellow-600'}>
                DVB: {systemStatus.dvbViewer ? 'OK' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;