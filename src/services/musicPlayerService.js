/**
 * ULTRON Global Music Player Service
 * Direct in-app music playback engine with instant audio streaming and YouTube media integration.
 */

class MusicPlayerService {
  constructor() {
    this.listeners = new Set();
    this.audioElement = null;

    // High quality instant-play curated audio streams
    this.playlist = [
      {
        id: 'track-cyberpunk',
        title: 'Cyberpunk Neon Pulse',
        artist: 'Ultron Synthetics',
        genre: 'Cyber Synthwave / EDM',
        cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
        audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=cyberpunk-2099-10701.mp3'
      },
      {
        id: 'track-lofi',
        title: 'Deep Memory Chillhop',
        artist: 'Ultron Study Station',
        genre: 'Lo-Fi Chill / Beats',
        cover: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&auto=format&fit=crop&q=80',
        audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=lofi-study-112191.mp3'
      },
      {
        id: 'track-electronic',
        title: 'Hyperdrive Warp',
        artist: 'Quantum Swarm Beats',
        genre: 'Electronic Pulse',
        cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80',
        audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=electronic-future-beats-117997.mp3'
      },
      {
        id: 'track-retrowave',
        title: 'Midnight Highway 80s',
        artist: 'Neon Horizon',
        genre: 'Retrowave / Synth',
        cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=150&auto=format&fit=crop&q=80',
        audioUrl: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f77c30.mp3?filename=synthwave-80s-110045.mp3'
      }
    ];

    this.currentIndex = 0;
    this.isUserPaused = false;
    this.state = {
      isOpen: false,
      isPlaying: false,
      isMinimized: false,
      isLoading: false,
      isVideo: false,
      displayMode: 'audio', // 'audio' | 'video'
      currentTrack: this.playlist[0],
      sourceType: 'audio', // 'audio' | 'youtube'
      ytQuery: null,
      ytEmbedUrl: null,
      videoId: null,
      volume: 0.85,
      isMuted: false,
      currentTime: 0,
      duration: 0,
      needsUserGesture: false
    };

    if (typeof window !== 'undefined') {
      this.initAudio();
      this.initUserGestureUnlock();
    }
  }

  initUserGestureUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.unlockAudio();
    };
    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('touchend', unlock, { passive: true });
  }

  unlockAudio() {
    if (this._unlocked || !this.audioElement) return;
    try {
      const silentWav = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      if (!this.audioElement.src) {
        this.audioElement.src = silentWav;
        const p = this.audioElement.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
            this._unlocked = true;
          }).catch(() => {});
        }
      } else {
        this._unlocked = true;
      }
    } catch (_) {}
  }

  initAudio() {
    if (this.audioElement) return;
    this.audioElement = new Audio();
    this.audioElement.volume = this.state.volume;
    this.audioElement.preload = 'auto';

    this.audioElement.addEventListener('timeupdate', () => {
      this.state.currentTime = this.audioElement.currentTime || 0;
      if (this.audioElement.duration && !isNaN(this.audioElement.duration) && isFinite(this.audioElement.duration)) {
        this.state.duration = this.audioElement.duration;
      }
      this.notify();
    });

    this.audioElement.addEventListener('loadedmetadata', () => {
      if (this.audioElement.duration && !isNaN(this.audioElement.duration) && isFinite(this.audioElement.duration)) {
        this.state.duration = this.audioElement.duration;
        this.notify();
      }
    });

    this.audioElement.addEventListener('durationchange', () => {
      if (this.audioElement.duration && !isNaN(this.audioElement.duration) && isFinite(this.audioElement.duration)) {
        this.state.duration = this.audioElement.duration;
        this.notify();
      }
    });

    this.audioElement.addEventListener('ended', () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ultron-media-paused'));
      }
      this.next();
    });

    this.audioElement.addEventListener('play', () => {
      this.isUserPaused = false;
      this.state.isPlaying = true;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ultron-media-playing'));
      }
      this.notify();
    });

    this.audioElement.addEventListener('pause', () => {
      this.state.isPlaying = false;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ultron-media-paused'));
      }
      this.notify();
    });

    this.audioElement.addEventListener('error', (e) => {
      console.warn('[MusicPlayer] Direct audio stream error, activating background stream fallback:', e);
      if (this.state.audioUrl) {
        this.state.audioUrl = null;
        if (!this.state.ytEmbedUrl && this.state.videoId) {
          this.state.ytEmbedUrl = `https://www.youtube.com/embed/${this.state.videoId}?autoplay=1&enablejsapi=1&playsinline=1&rel=0`;
        }
        this.notify();
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('ultron-stop-all-audio', () => {
        this.pause();
      });
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener({ ...this.state });
      } catch (e) {
        console.error('[MusicPlayer] Listener error:', e);
      }
    }
  }

  /**
   * Directly start playing a song or query.
   * If query is generic or blank, plays curated audio playlist.
   * If query has a specific song/artist, loads dedicated YouTube stream player.
   */
  async playSong(query = '', options = {}) {
    this.initAudio();
    this.isUserPaused = false;

    // Coordinate single audio output: stop any chat video player and notify voice engine
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ultron-pause-chat-video'));
      window.dispatchEvent(new CustomEvent('ultron-media-playing'));
    }

    const clean = (query || '').trim();
    const isVideo = Boolean(options.isVideo);

    // Check if query is generic "play song" / "play music" / "gana bajao"
    const isGeneric = !clean || /^(song|songs|music|track|gana|gaana|geet|koi gana|koi song|a song|some music)$/i.test(clean);

    if (isGeneric) {
      // Play instant audio stream
      this.state.sourceType = 'audio';
      this.state.isVideo = false;
      this.state.displayMode = 'audio';
      this.state.ytQuery = null;
      this.state.ytEmbedUrl = null;
      this.state.isOpen = true;
      this.state.isMinimized = false;
      this.state.currentTrack = this.playlist[this.currentIndex];

      if (this.audioElement) {
        this.audioElement.src = this.state.currentTrack.audioUrl;
        this.audioElement.volume = this.state.volume;
        try {
          await this.audioElement.play();
          this.state.isPlaying = true;
        } catch (err) {
          console.warn('[MusicPlayer] Audio play interrupted:', err);
        }
      }
    } else {
      // Play specific song query on YouTube stream with backend video ID resolution
      if (this.audioElement) {
        this.audioElement.pause();
      }

      this.state.sourceType = 'youtube';
      this.state.isVideo = isVideo;
      this.state.displayMode = isVideo ? 'video' : 'audio';
      this.state.ytQuery = clean;
      this.state.isLoading = true;
      this.state.ytEmbedUrl = null;
      this.state.videoId = null;
      this.state.alternateVideoIds = [];
      this.state.audioUrl = null;
      this.state.currentTime = 0;
      this.state.musicUrl = `https://music.youtube.com/search?q=${encodeURIComponent(clean)}`;
      this.state.currentTrack = {
        id: `ytm-${Date.now()}`,
        title: clean,
        artist: isVideo ? 'YouTube Video Stream' : 'YouTube Music',
        genre: isVideo ? 'Music Video' : 'Official YouTube Music',
        cover: null
      };
      this.state.isOpen = true;
      this.state.isMinimized = false;
      this.state.isPlaying = true;
      this.notify();

      // Resolve real video ID asynchronously via backend
      try {
        const apiUrl = typeof window !== 'undefined' ? '/api/yt-search' : 'http://127.0.0.1:8000/api/yt-search';
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: clean, type: isVideo ? 'video' : 'music' })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            this.state.videoId = data.videoId || null;
            this.state.alternateVideoIds = data.alternateIds || [];
            this.state.audioUrl = data.audioUrl || null;
            if (data.duration) {
              const parsedDur = parseFloat(data.duration);
              if (!isNaN(parsedDur) && parsedDur > 0) {
                this.state.duration = parsedDur;
              }
            }
            this.state.musicUrl = data.musicUrl || (data.videoId ? `https://music.youtube.com/watch?v=${data.videoId}` : `https://music.youtube.com/search?q=${encodeURIComponent(clean)}`);
            this.state.currentTrack = {
              id: `song-${Date.now()}`,
              title: data.title || clean,
              artist: data.artist || (isVideo ? 'YouTube Video Stream' : 'YouTube Music'),
              genre: data.duration ? `Full Track (${data.duration})` : (isVideo ? 'Music Video' : 'Official YouTube Music'),
              cover: data.cover || null
            };

            // Clean embed URL without IP origin parameter (prevents YouTube "Video is unavailable" error on local IPs)
            if (data.videoId) {
              this.state.ytEmbedUrl = `https://www.youtube.com/embed/${data.videoId}?autoplay=1&enablejsapi=1&playsinline=1&rel=0`;
            }

            // Direct 100% full-length audio stream in Audio Mode (320kbps CDN stream, no 15s cutoff, no YouTube Error 150)
            if (!isVideo && data.audioUrl && this.audioElement) {
              try {
                this.audioElement.src = data.audioUrl;
                this.audioElement.volume = this.state.volume;
                await this.audioElement.play();
                this.state.isPlaying = true;
                this.state.needsUserGesture = false;
              } catch (playErr) {
                console.warn('[MusicPlayer] Direct audio stream autoplay notice (requires tap on mobile Chrome):', playErr);
                this.state.isPlaying = false;
                this.state.needsUserGesture = true;
              }
            } else if (!data.audioUrl) {
              this.state.isPlaying = false;
              this.state.needsUserGesture = true;
            }

            this.state.isLoading = false;
            this.notify();
            return this.state.currentTrack;
          }
        }
      } catch (err) {
        console.warn('[MusicPlayer] Local yt-search failed, using direct search stream:', err);
      }

      // Client-side fallback if backend /api/yt-search is unavailable (e.g. static hosting)
      if (!this.state.audioUrl) {
        try {
          const fallbackRes = await fetch(`https://jiosaavn-api.vercel.app/search?query=${encodeURIComponent(clean)}`);
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            const top = (fallbackData.results || [])[0];
            if (top && top.more_info?.vlink) {
              this.state.audioUrl = top.more_info.vlink;
              this.state.currentTrack = {
                id: `song-${Date.now()}`,
                title: top.title || clean,
                artist: top.more_info?.singers || 'Ultron Music',
                genre: 'Audio Stream',
                cover: top.images?.['500x500'] || top.image || null
              };
              if (this.audioElement) {
                this.audioElement.src = top.more_info.vlink;
                this.audioElement.volume = this.state.volume;
                try {
                  await this.audioElement.play();
                  this.state.isPlaying = true;
                  this.state.needsUserGesture = false;
                } catch (e) {
                  this.state.isPlaying = false;
                  this.state.needsUserGesture = true;
                }
              }
              this.state.isLoading = false;
              this.notify();
              return this.state.currentTrack;
            }
          }
        } catch (fErr) {
          console.warn('[MusicPlayer] Public CORS audio fallback notice:', fErr);
        }
      }

      // 100% Fallback: Direct YouTube Music Search Stream
      this.state.sourceType = 'youtube';
      this.state.isPlaying = false;
      this.state.needsUserGesture = true;
      this.state.musicUrl = `https://music.youtube.com/search?q=${encodeURIComponent(clean)}`;
      this.state.ytEmbedUrl = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(clean + ' audio')}&autoplay=1&enablejsapi=1&playsinline=1&rel=0`;
      this.state.isLoading = false;
      this.notify();
      return this.state.currentTrack;
    }

    this.notify();
    return this.state.currentTrack;
  }

  pause() {
    this.isUserPaused = true;
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.state.isPlaying = false;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ultron-media-paused'));
    }
    this.notify();
  }

  async resume() {
    this.isUserPaused = false;
    this.state.needsUserGesture = false;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ultron-media-playing'));
    }
    if (this.audioElement && (this.state.audioUrl || this.audioElement.src)) {
      try {
        await this.audioElement.play();
        this.state.isPlaying = true;
      } catch (e) {
        console.warn('[MusicPlayer] Resume playback notice:', e);
      }
    } else {
      this.state.isPlaying = true;
    }
    this.notify();
  }

  switchToAudioMode() {
    this.state.displayMode = 'audio';
    if (this.state.audioUrl && this.audioElement) {
      this.audioElement.play().catch(() => {});
    }
    this.notify();
  }

  switchToVideoMode() {
    this.state.displayMode = 'video';
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.notify();
  }

  toggleDisplayMode() {
    const nextMode = this.state.displayMode === 'video' ? 'audio' : 'video';
    this.state.displayMode = nextMode;
    if (nextMode === 'video') {
      if (this.audioElement) this.audioElement.pause();
    } else {
      if (this.state.audioUrl && this.audioElement) {
        this.audioElement.play().catch(() => {});
      }
    }
    this.notify();
  }

  tryNextVideo() {
    if (!this.state.alternateVideoIds || this.state.alternateVideoIds.length === 0) {
      // If alternate video embeds are exhausted, ensure audio mode is active so user hears the stream
      this.state.displayMode = 'audio';
      if (this.state.audioUrl && this.audioElement) {
        this.audioElement.play().catch(() => {});
      }
      this.notify();
      return;
    }
    const nextId = this.state.alternateVideoIds.shift();
    this.state.videoId = nextId;
    this.state.musicUrl = `https://music.youtube.com/watch?v=${nextId}`;
    this.state.ytEmbedUrl = `https://www.youtube.com/embed/${nextId}?autoplay=1&enablejsapi=1&playsinline=1&rel=0`;
    this.state.isPlaying = true;
    this.notify();
  }

  togglePlay() {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.resume();
    }
  }

  next() {
    if (this.state.sourceType === 'audio') {
      this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
      this.playSong('');
    }
  }

  prev() {
    if (this.state.sourceType === 'audio') {
      this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
      this.playSong('');
    }
  }

  setVolume(vol) {
    const v = Math.max(0, Math.min(1, vol));
    this.state.volume = v;
    this.state.isMuted = v === 0;
    if (this.audioElement) {
      this.audioElement.volume = v;
    }
    this.notify();
  }

  toggleMute() {
    if (this.state.isMuted) {
      this.setVolume(this.state.volume || 0.85);
      this.state.isMuted = false;
    } else {
      if (this.audioElement) this.audioElement.volume = 0;
      this.state.isMuted = true;
    }
    this.notify();
  }

  seek(seconds) {
    const target = Math.max(0, Number(seconds) || 0);
    this.state.currentTime = target;

    // 1. Direct HTML5 audio element seeking
    if (this.audioElement) {
      try {
        if (this.audioElement.readyState >= 1) {
          this.audioElement.currentTime = target;
        } else {
          const onCanPlay = () => {
            this.audioElement.currentTime = target;
            this.audioElement.removeEventListener('canplay', onCanPlay);
          };
          this.audioElement.addEventListener('canplay', onCanPlay);
        }
      } catch (err) {
        console.warn('[MusicPlayer] Audio seek error:', err);
      }
    }

    // 2. YouTube iframe seeking (for video embed or background audio stream)
    if (typeof window !== 'undefined') {
      try {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((iframe) => {
          if (iframe.src && (iframe.src.includes('youtube.com') || iframe.src.includes('youtube-nocookie.com'))) {
            iframe.contentWindow?.postMessage(
              JSON.stringify({
                event: 'command',
                func: 'seekTo',
                args: [target, true]
              }),
              '*'
            );
          }
        });
      } catch (ytErr) {
        console.warn('[MusicPlayer] YouTube iframe seek notice:', ytErr);
      }
    }

    this.notify();
  }

  toggleMinimize() {
    this.state.isMinimized = !this.state.isMinimized;
    this.notify();
  }

  open() {
    this.state.isOpen = true;
    this.notify();
  }

  close() {
    this.pause();
    this.state.isOpen = false;
    this.notify();
  }
}

export const musicPlayer = new MusicPlayerService();
