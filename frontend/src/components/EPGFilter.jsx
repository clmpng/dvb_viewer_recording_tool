import React from 'react';
import { 
  Search, 
  Calendar, 
  Clock, 
  Tv,
  X
} from 'lucide-react';
import { formatters } from '../services/api';

function EPGFilter({ 
  filters, 
  channels, 
  availableGenres, 
  onFilterChange, 
  isLoading 
}) {
  
  // Day options for selector
  const dayOptions = [
    { value: 0, label: 'Heute' },
    { value: 1, label: 'Morgen' },
    { value: 2, label: 'Übermorgen' },
    { value: 3, label: 'in 3 Tagen' },
    { value: 4, label: 'in 4 Tagen' },
    { value: 5, label: 'in 5 Tagen' },
    { value: 6, label: 'in 6 Tagen' },
    { value: 7, label: 'in 7 Tagen' }
  ];

  // Time of day options
  const timedayOptions = [
    { value: 'ganztags', label: 'Ganztags' },
    { value: 'morgens', label: 'Morgens (6-12 Uhr)' },
    { value: 'mittags', label: 'Mittags (12-14 Uhr)' },
    { value: 'nachmittags', label: 'Nachmittags (14-18 Uhr)' },
    { value: 'abends', label: 'Abends (18-23 Uhr)' },
    { value: 'spät', label: 'Spät (23-6 Uhr)' }
  ];

  // Handle input changes
  const handleSearchChange = (e) => {
    onFilterChange({ search: e.target.value });
  };

  const handleChannelToggle = (channelId) => {
    const isSelected = filters.selectedChannels.includes(channelId);
    const newChannels = isSelected
      ? filters.selectedChannels.filter(id => id !== channelId)
      : [...filters.selectedChannels, channelId];
    
    onFilterChange({ selectedChannels: newChannels });
  };

  const handleGenreToggle = (genre) => {
    const isSelected = filters.selectedGenres.includes(genre);
    const newGenres = isSelected
      ? filters.selectedGenres.filter(g => g !== genre)
      : [...filters.selectedGenres, genre];
    
    onFilterChange({ selectedGenres: newGenres });
  };

  const handleDayChange = (e) => {
    onFilterChange({ selectedDay: parseInt(e.target.value) });
  };

  const handleTimedayChange = (e) => {
    onFilterChange({ timeday: e.target.value });
  };

  // Clear all filters
  const clearFilters = () => {
    onFilterChange({
      search: '',
      selectedChannels: [],
      selectedGenres: [],
      selectedDay: 0,
      timeday: 'ganztags'
    });
  };

  // Select all main channels
  const selectMainChannels = () => {
    const mainChannels = Object.entries(channels)
      .filter(([_, channel]) => 
        channel.category === 'öffentlich-rechtlich' || 
        channel.category === 'privat'
      )
      .map(([id]) => id)
      .slice(0, 8); // First 8 main channels
    
    onFilterChange({ selectedChannels: mainChannels });
  };

  return (
    <div className="filter-panel">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Search size={20} />
          Filter & Suche
        </h3>
        <div className="flex gap-2">
          <button
            onClick={selectMainChannels}
            className="btn btn-outline btn-sm"
            disabled={isLoading}
          >
            Hauptsender
          </button>
          <button
            onClick={clearFilters}
            className="btn btn-outline btn-sm"
            disabled={isLoading}
          >
            <X size={16} />
            Zurücksetzen
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* Search */}
        <div className="space-y-3">
          <label className="form-label">
            <Search size={16} className="inline mr-2" />
            Suche in Titel/Genre
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="z.B. Tatort, Nachrichten, Spielfilm..."
            value={filters.search}
            onChange={handleSearchChange}
            disabled={isLoading}
          />
          {filters.search && (
            <p className="text-sm text-gray-600">
              Suche nach: "<strong>{filters.search}</strong>"
            </p>
          )}
        </div>

        {/* Day Selection */}
        <div className="space-y-3">
          <label className="form-label">
            <Calendar size={16} className="inline mr-2" />
            Tag
          </label>
          <select
            className="form-select"
            value={filters.selectedDay}
            onChange={handleDayChange}
            disabled={isLoading}
          >
            {dayOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
                {option.value > 0 && ` (${formatters.getDateForDay(option.value).split(',')[1]})`}
              </option>
            ))}
          </select>
        </div>

        {/* Time of Day */}
        <div className="space-y-3">
          <label className="form-label">
            <Clock size={16} className="inline mr-2" />
            Tageszeit
          </label>
          <select
            className="form-select"
            value={filters.timeday}
            onChange={handleTimedayChange}
            disabled={isLoading}
          >
            {timedayOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Active Filters Summary */}
        <div className="space-y-3">
          <label className="form-label">Aktive Filter</label>
          <div className="space-y-2">
            <div className="text-sm">
              <strong>Sender:</strong> {filters.selectedChannels.length === 0 
                ? 'Automatisch' 
                : `${filters.selectedChannels.length} ausgewählt`}
            </div>
            <div className="text-sm">
              <strong>Genres:</strong> {filters.selectedGenres.length === 0 
                ? 'Alle' 
                : `${filters.selectedGenres.length} ausgewählt`}
            </div>
            <div className="text-sm">
              <strong>Tag:</strong> {dayOptions.find(d => d.value === filters.selectedDay)?.label}
            </div>
          </div>
        </div>
      </div>

      {/* Channel Selection */}
      <div className="mt-6">
        <label className="form-label mb-3">
          <Tv size={16} className="inline mr-2" />
          Sender auswählen ({filters.selectedChannels.length} von {Object.keys(channels).length})
        </label>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          {Object.entries(channels).map(([channelId, channel]) => {
            const isSelected = filters.selectedChannels.includes(channelId);
            
            return (
              <label
                key={channelId}
                className={`
                  flex items-center gap-2 p-2 rounded border cursor-pointer transition-all
                  ${isSelected 
                    ? 'bg-blue-50 border-blue-300 text-blue-700' 
                    : 'bg-white border-gray-200 hover:border-gray-300'
                  }
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={isSelected}
                  onChange={() => handleChannelToggle(channelId)}
                  disabled={isLoading}
                />
                <span className="text-sm font-medium truncate" title={channel.name}>
                  {channel.name}
                </span>
                <span className={`
                  badge badge-gray text-xs ml-auto
                  ${channel.category === 'öffentlich-rechtlich' ? 'badge-blue' : ''}
                  ${channel.category === 'privat' ? 'badge-green' : ''}
                `}>
                  {channel.category === 'öffentlich-rechtlich' ? 'ÖR' : 
                   channel.category === 'privat' ? 'TV' :
                   channel.category === 'nachrichten' ? 'News' :
                   channel.category === 'sport' ? 'Sport' : 'Sonstiges'}
                </span>
              </label>
            );
          })}
        </div>

        {filters.selectedChannels.length === 0 && (
          <p className="text-sm text-gray-600 mt-2">
            💡 Kein Sender ausgewählt - es werden automatisch die ersten Sender geladen
          </p>
        )}
      </div>

      {/* Genre Selection */}
      {availableGenres.length > 0 && (
        <div className="mt-6">
          <label className="form-label mb-3">
            Genres filtern ({filters.selectedGenres.length} von {availableGenres.length})
          </label>
          
          <div className="flex flex-wrap gap-2">
            {availableGenres.map(genre => {
              const isSelected = filters.selectedGenres.includes(genre);
              
              return (
                <button
                  key={genre}
                  onClick={() => handleGenreToggle(genre)}
                  disabled={isLoading}
                  className={`
                    badge text-sm cursor-pointer transition-all
                    ${isSelected 
                      ? 'badge-blue' 
                      : 'badge-gray hover:badge-blue'
                    }
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {genre}
                  {isSelected && ' ✓'}
                </button>
              );
            })}
          </div>

          {filters.selectedGenres.length === 0 && (
            <p className="text-sm text-gray-600 mt-2">
              💡 Kein Genre ausgewählt - alle Genres werden angezeigt
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default EPGFilter;