import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock,
  Tv,
  Play,
  RefreshCw,
  Eye,
  Settings,
  ChevronDown,
  Star,
  Zap
} from 'lucide-react';
import { apiService, formatters } from '../services/api';
import LoadingSpinner, { LoadingCard } from './LoadingSpinner';
import ErrorAlert from './ErrorAlert';
import ProgramModal from './ProgramModal';
import TimerModal from './TimerModal';

function EPGView({ channels, onError }) {
  // State management
  const [epgData, setEpgData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    selectedChannels: [],
    selectedGenres: [],
    selectedDay: 0,
    timeday: 'ganztags',
    showCurrentOnly: false
  });
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerProgram, setTimerProgram] = useState(null);
  const [viewMode, setViewMode] = useState('channel'); // 'channel' or 'list'

  // Get only DVB Viewer compatible channels
  const getAvailableChannels = () => {
    return Object.entries(channels).filter(([id, channel]) => 
      !channel.note || !channel.note.includes('Nicht in DVB Viewer verfügbar')
    ).reduce((acc, [id, channel]) => {
      acc[id] = channel;
      return acc;
    }, {});
  };

  const availableChannels = getAvailableChannels();

  // Load initial EPG data
  useEffect(() => {
    loadEPGData();
  }, [filters.selectedChannels, filters.selectedDay, filters.timeday]);

  // Apply filters when data or filter criteria change
  useEffect(() => {
    applyFilters();
  }, [epgData, filters.search, filters.selectedGenres, filters.showCurrentOnly]);

  /**
   * Load EPG data for selected channels and day
   */
  const loadEPGData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const channelsToLoad = filters.selectedChannels.length > 0 
        ? filters.selectedChannels.filter(id => availableChannels[id])
        : Object.keys(availableChannels).slice(0, 8); // Load first 8 available channels

      console.log(`Loading EPG for ${channelsToLoad.length} channels, day ${filters.selectedDay}`);

      const epgPromises = channelsToLoad.map(async (channelId) => {
        try {
          const response = await apiService.getEPG(channelId, filters.selectedDay, filters.timeday);
          return response.data;
        } catch (err) {
          console.error(`Failed to load EPG for channel ${channelId}:`, err);
          return null;
        }
      });

      const results = await Promise.all(epgPromises);
      const validResults = results.filter(Boolean);
      
      setEpgData(validResults);
      console.log(`✅ Loaded EPG for ${validResults.length} channels`);

    } catch (err) {
      console.error('EPG loading failed:', err);
      setError(err.message);
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Apply current filters to EPG data
   */
const applyFilters = () => {
    let filtered = [...epgData];

    // Apply search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.map(channelData => ({
        ...channelData,
        programs: channelData.programs.filter(program =>
          program.title.toLowerCase().includes(searchTerm) ||
          program.genre.toLowerCase().includes(searchTerm)
        )
      })).filter(channelData => channelData.programs.length > 0);
    }

    // Apply genre filter
    if (filters.selectedGenres.length > 0) {
      filtered = filtered.map(channelData => ({
        ...channelData,
        programs: channelData.programs.filter(program =>
          filters.selectedGenres.some(genre =>
            program.genre.toLowerCase().includes(genre.toLowerCase())
          )
        )
      })).filter(channelData => channelData.programs.length > 0);
    }

    // Apply "current only" filter
    if (filters.showCurrentOnly) {
      filtered = filtered.map(channelData => ({
        ...channelData,
        programs: channelData.programs.filter(program =>
          isProgramCurrent(program, channelData.day)
        )
      })).filter(channelData => channelData.programs.length > 0);
    }

    setFilteredData(filtered);
  };

  /**
   * Handle filter changes
   */
  const handleFilterChange = (newFilters) => {
    setFilters(prev => {
      const updated = { ...prev, ...newFilters };
      
      // Reset showCurrentOnly wenn andere Filter gesetzt werden
      if (newFilters.selectedChannels || newFilters.selectedGenres || newFilters.search) {
        updated.showCurrentOnly = false;
      }
      
      return updated;
    });
  };

  /**
   * Handle program selection for details
   */
  const handleProgramClick = async (program) => {
    setSelectedProgram(program);
    setShowProgramModal(true);
  };

  /**
   * Handle timer creation request
   */
  const handleCreateTimer = (program) => {
    setTimerProgram(program);
    setShowTimerModal(true);
  };

  /**
   * Handle successful timer creation
   */
  const handleTimerCreated = () => {
    setShowTimerModal(false);
    setTimerProgram(null);
  };

  /**
   * Get unique genres from current EPG data
   */
  const getAvailableGenres = () => {
    const genres = new Set();
    epgData.forEach(channelData => {
      channelData.programs.forEach(program => {
        if (program.genre) {
          genres.add(program.genre);
        }
      });
    });
    return Array.from(genres).sort();
  };

  /**
   * Get summary statistics
   */
  const getStats = () => {
    const totalPrograms = filteredData.reduce((sum, channel) => sum + channel.programs.length, 0);
    const totalChannels = filteredData.length;
    const currentPrograms = filteredData.reduce((sum, channel) => {
      return sum + channel.programs.filter(p => isProgramCurrent(p, channel.day)).length;
    }, 0);
    
    return { totalPrograms, totalChannels, currentPrograms };
  };

  /**
   * Check if program is currently running
   */
  const isProgramCurrent = (program, day) => {
    if (day !== 0) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [hours, minutes] = program.time.split(':').map(Number);
    const programTime = hours * 60 + minutes;
    
    return Math.abs(currentTime - programTime) < 180 && currentTime >= programTime;
  };

  /**
   * Quick filter presets
   */
const applyQuickFilter = (preset) => {
    switch (preset) {
      case 'main':
        const mainChannels = Object.entries(availableChannels)
          .filter(([_, channel]) => 
            channel.category === 'öffentlich-rechtlich' || 
            channel.category === 'privat'
          )
          .map(([id]) => id)
          .slice(0, 8);
        handleFilterChange({ 
          selectedChannels: mainChannels,
          selectedDay: 0,
          selectedGenres: [],
          search: ''
        });
        break;
      case 'news':
        const newsChannels = Object.entries(availableChannels)
          .filter(([_, channel]) => 
            channel.category === 'nachrichten'
          )
          .map(([id]) => id);
        handleFilterChange({ 
          selectedChannels: newsChannels,
          selectedDay: 0,
          selectedGenres: [],
          search: ''
        });
        break;
      case 'current':
        // Filter für aktuell laufende Sendungen
        handleFilterChange({ 
          selectedDay: 0, // Nur heute
          selectedGenres: [],
          search: '',
          showCurrentOnly: true
        });
        break;
      case 'movie':
        handleFilterChange({ 
          selectedGenres: ['Spielfilm', 'Film', 'Filmkomödie', 'Thriller'],
          selectedDay: 0,
          search: ''
        });
        break;
      default:
        break;
    }
  };


  /**
   * Render program card
   */
  const ProgramCard = ({ program, channelData, compact = false }) => {
    const isCurrent = isProgramCurrent(program, channelData.day);
    const channel = availableChannels[program.channelId];
    
    return (
      <div 
        className={`epg-program group ${isCurrent ? 'current' : ''} ${compact ? 'compact' : ''}`}
        onClick={() => handleProgramClick(program)}
      >
        {/* Current indicator */}
        {isCurrent && (
          <div className="absolute top-3 right-3">
            <span className="badge badge-green text-xs flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              LIVE
            </span>
          </div>
        )}

        {/* Time and Channel */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`epg-time ${isCurrent ? 'text-green-600' : ''}`}>
              {program.time}
            </span>
            {program.endTime && (
              <span className="text-xs text-gray-500">
                - {program.endTime}
              </span>
            )}
          </div>
          
          {compact && channel && (
            <span className="text-xs text-gray-500 truncate max-w-20">
              {channel.name.replace(' HD', '')}
            </span>
          )}
        </div>

        {/* Title */}
        <h4 className="epg-title">
          {formatters.truncateText(program.title, compact ? 40 : 60)}
        </h4>

        {/* Genre and Actions */}
        <div className="flex items-center justify-between mt-3">
          <span className={`badge ${formatters.getGenreBadgeColor(program.genre) === 'blue' ? 'badge-blue' : 
                          formatters.getGenreBadgeColor(program.genre) === 'green' ? 'badge-green' :
                          formatters.getGenreBadgeColor(program.genre) === 'yellow' ? 'badge-yellow' :
                          formatters.getGenreBadgeColor(program.genre) === 'red' ? 'badge-red' : 'badge-gray'}`}>
            {program.genre}
          </span>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleProgramClick(program);
              }}
              className="btn btn-outline btn-sm"
              title="Details"
            >
              <Eye size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCreateTimer(program);
              }}
              className="btn btn-primary btn-sm"
              title="Aufnahme"
            >
              <Play size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render channel section
   */
  const ChannelSection = ({ channelData }) => {
    const channel = availableChannels[channelData.channelId];
    const channelName = channelData.channelName || channel?.name || `Channel ${channelData.channelId}`;
    
    return (
      <div className="channel-section">
        <div className="channel-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tv size={24} />
              <div>
                <h3 className="text-xl font-bold">
                  {channelName}
                </h3>
                <p className="text-blue-100 opacity-90">
                  {channelData.programs.length} Sendungen • {formatters.getDayName(channelData.day)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {channel?.category && (
                <span className={`badge bg-white/20 text-white border border-white/30`}>
                  {channel.category}
                </span>
              )}
              <button
                onClick={() => applyQuickFilter('main')}
                className="btn btn-outline text-white border-white/30 btn-sm"
                title="Alle Programme anzeigen"
              >
                <Star size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="channel-programs">
          {channelData.programs.length > 0 ? (
            <div className="epg-grid">
              {channelData.programs.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  channelData={channelData}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">
                Keine Sendungen für die ausgewählten Filter gefunden.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number text-blue-600">{stats.totalChannels}</div>
          <div className="stat-label">Aktive Sender</div>
        </div>
        <div className="stat-card">
          <div className="stat-number text-green-600">{stats.totalPrograms}</div>
          <div className="stat-label">Sendungen gesamt</div>
        </div>
        <div className="stat-card">
          <div className="stat-number text-purple-600">{stats.currentPrograms}</div>
          <div className="stat-label">Läuft jetzt</div>
        </div>
        <div className="stat-card">
          <div className="stat-number text-yellow-600">{Object.keys(availableChannels).length}</div>
          <div className="stat-label">DVB Sender</div>
        </div>
      </div>

      {/* Main Header */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Tv size={32} className="text-blue-600" />
                TV-Programm
              </h1>
              <p className="text-gray-600 mt-1">
                {formatters.getDateForDay(filters.selectedDay)} • {filters.timeday === 'ganztags' ? 'Ganztags' : filters.timeday}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Quick Filters */}
             <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => applyQuickFilter('main')}
                  className="btn btn-outline btn-sm"
                  title="Öffentlich-rechtliche Hauptsender"
                >
                  <Star size={14} />
                  <span className="text-xs">Hauptsender</span>
                </button>
                <button
                  onClick={() => applyQuickFilter('news')}
                  className="btn btn-outline btn-sm"
                  title="Nachrichtensender"
                >
                  <Zap size={14} />
                  <span className="text-xs">Nachrichten</span>
                </button>
                <button
                  onClick={() => applyQuickFilter('current')}
                  className="btn btn-outline btn-sm"
                  title="Aktuell laufende Sendungen"
                >
                  <Clock size={14} />
                  <span className="text-xs">Läuft jetzt</span>
                </button>
                <button
                  onClick={() => applyQuickFilter('movie')}
                  className="btn btn-outline btn-sm"
                  title="Filme und Spielfilme"
                >
                  <Play size={14} />
                  <span className="text-xs">Filme</span>
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`btn btn-outline ${showFilters ? 'bg-blue-50 border-blue-200' : ''}`}
                >
                  <Filter size={16} />
                  <span className="hidden sm:inline">Filter</span>
                  <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>

                <button
                  onClick={loadEPGData}
                  disabled={isLoading}
                  className="btn btn-primary"
                >
                  <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">Aktualisieren</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card">
        <div className="card-body">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  className="form-input pl-10"
                  placeholder="Sendung suchen... (z.B. Tatort, Nachrichten, Spielfilm)"
                  value={filters.search}
                  onChange={(e) => handleFilterChange({ search: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                className="form-select min-w-32"
                value={filters.selectedDay}
                onChange={(e) => handleFilterChange({ selectedDay: parseInt(e.target.value) })}
              >
                {[0,1,2,3,4,5,6,7].map(day => (
                  <option key={day} value={day}>
                    {formatters.getDayName(day)}
                  </option>
                ))}
              </select>

              <select
                className="form-select min-w-32"
                value={filters.timeday}
                onChange={(e) => handleFilterChange({ timeday: e.target.value })}
              >
                <option value="ganztags">Ganztags</option>
                <option value="morgens">Morgens</option>
                <option value="mittags">Mittags</option>
                <option value="nachmittags">Nachmittags</option>
                <option value="abends">Abends</option>
                <option value="spät">Spätnacht</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Extended Filters */}
      {showFilters && (
        <div className="filter-panel">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings size={20} />
            Erweiterte Filter
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Channel Selection */}
            <div>
              <label className="form-label mb-3">
                Sender auswählen ({filters.selectedChannels.length} von {Object.keys(availableChannels).length})
              </label>
              
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                {Object.entries(availableChannels).map(([channelId, channel]) => {
                  const isSelected = filters.selectedChannels.includes(channelId);
                  
                  return (
                    <label
                      key={channelId}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-300 text-blue-700' 
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="form-checkbox"
                        checked={isSelected}
                        onChange={() => {
                          const newChannels = isSelected
                            ? filters.selectedChannels.filter(id => id !== channelId)
                            : [...filters.selectedChannels, channelId];
                          handleFilterChange({ selectedChannels: newChannels });
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block">
                          {channel.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {channel.category}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Genre Selection */}
            <div>
              <label className="form-label mb-3">
                Genres ({filters.selectedGenres.length} ausgewählt)
              </label>
              
              <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                {getAvailableGenres().map(genre => {
                  const isSelected = filters.selectedGenres.includes(genre);
                  
                  return (
                    <button
                      key={genre}
                      onClick={() => {
                        const newGenres = isSelected
                          ? filters.selectedGenres.filter(g => g !== genre)
                          : [...filters.selectedGenres, genre];
                        handleFilterChange({ selectedGenres: newGenres });
                      }}
                      className={`badge text-sm cursor-pointer transition-all ${
                        isSelected ? 'badge-blue' : 'badge-gray hover:badge-blue'
                      }`}
                    >
                      {genre}
                      {isSelected && ' ✓'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => handleFilterChange({
                search: '',
                selectedChannels: [],
                selectedGenres: [],
                selectedDay: 0,
                timeday: 'ganztags'
              })}
              className="btn btn-outline"
            >
              Zurücksetzen
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="btn btn-primary"
            >
              Filter anwenden
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <ErrorAlert
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="epg-grid">
          {[...Array(6)].map((_, index) => (
            <LoadingCard key={index} text="Lade EPG..." />
          ))}
        </div>
      ) : filteredData.length > 0 ? (
        <div className="space-y-8">
          {filteredData.map((channelData) => (
            <ChannelSection
              key={`${channelData.channelId}-${channelData.day}`}
              channelData={channelData}
            />
          ))}
        </div>
      ) : epgData.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <Tv size={64} className="mx-auto text-gray-400 mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Keine EPG-Daten verfügbar
            </h3>
            <p className="text-gray-600 mb-6">
              Wählen Sie Sender aus oder laden Sie die Daten neu.
            </p>
            <button
              onClick={loadEPGData}
              className="btn btn-primary"
            >
              <RefreshCw size={16} />
              EPG laden
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body text-center py-12">
            <Search size={64} className="mx-auto text-gray-400 mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Keine Sendungen gefunden
            </h3>
            <p className="text-gray-600 mb-6">
              Versuchen Sie andere Suchbegriffe oder Filter.
            </p>
            <button
              onClick={() => handleFilterChange({ search: '', selectedGenres: [] })}
              className="btn btn-outline"
            >
              Filter zurücksetzen
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
    {showProgramModal && selectedProgram && (
            <ProgramModal
            program={selectedProgram}
            channels={availableChannels}
            onClose={() => setShowProgramModal(false)}
            onCreateTimer={(program) => {
                setShowProgramModal(false);
                handleCreateTimer(program);
            }}
            />
        )}

      {showTimerModal && timerProgram && (
        <TimerModal
          program={timerProgram}
          channels={availableChannels}
          onClose={() => setShowTimerModal(false)}
          onSuccess={handleTimerCreated}
          onError={onError}
        />
      )}
    </div>
  );
}

export default EPGView;