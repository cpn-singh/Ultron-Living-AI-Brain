import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  Minus, Maximize2, X, Music, Radio, ExternalLink, Disc, Loader2,
  Headphones, Film, RefreshCw
} from 'lucide-react';
import { musicPlayer } from '../services/musicPlayerService';

const formatTime = (secs) => {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

function SeekSlider({ currentTime, duration, onSeek }) {
  const [isDragging, setIsDragging] = useState(false);
  const [localVal, setLocalVal] = useState(currentTime || 0);

  useEffect(() => {
    if (!isDragging) {
      setLocalVal(currentTime || 0);
    }
  }, [currentTime, isDragging]);

  const maxVal = duration && !isNaN(duration) && duration > 0 ? duration : 100;
  const currentVal = isDragging ? localVal : (currentTime || 0);
  const percent = Math.min(100, Math.max(0, (currentVal / maxVal) * 100));

  const handleSeekChange = (e) => {
    const val = parseFloat(e.target.value);
    setLocalVal(val);
  };

  const handleSeekCommit = (e) => {
    const val = parseFloat(e.target.value);
    setIsDragging(false);
    onSeek(val);
  };

  return (
    <div className="flex flex-col gap-1 px-0.5 select-none">
      <div className="relative flex items-center h-5 cursor-pointer touch-none group">
        {/* Progress Background Track */}
        <div className="w-full h-1.5 bg-slate-800/90 rounded-full overflow-hidden border border-slate-700/60 shadow-inner">
          <div
            className="h-full bg-white rounded-full transition-all duration-75"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Range input for seek dragging */}
        <input
          type="range"
          min="0"
          max={maxVal}
          step="0.5"
          value={currentVal}
          onMouseDown={() => setIsDragging(true)}
          onTouchStart={() => setIsDragging(true)}
          onChange={handleSeekChange}
          onMouseUp={handleSeekCommit}
          onTouchEnd={handleSeekCommit}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          title="Seek track position"
        />

        {/* Scrubber thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none w-3 h-3 rounded-full bg-white shadow-md border border-slate-900 group-hover:scale-125 transition-transform"
          style={{ left: `${percent}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] font-mono text-slate-400 px-0.5">
        <span>{formatTime(currentVal)}</span>
        <span>{formatTime(maxVal)}</span>
      </div>
    </div>
  );
}

export default function MusicPlayer() {
  const [playerState, setPlayerState] = useState(musicPlayer.state);

  useEffect(() => {
    const unsubscribe = musicPlayer.subscribe((newState) => {
      setPlayerState(newState);
    });
    return unsubscribe;
  }, []);

  // Automatically detect if YouTube embed has playback blocked (Error 150/101) and switch to working alternate video or audio
  useEffect(() => {
    const handleWindowMessage = (e) => {
      try {
        const parsed = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (parsed && (
          parsed.event === 'onError' ||
          parsed.event === 'onPlayerError' ||
          parsed.info === 150 || parsed.info === 101 || parsed.info === 100 || parsed.info === 2 ||
          parsed.data === 150 || parsed.data === 101 || parsed.data === 100
        )) {
          console.warn('[MusicPlayer] YouTube video embed unavailable/restricted. Auto-switching candidate...');
          musicPlayer.tryNextVideo();
        }
      } catch (err) {}
    };
    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, []);

  if (!playerState.isOpen) return null;

  // Minimized Compact Floating Pill
  if (playerState.isMinimized) {
    return (
      <div 
        className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2.5 px-3 py-2 rounded-full bg-slate-950/90 backdrop-blur-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.75)] select-none text-white animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        <button
          onClick={() => musicPlayer.toggleMinimize()}
          className="flex items-center gap-2.5 hover:opacity-90 cursor-pointer"
          title="Expand Music Player"
        >
          <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 border border-slate-700/80">
            <Disc className={`w-3.5 h-3.5 text-slate-300 ${playerState.isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
          </div>

          <div className="flex flex-col text-left max-w-[130px] sm:max-w-[170px]">
            <span className="text-xs font-medium truncate text-white">
              {playerState.currentTrack?.title || 'Ultron Audio'}
            </span>
            <span className="text-[10px] text-slate-400 truncate">
              {playerState.isPlaying ? 'Playing now' : 'Paused'}
            </span>
          </div>
        </button>

        {/* Mini Visualizer */}
        {playerState.isPlaying && (
          <div className="flex items-end gap-0.5 h-3.5 px-1">
            <span className="w-0.5 bg-slate-400 animate-pulse rounded-full h-2" />
            <span className="w-0.5 bg-white animate-pulse rounded-full h-3.5" style={{ animationDelay: '0.15s' }} />
            <span className="w-0.5 bg-slate-300 animate-pulse rounded-full h-1.5" style={{ animationDelay: '0.3s' }} />
            <span className="w-0.5 bg-slate-400 animate-pulse rounded-full h-3" style={{ animationDelay: '0.45s' }} />
          </div>
        )}

        {/* Play/Pause */}
        <button
          onClick={() => musicPlayer.togglePlay()}
          className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title={playerState.isPlaying ? 'Pause' : 'Play'}
        >
          {playerState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
        </button>

        {/* Expand */}
        <button
          onClick={() => musicPlayer.toggleMinimize()}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Expand Player"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Close */}
        <button
          onClick={() => musicPlayer.close()}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close Player"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Full Expanded Player Card
  return (
    <div 
      className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-50 w-[92vw] sm:w-[370px] max-w-[390px] rounded-2xl bg-slate-950/95 backdrop-blur-2xl border border-white/10 shadow-[0_16px_50px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden select-none text-white animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-900/60 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
            <Music className="w-4 h-4 text-slate-300" />
            Ultron Music
          </span>
          <span className="text-[11px] font-medium text-slate-300 border border-slate-700/80 rounded-md px-2 py-0.5 bg-slate-800/80 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${playerState.isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span>{playerState.displayMode === 'audio' ? 'Audio Stream' : 'Video Stream'}</span>
          </span>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          {/* Audio vs Video Mode Toggle */}
          <button
            onClick={() => musicPlayer.toggleDisplayMode()}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer flex items-center"
            title={playerState.displayMode === 'audio' ? 'Switch to Video Mode' : 'Switch to Audio Mode'}
          >
            {playerState.displayMode === 'audio' ? (
              <Film className="w-3.5 h-3.5" />
            ) : (
              <Headphones className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={() => musicPlayer.toggleMinimize()}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => musicPlayer.close()}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-3.5 sm:p-4 flex flex-col gap-3">
        {playerState.sourceType === 'youtube' ? (
          playerState.isLoading ? (
            <div className="flex flex-col items-center justify-center p-6 gap-2.5 rounded-xl border border-slate-800 bg-slate-900/60 aspect-video shadow-inner">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
              <span className="text-xs font-mono text-slate-300 text-center animate-pulse">
                Tuning stream for "{playerState.ytQuery}"...
              </span>
              <span className="text-[10px] text-slate-500">Resolving YouTube audio stream</span>
            </div>
          ) : playerState.ytEmbedUrl ? (
            <div className="flex flex-col gap-3">
              {playerState.displayMode === 'audio' ? (
                <>
                  {!playerState.audioUrl && playerState.ytEmbedUrl ? (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-800 bg-black shadow-inner">
                      <iframe
                        src={playerState.ytEmbedUrl}
                        title={`Ultron Stream - ${playerState.ytQuery}`}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {/* Gesture unblock if needed on mobile browsers */}
                      {playerState.needsUserGesture && (
                        <button
                          type="button"
                          onClick={() => musicPlayer.resume()}
                          className="w-full py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-750 text-white font-medium text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Tap to Play Song (Audio Focus)</span>
                        </button>
                      )}

                      {/* Track info card */}
                      <div 
                        onClick={() => musicPlayer.togglePlay()}
                        className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm cursor-pointer hover:border-slate-700 transition-colors"
                        title={playerState.isPlaying ? 'Tap to Pause' : 'Tap to Play'}
                      >
                        <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 shadow-md shrink-0 overflow-hidden">
                          {playerState.currentTrack?.cover ? (
                            <img
                              src={playerState.currentTrack.cover}
                              alt="Cover"
                              className={`w-full h-full object-cover ${playerState.isPlaying ? 'animate-spin' : ''}`}
                              style={{ animationDuration: '6s' }}
                            />
                          ) : (
                            <Disc className={`w-7 h-7 text-slate-300 ${playerState.isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3.5s' }} />
                          )}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-black/60 shadow-sm" />
                          </div>
                        </div>

                        <div className="flex flex-col overflow-hidden flex-1">
                          <span className="text-sm font-semibold text-white truncate tracking-tight">
                            {playerState.currentTrack?.title || playerState.ytQuery || 'Playing Song'}
                          </span>
                          <span className="text-xs text-slate-400 truncate">
                            {playerState.currentTrack?.artist || 'YouTube Music'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {playerState.currentTrack?.genre || 'Direct Stream Active'}
                          </span>
                        </div>

                        {/* Equalizer frequency bars */}
                        <div className="flex items-end gap-1 h-5 px-1 shrink-0">
                          <span className={`w-0.5 rounded-full bg-slate-400 ${playerState.isPlaying ? 'animate-bounce h-4' : 'h-1'}`} style={{ animationDuration: '0.6s' }} />
                          <span className={`w-0.5 rounded-full bg-white ${playerState.isPlaying ? 'animate-bounce h-5' : 'h-2'}`} style={{ animationDuration: '0.45s', animationDelay: '0.1s' }} />
                          <span className={`w-0.5 rounded-full bg-slate-300 ${playerState.isPlaying ? 'animate-bounce h-3' : 'h-1'}`} style={{ animationDuration: '0.7s', animationDelay: '0.2s' }} />
                          <span className={`w-0.5 rounded-full bg-slate-200 ${playerState.isPlaying ? 'animate-bounce h-4.5' : 'h-2'}`} style={{ animationDuration: '0.5s', animationDelay: '0.15s' }} />
                          <span className={`w-0.5 rounded-full bg-slate-400 ${playerState.isPlaying ? 'animate-bounce h-3.5' : 'h-1'}`} style={{ animationDuration: '0.65s', animationDelay: '0.25s' }} />
                        </div>
                      </div>

                      {/* Seek Slider */}
                      <SeekSlider
                        currentTime={playerState.currentTime}
                        duration={playerState.duration}
                        onSeek={(secs) => musicPlayer.seek(secs)}
                      />

                      <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
                        <span className="truncate max-w-[200px]">
                          Query: <strong className="text-slate-200">"{playerState.ytQuery}"</strong>
                        </span>
                        <a
                          href={playerState.musicUrl || `https://music.youtube.com/search?q=${encodeURIComponent(playerState.ytQuery)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-slate-300 hover:text-white font-medium transition-colors cursor-pointer"
                          title="Open in YouTube Music"
                        >
                          <span>YouTube Music</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Video Mode */
                <>
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-800 bg-black shadow-inner">
                    <iframe
                      src={playerState.ytEmbedUrl}
                      title={`Ultron Player - ${playerState.ytQuery}`}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                  <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
                    <span className="truncate max-w-[220px]">
                      Query: <strong className="text-slate-200">"{playerState.ytQuery}"</strong>
                    </span>
                    <a
                      href={playerState.musicUrl || `https://music.youtube.com/search?q=${encodeURIComponent(playerState.ytQuery)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-slate-300 hover:text-white font-medium transition-colors cursor-pointer"
                      title="Open in YouTube Music"
                    >
                      <span>YouTube Music</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => musicPlayer.toggleDisplayMode()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  {playerState.displayMode === 'audio' ? (
                    <>
                      <Film className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>Watch Video</span>
                    </>
                  ) : (
                    <>
                      <Headphones className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>Audio Visualizer</span>
                    </>
                  )}
                </button>

                {playerState.alternateVideoIds && playerState.alternateVideoIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => musicPlayer.tryNextVideo()}
                    className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Try alternate video version"
                  >
                    <RefreshCw className="w-3 h-3 text-slate-400" />
                    <span>Next Version</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 gap-3 rounded-xl border border-slate-800 bg-slate-900/60 aspect-video text-center">
              <Music className="w-7 h-7 text-slate-400" />
              <p className="text-xs text-slate-300">
                Media player ready for <strong>"{playerState.ytQuery}"</strong>
              </p>
              <a
                href={playerState.musicUrl || `https://music.youtube.com/search?q=${encodeURIComponent(playerState.ytQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-950 hover:bg-slate-200 text-xs font-medium shadow-sm transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Launch YouTube Music</span>
              </a>
            </div>
          )
        ) : (
          /* Local / Curated Audio Source */
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm">
              <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 shadow-md shrink-0 overflow-hidden">
                <Disc className={`w-7 h-7 text-slate-300 ${playerState.isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3.5s' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-black/60 shadow-sm" />
                </div>
              </div>

              <div className="flex flex-col overflow-hidden flex-1">
                <span className="text-sm font-semibold text-white truncate tracking-tight">
                  {playerState.currentTrack?.title || 'Unknown Track'}
                </span>
                <span className="text-xs text-slate-400 truncate">
                  {playerState.currentTrack?.artist || 'Ultron AI'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono truncate">
                  {playerState.currentTrack?.genre || 'Audio Stream'}
                </span>
              </div>

              <div className="flex items-end gap-1 h-5 px-1 shrink-0">
                <span className={`w-0.5 rounded-full bg-slate-400 ${playerState.isPlaying ? 'animate-bounce h-4' : 'h-1'}`} style={{ animationDuration: '0.6s' }} />
                <span className={`w-0.5 rounded-full bg-white ${playerState.isPlaying ? 'animate-bounce h-5' : 'h-2'}`} style={{ animationDuration: '0.45s', animationDelay: '0.1s' }} />
                <span className={`w-0.5 rounded-full bg-slate-300 ${playerState.isPlaying ? 'animate-bounce h-3' : 'h-1'}`} style={{ animationDuration: '0.7s', animationDelay: '0.2s' }} />
                <span className={`w-0.5 rounded-full bg-slate-200 ${playerState.isPlaying ? 'animate-bounce h-4.5' : 'h-2'}`} style={{ animationDuration: '0.5s', animationDelay: '0.15s' }} />
                <span className={`w-0.5 rounded-full bg-slate-400 ${playerState.isPlaying ? 'animate-bounce h-3.5' : 'h-1'}`} style={{ animationDuration: '0.65s', animationDelay: '0.25s' }} />
              </div>
            </div>

            <SeekSlider
              currentTime={playerState.currentTime}
              duration={playerState.duration}
              onSeek={(secs) => musicPlayer.seek(secs)}
            />
          </div>
        )}
      </div>

      {/* Bottom Controls Toolbar Bar */}
      <div className="p-3 bg-slate-950/95 backdrop-blur-md border-t border-white/10 flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => musicPlayer.toggleMute()}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={playerState.isMuted ? 'Unmute' : 'Mute'}
          >
            {playerState.isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={playerState.isMuted ? 0 : playerState.volume}
            onChange={(e) => musicPlayer.setVolume(Number(e.target.value))}
            className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white"
            title="Volume"
          />
        </div>

        {/* Center Controls */}
        <div className="flex items-center gap-1.5">
          {playerState.sourceType === 'audio' && (
            <button
              onClick={() => musicPlayer.prev()}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors active:scale-95 cursor-pointer"
              title="Previous Track"
            >
              <SkipBack className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => musicPlayer.togglePlay()}
            className="w-9 h-9 rounded-full bg-white text-slate-950 hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center shadow-md cursor-pointer"
            title={playerState.isPlaying ? 'Pause' : 'Play'}
          >
            {playerState.isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current translate-x-0.5" />
            )}
          </button>

          {playerState.sourceType === 'audio' && (
            <button
              onClick={() => musicPlayer.next()}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors active:scale-95 cursor-pointer"
              title="Next Track"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Source Mode Toggle */}
        <button
          onClick={() => {
            if (playerState.sourceType === 'audio') {
              musicPlayer.playSong(playerState.currentTrack?.title || 'Cyberpunk Remix');
            } else {
              musicPlayer.playSong('');
            }
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-[11px] font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Switch playback source"
        >
          <Radio className="w-3 h-3 text-slate-400" />
          <span>{playerState.sourceType === 'audio' ? 'YouTube' : 'Curated'}</span>
        </button>
      </div>
    </div>
  );
}
