import React from 'react';
import { 
  Play, 
  Eye, 
  Clock, 
  Calendar,
  Tv
} from 'lucide-react';
import { formatters } from '../services/api';

function EPGProgramList({ 
  epgData, 
  channels, 
  onProgramClick, 
  onCreateTimer 
}) {

  /**
   * Get badge color for genre
   */
  const getGenreBadgeClass = (genre) => {
    const color = formatters.getGenreBadgeColor(genre);
    return `badge badge-${color}`;
  };

  /**
   * Check if program is currently running
   */
  const isProgramCurrent = (program, day) => {
    if (day !== 0) return false; // Only check for today
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [hours, minutes] = program.time.split(':').map(Number);
    const programTime = hours * 60 + minutes;
    
    // Simple check - program started in last 3 hours
    return Math.abs(currentTime - programTime) < 180 && currentTime >= programTime;
  };

  /**
   * Render a single program item
   */
  const ProgramItem = ({ program, channelData }) => {
    const isCurrent = isProgramCurrent(program, channelData.day);
    
    return (
      <div 
        className={`
          epg-program group
          ${isCurrent ? 'border-green-300 bg-green-50' : ''}
        `}
        onClick={() => onProgramClick(program)}
      >
        {/* Time and Status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`epg-time ${isCurrent ? 'text-green-600' : ''}`}>
              {program.time}
            </span>
            {isCurrent && (
              <span className="badge badge-green text-xs">
                ● Läuft jetzt
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onProgramClick(program);
              }}
              className="btn btn-outline btn-sm"
              title="Details anzeigen"
            >
              <Eye size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateTimer(program);
              }}
              className="btn btn-primary btn-sm"
              title="Aufnahme erstellen"
            >
              <Play size={14} />
            </button>
          </div>
        </div>

        {/* Title */}
        <h4 className="epg-title">
          {formatters.truncateText(program.title, 60)}
        </h4>

        {/* Genre */}
        <div className="flex items-center justify-between mt-2">
          <span className={getGenreBadgeClass(program.genre)}>
            {program.genre}
          </span>
          
          {program.endTime && (
            <span className="text-xs text-gray-500">
              bis {program.endTime}
            </span>
          )}
        </div>
      </div>
    );
  };

  /**
   * Render channel section
   */
  const ChannelSection = ({ channelData }) => {
    const channel = channels[channelData.channelId];
    const channelName = channelData.channelName || channel?.name || `Channel ${channelData.channelId}`;
    
    return (
      <div className="card mb-6">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Tv size={20} className="text-blue-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {channelName}
                </h3>
                <p className="text-sm text-gray-600">
                  {channelData.programs.length} Sendungen • 
                  {formatters.getDayName(channelData.day)}
                  {channelData.day > 0 && ` (${formatters.getDateForDay(channelData.day).split(',')[1]})`}
                </p>
              </div>
            </div>
            
            {channel?.category && (
              <span className={`
                badge 
                ${channel.category === 'öffentlich-rechtlich' ? 'badge-blue' : ''}
                ${channel.category === 'privat' ? 'badge-green' : ''}
                ${channel.category === 'nachrichten' ? 'badge-yellow' : ''}
                ${channel.category === 'sport' ? 'badge-red' : ''}
              `}>
                {channel.category}
              </span>
            )}
          </div>
        </div>

        <div className="card-body">
          {channelData.programs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {channelData.programs.map((program) => (
                <ProgramItem
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

  /**
   * Render program statistics
   */
  const ProgramStats = () => {
    const totalPrograms = epgData.reduce((sum, channel) => sum + channel.programs.length, 0);
    const currentPrograms = epgData.reduce((sum, channel) => {
      return sum + channel.programs.filter(p => isProgramCurrent(p, channel.day)).length;
    }, 0);
    
    const genreStats = {};
    epgData.forEach(channel => {
      channel.programs.forEach(program => {
        genreStats[program.genre] = (genreStats[program.genre] || 0) + 1;
      });
    });
    
    const topGenres = Object.entries(genreStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-blue-600">{totalPrograms}</div>
            <div className="text-sm text-gray-600">Sendungen gesamt</div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-green-600">{currentPrograms}</div>
            <div className="text-sm text-gray-600">Läuft jetzt</div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body">
            <div className="text-sm font-medium text-gray-700 mb-2">Top Genres</div>
            <div className="space-y-1">
              {topGenres.map(([genre, count]) => (
                <div key={genre} className="flex justify-between text-xs">
                  <span className="truncate">{genre}</span>
                  <span className="text-gray-500">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!epgData || epgData.length === 0) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Keine EPG-Daten verfügbar
          </h3>
          <p className="text-gray-600">
            Laden Sie EPG-Daten oder passen Sie die Filter an.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <ProgramStats />

      {/* Channel Sections */}
      {epgData.map((channelData) => (
        <ChannelSection
          key={`${channelData.channelId}-${channelData.day}`}
          channelData={channelData}
        />
      ))}

      {/* Load More / Pagination could go here */}
      <div className="text-center py-6">
        <p className="text-gray-600 text-sm">
          Alle verfügbaren Sendungen angezeigt • 
          Letzte Aktualisierung: {formatters.formatTime(new Date())}
        </p>
      </div>
    </div>
  );
}

export default EPGProgramList;