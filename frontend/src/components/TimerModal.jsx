import React, { useState, useEffect } from 'react';
import { 
  X, 
  Play, 
  Calendar,
  Clock,
  Settings,
  AlertCircle,
  CheckCircle
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

    // Auto-calculate end time if start time or duration changes
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
      setSuccess('Timer wurde erfolgreich erstellt!');
      
      // Close modal after short delay
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);

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

  const channel = channels[program.channelId];

  return (
    <div 
      className="modal-overlay"
      onClick={handleOverlayClick}
    >
      <div className="modal-content">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Play size={20} />
              Timer erstellen
            </h2>
            <p className="text-gray-600 mt-1">
              Aufnahme für "{formatters.truncateText(program.title, 50)}"
            </p>
          </div>
          
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Schließen"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <ErrorAlert
              message={error}
              onClose={() => setError(null)}
              className="mb-4"
            />
          )}

          {success && (
            <SuccessMessage
              message={success}
              className="mb-4"
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="md:col-span-2">
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

              {/* Channel Info */}
              <div className="md:col-span-2 bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar size={16} className="text-blue-600" />
                  <span className="font-medium">Sender:</span>
                  <span>{channel?.name || `Channel ${program.channelId}`}</span>
                  <span className="text-gray-500">•</span>
                  <span>{formatters.getDayName(program.day || 0)}</span>
                </div>
              </div>

              {/* Date */}
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

              {/* Start Time */}
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

              {/* End Time */}
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

              {/* Series */}
              <div>
                <label className="form-label">Serie (optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={timerData.series}
                  onChange={(e) => handleInputChange('series', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Serienname für bessere Organisation"
                />
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <div className="border-t pt-4">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                disabled={isSubmitting}
              >
                <Settings size={16} />
                Erweiterte Einstellungen {showAdvanced ? 'ausblenden' : 'anzeigen'}
              </button>
            </div>

            {/* Advanced Settings */}
            {showAdvanced && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                {/* Pre-buffer */}
                <div>
                  <label className="form-label">Vorlauf (Min)</label>
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
                  <label className="form-label">Nachlauf (Min)</label>
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
                  <label className="form-label">Priorität</label>
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
                  <label className="form-label">Ordner</label>
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
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
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
              disabled={isSubmitting || !!success}
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
  );
}

export default TimerModal;