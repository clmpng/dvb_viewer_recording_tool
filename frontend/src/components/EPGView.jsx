import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock,
  Tv,
  Play,
  RefreshCw,
  Eye
} from 'lucide-react';
import { apiService, formatters } from '../services/api';
import LoadingSpinner, { LoadingCard } from './LoadingSpinner';
import ErrorAlert from './ErrorAlert';
import EPGFilter from './EPGFilter';
import EPGProgramList from './EPGProgramList';
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
    timeday: 'ganztags'
  });
  
  // UI state
  const [showFilters, setShowFilters] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerProgram, setTimerProgram] = useState(null);

  // Load initial EPG data
  useEffect(() => {
    loadEPGData();
  }, [filters.selectedChannels, filters.selectedDay, filters.timeday]);

  // Apply filters when data or filter criteria change
  useEffect(() => {
    applyFilters();
  }, [epgData, filters.search, filters.selectedGenres]);

  /**
   * Load EPG data for selected channels and day
   */
  const loadEPGData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const channelsToLoad = filters.selectedChannels.length > 0 
        ? filters.selectedChannels 
        : Object.keys(channels).slice(0, 6); // Load first 6 channels by default

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

    setFilteredData(filtered);
  };

  /**
   * Handle filter changes
   */
  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
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
    // Could show success message here
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
    return { totalPrograms, totalChannels };
  };

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tv size={24} />
            TV-Programm & Aufnahmen
          </h1>
          <p className="text-gray-600 mt-1">
            {formatters.getDateForDay(filters.selectedDay)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats */}
          <div className="text-sm text-gray-600">
            {stats.totalChannels} Sender • {stats.totalPrograms} Sendungen
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-outline ${showFilters ? 'bg-blue-50 border-blue-200' : ''}`}
          >
            <Filter size={16} />
            Filter
          </button>

          {/* Refresh */}
          <button
            onClick={loadEPGData}
            disabled={isLoading}
            className="btn btn-primary"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Aktualisieren
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <ErrorAlert
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Filter Panel */}
      {showFilters && (
        <EPGFilter
          filters={filters}
          channels={channels}
          availableGenres={getAvailableGenres()}
          onFilterChange={handleFilterChange}
          isLoading={isLoading}
        />
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <LoadingCard key={index} text="Lade EPG..." />
          ))}
        </div>
      ) : filteredData.length > 0 ? (
        <EPGProgramList
          epgData={filteredData}
          channels={channels}
          onProgramClick={handleProgramClick}
          onCreateTimer={handleCreateTimer}
        />
      ) : epgData.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <Tv size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Keine EPG-Daten verfügbar
            </h3>
            <p className="text-gray-600 mb-4">
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
            <Search size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Keine Sendungen gefunden
            </h3>
            <p className="text-gray-600 mb-4">
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
          onClose={() => setShowProgramModal(false)}
          onCreateTimer={() => {
            setShowProgramModal(false);
            handleCreateTimer(selectedProgram);
          }}
        />
      )}

      {showTimerModal && timerProgram && (
        <TimerModal
          program={timerProgram}
          channels={channels}
          onClose={() => setShowTimerModal(false)}
          onSuccess={handleTimerCreated}
          onError={onError}
        />
      )}
    </div>
  );
}

export default EPGView;