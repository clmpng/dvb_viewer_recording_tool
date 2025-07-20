import React, { useEffect, useState } from 'react';
import { 
  X, 
  Clock, 
  Calendar,
  Tv,
  Play,
  Info,
  Eye,
  Loader
} from 'lucide-react';
import { formatters, apiService } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

function ProgramModal({ 
  program, 
  channels,
  onClose, 
  onCreateTimer 
}) {
  // State für Details-Loading
  const [programDetails, setProgramDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

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
   * Load program details when modal opens
   */
  useEffect(() => {
    if (program?.id) {
      loadProgramDetails();
    }
  }, [program?.id]);

  /**
   * Load detailed program information
   */
  const loadProgramDetails = async () => {
    if (!program?.id) return;

    setIsLoadingDetails(true);
    setDetailsError(null);
    setProgramDetails(null);

    try {
      console.log(`🔍 Loading details for program ${program.id}...`);
      const response = await apiService.getProgramDetails(program.id);
      
      if (response.success && response.data) {
        setProgramDetails(response.data);
        console.log(`✅ Loaded details for "${program.title}"`);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error(`❌ Failed to load details for program ${program.id}:`, error);
      setDetailsError(`Details konnten nicht geladen werden: ${error.message}`);
    } finally {
      setIsLoadingDetails(false);
    }
  };

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

            {/* Program Description - Enhanced with Details Loading */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Info size={16} />
                Programmdetails
                {isLoadingDetails && <Loader size={14} className="animate-spin" />}
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-4">
                {isLoadingDetails ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="text-center">
                      <LoadingSpinner size="sm" />
                      <p className="text-sm text-gray-600 mt-2">
                        Lade Programmdetails...
                      </p>
                    </div>
                  </div>
                ) : detailsError ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-red-600 mb-3">
                      {detailsError}
                    </p>
                    <button
                      onClick={loadProgramDetails}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      Erneut versuchen
                    </button>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600 italic">
                        Basis-Informationen:
                      </p>
                      <div className="mt-2 text-xs text-gray-500 space-y-1">
                        <div><strong>Titel:</strong> {program.title}</div>
                        <div><strong>Genre:</strong> {program.genre}</div>
                        <div><strong>Uhrzeit:</strong> {program.time} - {program.endTime || 'unbekannt'}</div>
                      </div>
                    </div>
                  </div>
                ) : programDetails?.description ? (
                  <div>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">
                      {programDetails.description}
                    </p>
                    
                    {programDetails.additionalInfo && (
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-600 font-medium mb-1">
                          Weitere Informationen:
                        </p>
                        <p className="text-xs text-gray-500">
                          {programDetails.additionalInfo}
                        </p>
                      </div>
                    )}
                    
                    {programDetails.date && programDetails.time && (
                      <div className="pt-3 border-t border-gray-200 mt-3">
                        <p className="text-xs text-gray-600">
                          <strong>Originalsendezeit:</strong> {programDetails.date} um {programDetails.time} Uhr
                          {programDetails.channel && ` auf ${programDetails.channel}`}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 italic mb-3">
                      Für diese Sendung sind keine weiteren Details verfügbar.
                    </p>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div><strong>Titel:</strong> {program.title}</div>
                      <div><strong>Genre:</strong> {program.genre}</div>
                      <div><strong>Uhrzeit:</strong> {program.time} - {program.endTime || 'unbekannt'}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

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
                  {program.detailUrl && (
                    <div className="pt-2 border-t border-gray-200">
                      <strong>Quelle:</strong> 
                      <a 
                        href={program.detailUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline ml-1"
                      >
                        Hörzu Details ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="card-footer">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              {isLoadingDetails ? 'Lade Details...' : 
               programDetails ? 'Details geladen' : 
               detailsError ? 'Details nicht verfügbar' : 'Basis-Informationen'}
            </div>
            
            <div className="flex gap-3">
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
    </div>
  );
}

export default ProgramModal;