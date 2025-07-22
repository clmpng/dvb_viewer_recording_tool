import React, { useState, useEffect } from 'react';
import { 
  X, 
  Play, 
  Calendar,
  Clock,
  Settings,
  AlertCircle,
  CheckCircle,
  Tv,
  Zap,
  Info
} from 'lucide-react';
import { apiService, formatters } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import ErrorAlert, { SuccessMessage } from './ErrorAlert';

function TimerModal({ 
  program, 
  channels, 
  onClose, 
  onSuccess, 
  onError 
}) {
  // Form state
  const [timerData, setTimerData] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    epgBefore: 5,
    epgAfter: 10,
    folder: 'Auto',
    priority: 50,
    series: ''
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validation, setValidation] = useState({});

  // Initialize form with program data
  useEffect(() => {
    if (program) {
      initializeFormData();
    }
  }, [program]);

  /**
   * Initialize form with program data
   */
  const initializeFormData = () => {
    // Calculate target date
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + (program.day || 0));

    // Set initial form data
    setTimerData({
      title: program.title || '',
      date: formatters.formatDateForDVB(targetDate),
      startTime: program.time || '',
      endTime: program.endTime || calculateEndTime(program.time, 120), // Default 2h
      epgBefore: 5,
      epgAfter: 10,
      folder: 'Auto',
      priority: 50,
      series: ''
    });
  };

  /**
   * Calculate end time from start time and duration
   */
  const calculateEndTime = (startTime, durationMinutes) => {
    if (!startTime) return '';
    
    try {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date(2000, 0, 1, hours, minutes);
      const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
      
      const endHours = endDate.getHours().toString().padStart(2, '0');
      const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
      
      return `${endHours}:${endMinutes}`;
    } catch (err) {
      return '';
    }
  };

  /**
   * Handle form field changes
   */
  const handleInputChange = (field, value) => {
    setTimerData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear validation errors for this field
    if (validation[field]) {
      setValidation(prev => ({
        ...prev,
        [field]: null
      }));
    }

    // Auto-calculate end time if start time changes
    if (field === 'startTime' && value) {
      const endTime = calculateEndTime(value, 120); // Default 2h
      setTimerData(prev => ({
        ...prev,
        endTime: prev.endTime || endTime
      }));
    }
  };

  /**
   * Validate form data
   */
  const validateForm = () => {
    const errors = {};

    if (!timerData.title.trim()) {
      errors.title = 'Titel ist erforderlich';
    }

    if (!timerData.date) {
      errors.date = 'Datum ist erforderlich';
    }

    if (!timerData.startTime) {
      errors.startTime = 'Startzeit ist erforderlich';
    }

    if (!timerData.endTime) {
      errors.endTime = 'Endzeit ist erforderlich';
    }

    // Validate time format
    const timeRegex = /^\d{2}:\d{2}$/;
    if (timerData.startTime && !timeRegex.test(timerData.startTime)) {
      errors.startTime = 'Ungültiges Zeitformat (HH:MM)';
    }

    if (timerData.endTime && !timeRegex.test(timerData.endTime)) {
      errors.endTime = 'Ungültiges Zeitformat (HH:MM)';
    }

    // Validate date format (DD.MM.YYYY)
    const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
    if (timerData.date && !dateRegex.test(timerData.date)) {
      errors.date = 'Ungültiges Datumsformat (DD.MM.YYYY)';
    }

    // Validate numeric fields
    if (isNaN(timerData.epgBefore) || timerData.epgBefore < 0) {
      errors.epgBefore = 'Vorlauf muss eine Zahl ≥ 0 sein';
    }

    if (isNaN(timerData.epgAfter) || timerData.epgAfter < 0) {
      errors.epgAfter = 'Nachlauf muss eine Zahl ≥ 0 sein';
    }

    if (isNaN(timerData.priority) || timerData.priority < 0 || timerData.priority > 100) {
      errors.priority = 'Priorität muss zwischen 0 und 100 liegen';
    }

    setValidation(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('Creating timer with data:', timerData);

      const timerPayload = {
        channelId: program.channelId,
        title: timerData.title.trim(),
        date: timerData.date,
        startTime: timerData.startTime,
        endTime: timerData.endTime,
        epgBefore: parseInt(timerData.epgBefore),
        epgAfter: parseInt(timerData.epgAfter),
        folder: timerData.folder,
        priority: parseInt(timerData.priority),
        series: timerData.series.trim()
      };

      const response = await apiService.createTimer(timerPayload);
      
      console.log('Timer created successfully:', response);
      setSuccess('Timer wurde erfolgreich erstellt! ✨');
      
      // Close modal after short delay
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);

    } catch (err) {
      console.error('Timer creation failed:', err);
      setError(err.message);
      onError?.(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle escape key
   */
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, isSubmitting]);

  /**
   * Handle click outside modal
   */
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  if (!program) return null;

  const channel = channels && (
    channels[program.channelId] || 
    channels[String(program.channelId)] || 
    channels[Number(program.channelId)]
  ) || null;
  const isChannelAvailable = channel && (!channel.note || !channel.note.includes('Nicht in DVB Viewer verfügbar'));

  return (
    <div 
      className="modal-overlay"
      onClick={handleOverlayClick}
    >
      <div className="modal-content">
        {/* Header */}
        <div className="card-header">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl flex items-center justify-center flex-shrink-0">
                <Play size={24} />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  Aufnahme erstellen
                </h2>
                <p className="text-gray-600 text-sm">
                  {formatters.truncateText(program.title, 60)}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Tv size={14} className="text-blue-600" />
                  <span className="text-sm text-gray-600">
                    {channel?.displayName || channel?.name || `Channel ${program.channelId}`}
                  </span>
                  {!isChannelAvailable && (
                    <span className="badge badge-yellow text-xs">
                      ⚠️ Nicht verfügbar
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Schließen"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="card-body">
          {/* Channel Availability Warning */}
          {!isChannelAvailable && (
            <div className="alert alert-warning mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Sender nicht verfügbar</h4>
                  <p className="text-sm">
                    Dieser Sender ist in Ihrem DVB Viewer nicht verfügbar. 
                    Die Aufnahme kann nicht erstellt werden.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <ErrorAlert
              message={error}
              onClose={() => setError(null)}
              className="mb-6"
            />
          )}

          {success && (
            <SuccessMessage
              message={success}
              className="mb-6"
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Info size={18} />
                Aufnahme-Details
              </h3>

              {/* Title */}
              <div>
                <label className="form-label">
                  Titel der Aufnahme *
                </label>
                <input
                  type="text"
                  className={`form-input ${validation.title ? 'border-red-300' : ''}`}
                  value={timerData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Name der Aufnahme"
                />
                {validation.title && (
                  <p className="text-red-600 text-sm mt-1">{validation.title}</p>
                )}
              </div>

              {/* Date and Time Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">
                    <Calendar size={16} className="inline mr-2" />
                    Datum *
                  </label>
                  <input
                    type="text"
                    className={`form-input ${validation.date ? 'border-red-300' : ''}`}
                    value={timerData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    disabled={isSubmitting}
                    placeholder="DD.MM.YYYY"
                  />
                  {validation.date && (
                    <p className="text-red-600 text-sm mt-1">{validation.date}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    <Clock size={16} className="inline mr-2" />
                    Startzeit *
                  </label>
                  <input
                    type="text"
                    className={`form-input ${validation.startTime ? 'border-red-300' : ''}`}
                    value={timerData.startTime}
                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                    disabled={isSubmitting}
                    placeholder="HH:MM"
                  />
                  {validation.startTime && (
                    <p className="text-red-600 text-sm mt-1">{validation.startTime}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">Endzeit *</label>
                  <input
                    type="text"
                    className={`form-input ${validation.endTime ? 'border-red-300' : ''}`}
                    value={timerData.endTime}
                    onChange={(e) => handleInputChange('endTime', e.target.value)}
                    disabled={isSubmitting}
                    placeholder="HH:MM"
                  />
                  {validation.endTime && (
                    <p className="text-red-600 text-sm mt-1">{validation.endTime}</p>
                  )}
                </div>
              </div>

              {/* Series */}
              <div>
                <label className="form-label">
                  Serie (optional)
                  <span className="text-xs text-gray-500 ml-2">Für bessere Organisation</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={timerData.series}
                  onChange={(e) => handleInputChange('series', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="z.B. Tatort, Dokumentation..."
                />
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <div className="border-t pt-6">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                disabled={isSubmitting}
              >
                <Settings size={18} />
                Erweiterte Einstellungen
                <svg 
                  className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Advanced Settings */}
            {showAdvanced && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Zap size={18} />
                  Erweiterte Optionen
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Pre-buffer */}
                  <div>
                    <label className="form-label">
                      Vorlauf (Min)
                      <span className="text-xs text-gray-500 block">Früher starten</span>
                    </label>
                    <input
                      type="number"
                      className={`form-input ${validation.epgBefore ? 'border-red-300' : ''}`}
                      value={timerData.epgBefore}
                      onChange={(e) => handleInputChange('epgBefore', e.target.value)}
                      disabled={isSubmitting}
                      min="0"
                      max="60"
                    />
                    {validation.epgBefore && (
                      <p className="text-red-600 text-xs mt-1">{validation.epgBefore}</p>
                    )}
                  </div>

                  {/* Post-buffer */}
                  <div>
                    <label className="form-label">
                      Nachlauf (Min)
                      <span className="text-xs text-gray-500 block">Länger aufnehmen</span>
                    </label>
                    <input
                      type="number"
                      className={`form-input ${validation.epgAfter ? 'border-red-300' : ''}`}
                      value={timerData.epgAfter}
                      onChange={(e) => handleInputChange('epgAfter', e.target.value)}
                      disabled={isSubmitting}
                      min="0"
                      max="60"
                    />
                    {validation.epgAfter && (
                      <p className="text-red-600 text-xs mt-1">{validation.epgAfter}</p>
                    )}
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="form-label">
                      Priorität
                      <span className="text-xs text-gray-500 block">0-100</span>
                    </label>
                    <input
                      type="number"
                      className={`form-input ${validation.priority ? 'border-red-300' : ''}`}
                      value={timerData.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                      disabled={isSubmitting}
                      min="0"
                      max="100"
                    />
                    {validation.priority && (
                      <p className="text-red-600 text-xs mt-1">{validation.priority}</p>
                    )}
                  </div>

                  {/* Folder */}
                  <div>
                    <label className="form-label">
                      Ordner
                      <span className="text-xs text-gray-500 block">Zielordner</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={timerData.folder}
                      onChange={(e) => handleInputChange('folder', e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Auto"
                    />
                  </div>
                </div>

                {/* Quick presets */}
                <div>
                  <label className="form-label mb-2">Schnelleinstellungen</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleInputChange('epgBefore', 2);
                        handleInputChange('epgAfter', 5);
                        handleInputChange('priority', 30);
                      }}
                      className="btn btn-outline btn-sm"
                      disabled={isSubmitting}
                    >
                      Niedrig
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleInputChange('epgBefore', 5);
                        handleInputChange('epgAfter', 10);
                        handleInputChange('priority', 50);
                      }}
                      className="btn btn-outline btn-sm"
                      disabled={isSubmitting}
                    >
                      Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleInputChange('epgBefore', 10);
                        handleInputChange('epgAfter', 20);
                        handleInputChange('priority', 80);
                      }}
                      className="btn btn-outline btn-sm"
                      disabled={isSubmitting}
                    >
                      Wichtig
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="card-footer">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <AlertCircle size={16} />
              <span>DVB Viewer muss für die Aufnahme laufen</span>
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="btn btn-outline"
              >
                Abbrechen
              </button>
              
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !!success || !isChannelAvailable}
                className="btn btn-primary"
              >
                {isSubmitting ? (
                  <LoadingSpinner size="sm" inline />
                ) : success ? (
                  <CheckCircle size={16} />
                ) : (
                  <Play size={16} />
                )}
                {isSubmitting ? 'Erstelle...' : success ? 'Erstellt!' : 'Timer erstellen'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TimerModal;