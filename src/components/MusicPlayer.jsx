import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  Minus, Maximize2, X, Music, Radio, ExternalLink, Disc, Loader2 
} from 'lucide-react';
import { musicPlayer } from '../services/musicPlayerService';

export default function MusicPlayer() {
  const [playerState, setPlayerState] = useState(musicPlayer.state);

  useEffect(() => {
    const unsubscribe = musicPlayer.subscribe((newState) => {
      setPlayerState(newState);
    });
    return unsubscribe;
  }, []);

  if (!playerState.isOpen) return null;

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Minimized Compact Floating Pill
  if (playerState.isMinimized) {
    return (
      <div 
        className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2.5 px-3.5 py-2 rounded-full glass-panel bg-slate-950/90 backdrop-blur-2xl border border-cyan-500/40 shadow-[0_8px_32px_rgba(0,0,0,0.8)] select-none text-white animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        <button
          onClick={() => musicPlayer.toggleMinimize()}
          className="flex items-center gap-2 hover:opacity-90 cursor-pointer"
          title="Expand Music Player"
        >
          <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-cyan-950/80 border border-cyan-500/50">
            <Disc className={`w-4 h-4 text-cyan-400 ${playerState.isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
          </div>

          <div className="flex flex-col text-left max-w-[120px] sm:max-w-[160px]">
            <span className="text-xs font-semibold truncate text-cyan-200">
              {playerState.currentTrack?.title || 'Ultron Audio'}
            </span>
            <span className="text-[10px] text-white/50 truncate">
              {playerState.isPlaying ? 'Playing now' : 'Paused'}
            </span>
          </div>
        </button>

        {/* Mini Visualizer */}
        {playerState.isPlaying && (
          <div className="flex items-end gap-0.5 h-3.5 px-1">
            <span className="w-0.5 bg-cyan-400 animate-pulse rounded-full h-2" />
            <span className="w-0.5 bg-sky-400 animate-pulse rounded-full h-3.5" style={{ animationDelay: '0.15s' }} />
            <span className="w-0.5 bg-cyan-300 animate-pulse rounded-full h-1.5" style={{ animationDelay: '0.3s' }} />
            <span className="w-0.5 bg-blue-400 animate-pulse rounded-full h-3" style={{ animationDelay: '0.45s' }} />
          </div>
        )}

        {/* Play/Pause */}
        <button
          onClick={() => musicPlayer.togglePlay()}
          className="p-1 rounded-full text-cyan-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          {playerState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
        </button>

        {/* Expand */}
        <button
          onClick={() => musicPlayer.toggleMinimize()}
          className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Expand Player"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Close */}
        <button
          onClick={() => musicPlayer.close()}
          className="p-1 rounded-full text-white/40 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
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
      className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-50 w-[92vw] sm:w-[360px] max-w-[380px] rounded-2xl glass-panel bg-slate-950/95 backdrop-blur-2xl border border-cyan-500/40 shadow-[0_16px_50px_rgba(0,0,0,0.85)] flex flex-col gap-3 p-4 select-none text-white animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Header Toolbar */}
      <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
            <Music className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 font-mono">
              ULTRON Music Player
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => musicPlayer.toggleMinimize()}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => musicPlayer.close()}
            className="p-1.5 rounded-lg text-white/50 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content: YouTube Video Stream OR Cyberpunk Audio Visualizer */}
      {playerState.sourceType === 'youtube' ? (
        playerState.isLoading ? (
          <div className="flex flex-col items-center justify-center p-6 gap-2.5 rounded-xl border border-cyan-500/40 bg-black/80 aspect-video shadow-inner">
            <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
            <span className="text-xs font-mono text-cyan-200 text-center animate-pulse">
              Tuning stream for "{playerState.ytQuery}"...
            </span>
            <span className="text-[10px] text-white/40">Resolving high-definition media</span>
          </div>
        ) : playerState.ytEmbedUrl ? (
          <div className="flex flex-col gap-2">
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-cyan-900/60 bg-black shadow-inner">
              <iframe
                src={playerState.ytEmbedUrl}
                title={`Ultron Player - ${playerState.ytQuery}`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <div className="flex items-center justify-between px-1 text-[11px] text-white/70">
              <span className="truncate max-w-[220px] font-medium text-cyan-200">
                Query: <strong className="text-white">"{playerState.ytQuery}"</strong>
              </span>
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(playerState.ytQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-200 underline cursor-pointer"
              >
                <span>Full Tab</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 gap-3 rounded-xl border border-cyan-900/50 bg-black/80 aspect-video text-center">
            <Music className="w-8 h-8 text-cyan-400" />
            <p className="text-xs text-white/80">
              Media player ready for <strong>"{playerState.ytQuery}"</strong>
            </p>
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(playerState.ytQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-900/40"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Launch Video on YouTube</span>
            </a>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-3">
          {/* Vinyl Disc & Track Info */}
          <div className="flex items-center gap-3.5 p-2 rounded-xl bg-slate-900/70 border border-cyan-900/30">
            <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-slate-950 border-2 border-cyan-500/40 shadow-lg shrink-0 overflow-hidden">
              <Disc className={`w-8 h-8 text-cyan-400 ${playerState.isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3.5s' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-cyan-400/80 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              </div>
            </div>

            <div className="flex flex-col overflow-hidden flex-1">
              <span className="text-sm font-bold text-white truncate tracking-wide">
                {playerState.currentTrack?.title || 'Unknown Track'}
              </span>
              <span className="text-xs text-cyan-300/80 truncate">
                {playerState.currentTrack?.artist || 'Ultron AI'}
              </span>
              <span className="text-[10px] text-white/40 truncate">
                {playerState.currentTrack?.genre || 'Audio Stream'}
              </span>
            </div>

            {/* Equalizer Frequency Waves */}
            <div className="flex items-end gap-1 h-6 px-1 shrink-0">
              <span className={`w-1 rounded-full bg-cyan-400 ${playerState.isPlaying ? 'animate-bounce h-5' : 'h-1'}`} style={{ animationDuration: '0.6s' }} />
              <span className={`w-1 rounded-full bg-sky-400 ${playerState.isPlaying ? 'animate-bounce h-6' : 'h-2'}`} style={{ animationDuration: '0.45s', animationDelay: '0.1s' }} />
              <span className={`w-1 rounded-full bg-teal-400 ${playerState.isPlaying ? 'animate-bounce h-3.5' : 'h-1'}`} style={{ animationDuration: '0.7s', animationDelay: '0.2s' }} />
              <span className={`w-1 rounded-full bg-cyan-300 ${playerState.isPlaying ? 'animate-bounce h-5.5' : 'h-2'}`} style={{ animationDuration: '0.5s', animationDelay: '0.15s' }} />
              <span className={`w-1 rounded-full bg-blue-400 ${playerState.isPlaying ? 'animate-bounce h-4' : 'h-1'}`} style={{ animationDuration: '0.65s', animationDelay: '0.25s' }} />
            </div>
          </div>

          {/* Progress Slider */}
          <div className="flex flex-col gap-1 px-1">
            <input
              type="range"
              min="0"
              max={playerState.duration || 100}
              value={playerState.currentTime || 0}
              onChange={(e) => musicPlayer.seek(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] font-mono text-white/40">
              <span>{formatTime(playerState.currentTime)}</span>
              <span>{formatTime(playerState.duration)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Control Buttons Bar */}
      <div className="flex items-center justify-between pt-1 border-t border-cyan-900/30">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => musicPlayer.toggleMute()}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={playerState.isMuted ? 'Unmute' : 'Mute'}
          >
            {playerState.isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={playerState.isMuted ? 0 : playerState.volume}
            onChange={(e) => musicPlayer.setVolume(Number(e.target.value))}
            className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            title="Volume"
          />
        </div>

        {/* Center Controls */}
        <div className="flex items-center gap-2">
          {playerState.sourceType === 'audio' && (
            <button
              onClick={() => musicPlayer.prev()}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              title="Previous Track"
            >
              <SkipBack className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => musicPlayer.togglePlay()}
            className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer"
            title={playerState.isPlaying ? 'Pause' : 'Play'}
          >
            {playerState.isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current translate-x-0.5" />
            )}
          </button>

          {playerState.sourceType === 'audio' && (
            <button
              onClick={() => musicPlayer.next()}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              title="Next Track"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Switch Stream Mode Button */}
        <button
          onClick={() => {
            if (playerState.sourceType === 'audio') {
              musicPlayer.playSong(playerState.currentTrack?.title || 'Cyberpunk Remix');
            } else {
              musicPlayer.playSong('');
            }
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/40 text-[10px] font-semibold text-cyan-300 hover:text-white transition-all cursor-pointer"
          title="Switch playback mode"
        >
          <Radio className="w-3 h-3 text-cyan-400" />
          <span>{playerState.sourceType === 'audio' ? 'YouTube' : 'Curated'}</span>
        </button>
      </div>
    </div>
  );
}
