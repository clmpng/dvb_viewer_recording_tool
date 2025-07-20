import React from 'react';

function LoadingSpinner({ 
  size = 'md', 
  text = null, 
  className = '',
  inline = false 
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg', 
    xl: 'text-xl'
  };

  const spinnerElement = (
    <div className={`
      ${sizeClasses[size]} 
      border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin
      ${className}
    `} />
  );

  if (inline) {
    return (
      <span className="inline-flex items-center gap-2">
        {spinnerElement}
        {text && (
          <span className={`${textSizeClasses[size]} text-gray-600`}>
            {text}
          </span>
        )}
      </span>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {spinnerElement}
      {text && (
        <p className={`${textSizeClasses[size]} text-gray-600 text-center`}>
          {text}
        </p>
      )}
    </div>
  );
}

// Specialized loading components
export function LoadingCard({ text = 'Laden...' }) {
  return (
    <div className="card">
      <div className="card-body py-8 text-center">
        <LoadingSpinner size="md" text={text} />
      </div>
    </div>
  );
}

export function LoadingOverlay({ text = 'Laden...', show = true }) {
  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="card max-w-sm w-full">
        <div className="card-body text-center">
          <LoadingSpinner size="lg" text={text} />
        </div>
      </div>
    </div>
  );
}

export function LoadingButton({ 
  children, 
  loading = false, 
  disabled = false,
  className = '',
  ...props 
}) {
  return (
    <button
      disabled={loading || disabled}
      className={`btn ${className}`}
      {...props}
    >
      {loading ? (
        <LoadingSpinner size="sm" inline />
      ) : (
        children
      )}
    </button>
  );
}

export default LoadingSpinner;