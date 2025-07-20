import React from 'react';
import { 
  Tv, 
  Settings, 
  Activity, 
  RefreshCw,
  Zap
} from 'lucide-react';

function Navigation({ currentView, onNavigate, systemStatus, onRefresh }) {
  const navItems = [
    {
      id: 'epg',
      label: 'EPG & Aufnahmen',
      icon: Tv,
      description: 'TV-Programm anzeigen und Aufnahmen erstellen'
    },
    {
      id: 'tasks',
      label: 'Automatische Tasks',
      icon: Zap,
      description: 'Automatische Aufnahme-Regeln verwalten'
    },
    {
      id: 'status',
      label: 'System Status',
      icon: Activity,
      description: 'System-Status und Einstellungen'
    }
  ];

  const getStatusColor = () => {
    if (systemStatus.backend && systemStatus.dvbViewer) return 'green';
    if (systemStatus.backend) return 'yellow';
    return 'red';
  };

  const getStatusText = () => {
    if (systemStatus.backend && systemStatus.dvbViewer) return 'Alle Systeme bereit';
    if (systemStatus.backend) return 'DVB Viewer offline';
    return 'Backend-Fehler';
  };

  return (
    <nav className="card mb-6">
      <div className="card-body py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Title */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl flex items-center justify-center shadow-lg">
              <Tv size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                DVB EPG Manager
              </h1>
              <p className="text-sm text-gray-500">
                TV-Programm & Aufnahme-Verwaltung
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`btn ${isActive ? 'btn-primary' : 'btn-outline'} transition-all`}
                  title={item.description}
                >
                  <Icon size={18} />
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Status & Controls */}
          <div className="flex items-center gap-3">
            {/* System Status Indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                getStatusColor() === 'green' ? 'bg-green-500' :
                getStatusColor() === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className={`text-sm font-medium ${
                getStatusColor() === 'green' ? 'text-green-600' :
                getStatusColor() === 'yellow' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {getStatusText()}
              </span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              className="btn btn-outline btn-sm"
              title="Daten aktualisieren"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;