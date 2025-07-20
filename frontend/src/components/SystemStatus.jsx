import React from 'react';
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
  title = null
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
    <div className={`alert ${config.className} ${className}`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        {showIcon && (
          <div className="flex-shrink-0 pt-0.5">
            <Icon size={20} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          {displayTitle && (
            <h4 className="font-medium mb-1">
              {displayTitle}
            </h4>
          )}

          {/* Message */}
          <div className="text-sm">
            {typeof message === 'string' ? (
              <p>{message}</p>
            ) : (
              message
            )}
          </div>

          {/* Details */}
          {details && (
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
            className="flex-shrink-0 p-1 hover:bg-black hover:bg-opacity-10 rounded"
            title="Schließen"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// Specialized alert components
export function ErrorMessage({ error, onClose, className = '' }) {
  // Extract error information
  const getErrorInfo = (err) => {
    if (typeof err === 'string') {
      return { message: err, details: null };
    }
    
    if (err?.response?.data) {
      return {
        message: err.response.data.message || err.response.data.error || 'Ein Fehler ist aufgetreten',
        details: err.response.data.details || err.response.data
      };
    }
    
    if (err?.message) {
      return {
        message: err.message,
        details: err.stack || err
      };
    }
    
    return {
      message: 'Ein unbekannter Fehler ist aufgetreten',
      details: err
    };
  };

  const { message, details } = getErrorInfo(error);

  return (
    <ErrorAlert
      type="error"
      message={message}
      details={details}
      onClose={onClose}
      className={className}
    />
  );
}

export function SuccessMessage({ message, onClose, className = '' }) {
  return (
    <ErrorAlert
      type="success"
      message={message}
      onClose={onClose}
      className={className}
    />
  );
}

export function WarningMessage({ message, onClose, className = '' }) {
  return (
    <ErrorAlert
      type="warning"
      message={message}
      onClose={onClose}
      className={className}
    />
  );
}

export function InfoMessage({ message, onClose, className = '' }) {
  return (
    <ErrorAlert
      type="info"
      message={message}
      onClose={onClose}
      className={className}
    />
  );
}

// Toast notification component (for future use)
export function Toast({ 
  type = 'info', 
  message, 
  duration = 5000, 
  onClose,
  show = true 
}) {
  React.useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-80">
      <ErrorAlert
        type={type}
        message={message}
        onClose={onClose}
        className="shadow-lg"
      />
    </div>
  );
}

export default ErrorAlert;