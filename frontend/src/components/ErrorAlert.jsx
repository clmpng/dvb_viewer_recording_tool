import React, { useEffect } from 'react';
import { 
  AlertCircle, 
  X, 
  Info, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';

function ErrorAlert({ 
  type = 'error', 
  message, 
  details = null,
  onClose = null,
  className = '',
  showIcon = true,
  title = null,
  compact = false
}) {
  const alertConfig = {
    error: {
      icon: AlertCircle,
      className: 'alert-error',
      defaultTitle: 'Fehler'
    },
    warning: {
      icon: AlertTriangle,
      className: 'alert-warning',
      defaultTitle: 'Warnung'
    },
    info: {
      icon: Info,
      className: 'alert-info',
      defaultTitle: 'Information'
    },
    success: {
      icon: CheckCircle,
      className: 'alert-success',
      defaultTitle: 'Erfolg'
    }
  };

  const config = alertConfig[type];
  const Icon = config.icon;
  const displayTitle = title || config.defaultTitle;

  return (
    <div className={`alert ${config.className} ${compact ? 'py-3' : ''} ${className}`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        {showIcon && (
          <div className="flex-shrink-0 pt-0.5">
            <Icon size={compact ? 16 : 20} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          {displayTitle && !compact && (
            <h4 className="font-medium mb-1">
              {displayTitle}
            </h4>
          )}

          {/* Message */}
          <div className={compact ? 'text-sm' : 'text-sm'}>
            {typeof message === 'string' ? (
              <p>{message}</p>
            ) : (
              message
            )}
          </div>

          {/* Details */}
          {details && !compact && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm opacity-75 hover:opacity-100">
                Details anzeigen
              </summary>
              <div className="mt-2 text-xs opacity-75 font-mono bg-black bg-opacity-5 p-2 rounded">
                {typeof details === 'string' ? details : JSON.stringify(details, null, 2)}
              </div>
            </details>
          )}
        </div>

        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors"
            title="Schließen"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// Success Message Component
export function SuccessMessage({ 
  message, 
  className = '',
  onClose = null,
  autoClose = true,
  duration = 3000
}) {
  useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  return (
    <ErrorAlert
      type="success"
      message={message}
      onClose={onClose}
      className={className}
      compact
    />
  );
}

// Toast Notification Component for floating messages
export function ToastNotification({ 
  type = 'info',
  message, 
  show = true,
  onClose = null,
  duration = 5000
}) {
  useEffect(() => {
    if (show && onClose && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 z-1000 w-80">
      <ErrorAlert
        type={type}
        message={message}
        onClose={onClose}
        className="shadow-xl"
        compact
      />
    </div>
  );
}

// Compact System Status Alert for the main app
export function SystemStatusAlert({ systemStatus, onClose }) {
  const critical = !systemStatus.backend;
  const warning = systemStatus.backend && !systemStatus.dvbViewer;
  
  if (!critical && !warning) return null;

  const type = critical ? 'error' : 'warning';
  const message = critical 
    ? 'Backend nicht erreichbar - Überprüfen Sie die Verbindung' 
    : 'DVB Viewer offline - Aufnahmen können nicht erstellt werden';

  return (
    <ErrorAlert
      type={type}
      message={message}
      onClose={onClose}
      compact
      className="mb-4"
    />
  );
}

export default ErrorAlert;