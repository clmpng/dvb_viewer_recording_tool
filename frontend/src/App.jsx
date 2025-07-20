import React, { useState, useEffect } from 'react';
import { apiService, errorHandler } from './services/api';
import Navigation from './components/Navigation';
import EPGView from './components/EPGView';
import TaskManager from './components/TaskManager';
import SystemStatus from './components/SystemStatus';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorAlert, { SystemStatusAlert } from './components/ErrorAlert';

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
          displayName: channel.name.replace(' HD', '')
        };
        return acc;
      }, {});

      setChannels(processedChannels);
      console.log(`✅ Loaded ${Object.keys(processedChannels).length} channels`);

      // Check system status
      await checkSystemStatus();

    } catch (err) {
      console.error('Failed to initialize app:', err);
      setError(`Initialisierung fehlgeschlagen: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Check system status (backend, DVB Viewer, scheduler)
   */
  const checkSystemStatus = async () => {
    try {
      console.log('Checking system status...');
      const statusResponse = await apiService.getSystemStatus();
      
      setSystemStatus({
        backend: true, // If we got here, backend is working
        dvbViewer: statusResponse.data.dvbViewerAvailable || false,
        scheduler: statusResponse.data.schedulerRunning || false
      });

      console.log('✅ System status updated:', statusResponse.data);
    } catch (err) {
      console.warn('Failed to check system status:', err);
      // Backend is working (we loaded channels), but status check failed
      setSystemStatus(prev => ({
        ...prev,
        backend: true,
        dvbViewer: false,
        scheduler: false
      }));
    }
  };

  /**
   * Handle navigation between views
   */
  const handleNavigation = (view) => {
    setCurrentView(view);
    // Clear any existing errors when switching views
    setError(null);
  };

  /**
   * Handle refresh - reload all data
   */
  const handleRefresh = async () => {
    await initializeApp();
  };

  /**
   * Clear current error
   */
  const clearError = () => {
    setError(null);
  };

  /**
   * Handle errors from child components
   */
  const handleError = (error) => {
    console.error('App error:', error);
    setError(typeof error === 'string' ? error : error.message);
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
        {/* System Status Alert - Compact version */}
        <SystemStatusAlert 
          systemStatus={systemStatus}
          onClose={() => {}} // Optional: allow dismissing
        />

        {/* Global Error Alert */}
        {error && (
          <ErrorAlert 
            message={error}
            onClose={clearError}
            className="mb-6"
          />
        )}

        {/* View Content */}
        <div className="space-y-6">
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
              systemStatus={systemStatus}
              channels={channels}
              onRefresh={handleRefresh}
              onError={handleError}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="container py-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <span className="font-medium">DVB EPG Manager</span>
              <span className="ml-2">v1.0.0</span>
            </div>
            
            <div className="flex items-center gap-6">
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