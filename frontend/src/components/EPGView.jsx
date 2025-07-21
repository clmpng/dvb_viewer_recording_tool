import React, { useState, useEffect, useRef } from 'react';
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
  const [currentTime, setCurrentTime] = useState(new Date());
  
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

  // Refs for scrolling
  const laneRefs = useRef([]);

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

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Load initial EPG data
  useEffect(() => {
    loadEPGData();
  }, [filters.selectedChannels, filters.selectedDay, filters.timeday]);

  // Apply filters when data or filter criteria change
  useEffect(() => {
    applyFilters();
  }, [epgData, filters.search, filters.selectedGenres, filters.showCurrentOnly]);

  // Scroll to current time when data loads
  useEffect(() => {
    if (filteredData.length > 0 && filters.selectedDay === 0) {
      scrollToCurrentTime();
    }
  }, [filteredData]);

  /**
   * Load EPG data for selected channels and day
   */
  const loadEPGData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const channelsToLoad = filters.selectedChannels.length > 0 
        ? filters.selectedChannels.filter(id => availableChannels[id])
        : Object.keys(availableChannels); // Load ALL available channels

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
      
      // Reset showCurrentOnly when other filters are set
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
    
    return Math.abs(currentTime - programTime) < 90 && currentTime >= programTime;
  };

  /**
   * Scroll lane to current time
   */
  const scrollToCurrentTime = () => {
    if (filters.selectedDay !== 0) return;

    const now = new Date();
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

    laneRefs.current.forEach((laneRef, index) => {
      if (!laneRef) return;

      const channelData = filteredData[index];
      if (!channelData) return;

      // Find the program closest to current time
      let closestIndex = 0;
      let closestDiff = Infinity;

      channelData.programs.forEach((program, progIndex) => {
        const [hours, minutes] = program.time.split(':').map(Number);
        const programTime = hours * 60 + minutes;
        const diff = Math.abs(currentTimeMinutes - programTime);

        if (diff < closestDiff) {
          closestDiff = diff;
          closestIndex = progIndex;
        }
      });

      // Scroll to the closest program
      const programCard = laneRef.children[closestIndex];
      if (programCard) {
        laneRef.scrollLeft = Math.max(0, programCard.offsetLeft - laneRef.offsetWidth / 3);
      }
    });
  };

  /**
   * Quick filter presets
   */
  const applyQuickFilter = (preset) => {
    switch (preset) {
      case 'main':
        // Alle öffentlich-rechtlichen und Nachrichten-Sender (die hauptsächlich verfügbaren)
        const mainChannels = Object.entries(availableChannels)
          .filter(([_, channel]) => 
            channel.category === 'öffentlich-rechtlich' || 
            channel.category === 'nachrichten'
          )
          .map(([id]) => id);
        handleFilterChange({ 
          selectedChannels: mainChannels,
          selectedDay: 0,
          selectedGenres: [],
          search: ''
        });
        break;
      case 'current':
        handleFilterChange({ 
          selectedDay: 0,
          selectedGenres: [],
          search: '',
          showCurrentOnly: true
        });
        break;
      case 'all':
        // Alle verfügbaren Sender
        handleFilterChange({ 
          selectedChannels: [],
          selectedDay: 0,
          selectedGenres: [],
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
  const ProgramCard = ({ program, channelData }) => {
    const isCurrent = isProgramCurrent(program, channelData.day);
    const channel = availableChannels[program.channelId];
    
    return (
      <div 
        className={`epg-program-card ${isCurrent ? 'current' : ''}`}
        onClick={() => handleProgramClick(program)}
      >
        {/* Time */}
        <div className={`epg-program-time ${isCurrent ? 'current' : ''}`}>
          {program.time}
          {program.endTime && (
            <span className="text-gray-500 text-xs ml-1">
              - {program.endTime}
            </span>
          )}
        </div>
        
        {/* Title */}
        <h4 className="epg-program-title">
          {formatters.truncateText(program.title, 50)}
        </h4>

        {/* Genre */}
        <div className="epg-program-genre">
          {program.genre}
        </div>

        {/* Actions */}
        <div className="epg-program-actions">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleProgramClick(program);
            }}
            className="btn btn-outline btn-sm"
            title="Details"
          >
            <Eye size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCreateTimer(program);
            }}
            className="btn btn-primary btn-sm"
            title="Aufnahme"
          >
            <Play size={12} />
          </button>
        </div>
      </div>
    );
  };

  /**
   * Render channel lane
   */
  const ChannelLane = ({ channelData, index }) => {
    const channel = availableChannels[channelData.channelId];
    const channelName = channelData.channelName || channel?.name || `Channel ${channelData.channelId}`;
    
    return (
      <div className="epg-lane">
        {/* Channel Info */}
        <div className="epg-lane-channel">
          <div className="epg-lane-channel-name">
            {channelName.replace(' HD', '')}
          </div>
          {channel?.category && (
            <div className="epg-lane-channel-category">
              {channel.category}
            </div>
          )}
        </div>

        {/* Programs */}
        <div 
          className="epg-lane-programs"
          ref={el => laneRefs.current[index] = el}
        >
          {channelData.programs.map((program, progIndex) => (
            <ProgramCard
              key={`${program.id}-${progIndex}`}
              program={program}
              channelData={channelData}
            />
          ))}
        </div>
      </div>
    );
  };

  const stats = getStats();

  if (isLoading && epgData.length === 0) {
    return <LoadingSpinner message="EPG wird geladen..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.totalChannels}</div>
          <div className="stat-label">Sender</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.totalPrograms}</div>
          <div className="stat-label">Programme</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.currentPrograms}</div>
          <div className="stat-label">Aktuell</div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="filter-panel">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Filter & Schnellauswahl</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-outline btn-sm"
          >
            <Filter size={16} />
            Filter
            <ChevronDown size={16} className={showFilters ? 'rotate-180' : ''} />
          </button>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => applyQuickFilter('all')}
            className="btn btn-outline btn-sm"
          >
            <Tv size={14} />
            Alle Sender
          </button>
          <button
            onClick={() => applyQuickFilter('main')}
            className="btn btn-outline btn-sm"
          >
            <Star size={14} />
            Öff.-Recht. + News
          </button>
          <button
            onClick={() => applyQuickFilter('current')}
            className="btn btn-outline btn-sm"
          >
            <Zap size={14} />
            Läuft jetzt
          </button>
          <button
            onClick={() => handleFilterChange({ selectedDay: 0, search: '', selectedGenres: [], selectedChannels: [] })}
            className="btn btn-outline btn-sm"
          >
            <RefreshCw size={14} />
            Zurücksetzen
          </button>
        </div>

        {/* Detailed Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Suche</label>
              <input
                type="text"
                className="form-input"
                placeholder="Titel oder Genre..."
                value={filters.search}
                onChange={(e) => handleFilterChange({ search: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Tag</label>
              <select
                className="form-select"
                value={filters.selectedDay}
                onChange={(e) => handleFilterChange({ selectedDay: parseInt(e.target.value) })}
              >
                <option value={0}>Heute</option>
                <option value={1}>Morgen</option>
                <option value={2}>Übermorgen</option>
              </select>
            </div>
            <div>
              <label className="form-label">Tageszeit</label>
              <select
                className="form-select"
                value={filters.timeday}
                onChange={(e) => handleFilterChange({ timeday: e.target.value })}
              >
                <option value="ganztags">Ganztags</option>
                <option value="vormittag">Vormittag</option>
                <option value="nachmittag">Nachmittag</option>
                <option value="abend">Abend</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* EPG Lanes */}
      {error && <ErrorAlert message={error} onClose={() => setError(null)} />}
      
      <div className="epg-container">
        {/* Time Header */}
        <div className="epg-time-header">
          <div className="epg-current-time">
            <Clock size={16} />
            {filters.selectedDay === 0 ? 
              `Aktuelle Zeit: ${formatters.formatTime(currentTime)}` :
              `${formatters.getDayName(filters.selectedDay)} • ${filters.timeday}`
            }
          </div>
          <button
            onClick={scrollToCurrentTime}
            className="btn btn-outline btn-sm"
            disabled={filters.selectedDay !== 0}
          >
            Jetzt anzeigen
          </button>
        </div>

        {/* Lanes */}
        <div className="epg-lanes">
          {filteredData.length > 0 ? (
            filteredData.map((channelData, index) => (
              <ChannelLane
                key={`${channelData.channelId}-${channelData.day}`}
                channelData={channelData}
                index={index}
              />
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              {isLoading ? (
                <LoadingCard />
              ) : (
                <div>
                  <Tv size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Keine Programme gefunden.</p>
                  <p className="text-sm mt-2">
                    Überprüfen Sie Ihre Filter oder versuchen Sie es mit anderen Suchkriterien.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showProgramModal && selectedProgram && (
        <ProgramModal
          program={selectedProgram}
          onClose={() => {
            setShowProgramModal(false);
            setSelectedProgram(null);
          }}
          onCreateTimer={(program) => {
            setShowProgramModal(false);
            setSelectedProgram(null);
            handleCreateTimer(program);
          }}
        />
      )}

      {showTimerModal && timerProgram && (
        <TimerModal
          program={timerProgram}
          onClose={() => {
            setShowTimerModal(false);
            setTimerProgram(null);
          }}
          onSuccess={handleTimerCreated}
        />
      )}
    </div>
  );
}

export default EPGView;