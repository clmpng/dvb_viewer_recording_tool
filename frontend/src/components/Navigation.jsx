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
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container">
        <div className="flex items-center justify-between py-4">
          {/* Logo/Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-lg">
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
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${isActive 
                      ? 'bg-blue-100 text-blue-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
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
              <div className={`
                w-2 h-2 rounded-full
                ${getStatusColor() === 'green' ? 'bg-green-500' : ''}
                ${getStatusColor() === 'yellow' ? 'bg-yellow-500' : ''}
                ${getStatusColor() === 'red' ? 'bg-red-500' : ''}
              `} />
              <span className="text-sm text-gray-600 hidden sm:inline">
                {getStatusText()}
              </span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              className="btn btn-outline btn-sm"
              title="System-Status aktualisieren"
            >
              <RefreshCw size={16} />
              <span className="hidden md:inline">Aktualisieren</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation (if needed) */}
        <div className="md:hidden border-t border-gray-200 pt-2 pb-1">
          <div className="flex justify-around">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`
                    flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs transition-all
                    ${isActive 
                      ? 'text-blue-700 bg-blue-50' 
                      : 'text-gray-600'
                    }
                  `}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;