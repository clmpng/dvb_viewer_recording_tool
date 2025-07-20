import React, { useEffect } from 'react';
import { 
  X, 
  Clock, 
  Calendar,
  Tv,
  Play,
  Info,
  Eye
} from 'lucide-react';
import { formatters } from '../services/api';

function ProgramModal({ 
  program, 
  channels,
  onClose, 
  onCreateTimer 
}) {

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
  const formatDuration = (program) => {
    if (program.time && program.endTime) {
      const [startHours, startMinutes] = program.time.split(':').map(Number);
      const [endHours, endMinutes] = program.endTime.split(':').map(Number);
      
      const startTotalMinutes = startHours * 60 + startMinutes;
      let endTotalMinutes = endHours * 60 + endMinutes;
      
      // Handle programs that end next day
      if (endTotalMinutes < startTotalMinutes) {
        endTotalMinutes += 24 * 60;
      }
      
      const durationMinutes = endTotalMinutes - startTotalMinutes;
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      
      return hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')} h` : `${minutes} min`;
    }
    return null;
  };

  if (!program) return null;

  const channel = channels?.[program.channelId];
  const duration = formatDuration(program);

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
                {duration && (
                  <span className="text-sm text-gray-500">
                    ({duration})
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
                
                {channel && (
                  <span className="badge badge-gray">
                    <Tv size={12} className="mr-1" />
                    {channel.displayName || channel.name}
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
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  <Clock size={16} className="inline mr-2" />
                  Sendetermin
                </h3>
                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                  <div className="font-medium">
                    {formatters.getDayName(program.day)}
                    {program.day > 0 && ` (${formatters.getDateForDay(program.day)})`}
                  </div>
                  <div className="text-gray-600">
                    {program.time} - {program.endTime || 'Ende unbekannt'} Uhr
                  </div>
                  {duration && (
                    <div className="text-gray-600">
                      Dauer: {duration}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  <Tv size={16} className="inline mr-2" />
                  Sender & Kategorie
                </h3>
                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                  <div className="font-medium">
                    {channel?.displayName || channel?.name || `Channel ${program.channelId}`}
                  </div>
                  {channel?.category && (
                    <div className="text-gray-600">
                      Kategorie: {channel.category}
                    </div>
                  )}
                  <div className="flex gap-1 mt-2">
                    <span className={`badge ${getGenreBadgeClass(program.genre)} text-xs`}>
                      {program.genre}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Program Description */}
            {program.description ? (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Info size={16} />
                  Beschreibung
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {program.description}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Info size={16} />
                  Programmhinweise
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 italic">
                    Für diese Sendung sind leider keine weiteren Details verfügbar.
                  </p>
                  <div className="mt-3 text-xs text-gray-500">
                    <div><strong>Titel:</strong> {program.title}</div>
                    <div><strong>Genre:</strong> {program.genre}</div>
                    <div><strong>Uhrzeit:</strong> {program.time} - {program.endTime || 'unbekannt'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Technical Information */}
            {channel && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Technische Details
                </h3>
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                  <div><strong>Channel ID:</strong> {program.channelId}</div>
                  <div><strong>Program ID:</strong> {program.id}</div>
                  {channel.frequency && (
                    <div><strong>Frequenz:</strong> {channel.frequency}</div>
                  )}
                  <div><strong>DVB Viewer:</strong> {channel.note?.includes('Nicht in DVB Viewer verfügbar') ? 'Nicht verfügbar' : 'Verfügbar'}</div>
                </div>
              </div>
            )}
          </div>
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
            
            <button
              onClick={() => onCreateTimer(program)}
              className="btn btn-primary"
            >
              <Play size={16} />
              Timer erstellen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProgramModal;