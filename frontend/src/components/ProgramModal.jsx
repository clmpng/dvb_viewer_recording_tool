import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  Calendar,
  Tv,
  Play,
  Info,
  Eye
} from 'lucide-react';
import { apiService, formatters } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import ErrorAlert from './ErrorAlert';

function ProgramModal({ 
  program, 
  onClose, 
  onCreateTimer 
}) {
  const [programDetails, setProgramDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load detailed program information
  useEffect(() => {
    if (program?.id) {
      loadProgramDetails();
    }
  }, [program?.id]);

  /**
   * Load detailed program information from API
   */
  const loadProgramDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`Loading details for program ${program.id}`);
      const response = await apiService.getProgramDetails(program.id);
      setProgramDetails(response.data);
    } catch (err) {
      console.error('Failed to load program details:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle click outside modal to close
   */
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  /**
   * Handle escape key to close modal
   */
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  /**
   * Get genre badge color
   */
  const getGenreBadgeClass = (genre) => {
    const genreColors = {
      'Spielfilm': 'badge-blue',
      'Serie': 'badge-purple',
      'Nachrichten': 'badge-red',
      'Sport': 'badge-green',
      'Dokumentation': 'badge-yellow',
      'Unterhaltung': 'badge-blue',
      'Kinder': 'badge-purple',
      'Musik': 'badge-green'
    };
    return genreColors[genre] || 'badge-gray';
  };

  /**
   * Format program duration
   */
  const formatDuration = (details) => {
    if (details.startTime && details.endTime) {
      const start = new Date(`1970-01-01T${details.startTime}`);
      const end = new Date(`1970-01-01T${details.endTime}`);
      const diffMs = end - start;
      const minutes = Math.floor(diffMs / 60000);
      return `${Math.floor(minutes / 60)}:${(minutes % 60).toString().padStart(2, '0')} h`;
    }
    return null;
  };

  /**
   * Extract format information
   */
  const extractFormats = (details) => {
    const formats = [];
    if (details.additionalInfo) {
      const info = details.additionalInfo.toLowerCase();
      if (info.includes('hd') || info.includes('720p') || info.includes('1080')) formats.push('HD');
      if (info.includes('stereo')) formats.push('Stereo');
      if (info.includes('dolby')) formats.push('Dolby');
      if (info.includes('16:9')) formats.push('16:9');
    }
    return formats;
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        {/* Header */}
        <div className="card-header">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-600">
                  {program.time}
                </span>
                {program.endTime && (
                  <span className="text-sm text-gray-500">
                    - {program.endTime}
                  </span>
                )}
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {program.title}
              </h2>
              
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge ${getGenreBadgeClass(program.genre)}`}>
                  {program.genre}
                </span>
                
                {program.channelId && (
                  <span className="badge badge-gray">
                    <Tv size={12} className="mr-1" />
                    Channel {program.channelId}
                  </span>
                )}
                
                {program.day !== undefined && (
                  <span className="badge badge-gray">
                    <Calendar size={12} className="mr-1" />
                    {formatters.getDayName(program.day)}
                  </span>
                )}
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Schließen"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="card-body">
          {error && (
            <ErrorAlert
              message={error}
              onClose={() => setError(null)}
              className="mb-4"
              compact
            />
          )}

          {isLoading ? (
            <div className="py-8">
              <LoadingSpinner 
                size="lg" 
                text="Lade Programm-Details..." 
              />
            </div>
          ) : programDetails ? (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Sendetermin
                  </h3>
                  <div className="text-sm space-y-1">
                    <div>{programDetails.date} um {programDetails.time} Uhr</div>
                    <div className="text-gray-600">
                      Sender: {programDetails.channel}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Format
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {formatDuration(programDetails) && (
                      <span className="badge badge-blue">
                        {formatDuration(programDetails)}
                      </span>
                    )}
                    {extractFormats(programDetails).map(format => (
                      <span key={format} className="badge badge-gray">
                        {format}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              {programDetails.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Info size={16} />
                    Beschreibung
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {programDetails.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Additional Information */}
              {programDetails.additionalInfo && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Technische Details
                  </h3>
                  <p className="text-sm text-gray-600">
                    {programDetails.additionalInfo}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Eye size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">
                Detaillierte Informationen konnten nicht geladen werden.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="card-footer">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="btn btn-outline"
            >
              Schließen
            </button>
            
            {programDetails && (
              <button
                onClick={onCreateTimer}
                className="btn btn-primary"
              >
                <Play size={16} />
                Timer erstellen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProgramModal;