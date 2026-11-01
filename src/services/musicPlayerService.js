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
    this.state = {
      isOpen: false,
      isPlaying: false,
      isMinimized: false,
      isLoading: false,
      isVideo: false,
      currentTrack: this.playlist[0],
      sourceType: 'audio', // 'audio' | 'youtube'
      ytQuery: null,
      ytEmbedUrl: null,
      videoId: null,
      volume: 0.85,
      isMuted: false,
      currentTime: 0,
      duration: 0
    };

    if (typeof window !== 'undefined') {
      this.initAudio();
    }
  }

  initAudio() {
    if (this.audioElement) return;
    this.audioElement = new Audio();
    this.audioElement.volume = this.state.volume;
    this.audioElement.preload = 'auto';

    this.audioElement.addEventListener('timeupdate', () => {
      this.state.currentTime = this.audioElement.currentTime || 0;
      this.state.duration = this.audioElement.duration || 0;
      this.notify();
    });

    this.audioElement.addEventListener('ended', () => {
      this.next();
    });

    this.audioElement.addEventListener('play', () => {
      this.state.isPlaying = true;
      this.notify();
    });

    this.audioElement.addEventListener('pause', () => {
      this.state.isPlaying = false;
      this.notify();
    });

    this.audioElement.addEventListener('error', (e) => {
      console.warn('[MusicPlayer] Audio stream loading warning, readying next fallback track.');
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

    // Coordinate single audio output: stop any chat video player
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ultron-pause-chat-video'));
    }

    const clean = (query || '').trim();
    const isVideo = Boolean(options.isVideo);

    // Check if query is generic "play song" / "play music" / "gana bajao"
    const isGeneric = !clean || /^(song|songs|music|track|gana|gaana|geet|koi gana|koi song|a song|some music)$/i.test(clean);

    if (isGeneric) {
      // Play instant audio stream
      this.state.sourceType = 'audio';
      this.state.isVideo = false;
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
      this.state.ytQuery = clean;
      this.state.isLoading = true;
      this.state.ytEmbedUrl = null;
      this.state.videoId = null;
      this.state.currentTrack = {
        id: `yt-${Date.now()}`,
        title: clean,
        artist: isVideo ? 'YouTube Video Stream' : 'YouTube Audio Stream',
        genre: isVideo ? 'Requested Video' : 'Requested Music',
        cover: null
      };
      this.state.isOpen = true;
      this.state.isMinimized = false;
      this.state.isPlaying = true;
      this.notify();

      // Resolve real video ID asynchronously via backend
      try {
        const res = await fetch('http://127.0.0.1:8000/api/yt-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: clean })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.videoId) {
            this.state.videoId = data.videoId;
            this.state.ytEmbedUrl = `https://www.youtube-nocookie.com/embed/${data.videoId}?autoplay=1&enablejsapi=1`;
            this.state.isLoading = false;
            this.notify();
            return this.state.currentTrack;
          }
        }
      } catch (err) {
        console.warn('[MusicPlayer] Local yt-search failed, trying fallback:', err);
      }

      // Fallback: iTunes instant audio search for real playable audio stream
      try {
        const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(clean)}&media=music&limit=1`);
        if (itunesRes.ok) {
          const itunesData = await itunesRes.json();
          if (itunesData.results && itunesData.results.length > 0) {
            const track = itunesData.results[0];
            if (track.previewUrl) {
              this.state.sourceType = 'audio';
              this.state.currentTrack = {
                id: `itunes-${track.trackId}`,
                title: track.trackName,
                artist: track.artistName,
                genre: track.primaryGenreName || 'Music',
                cover: track.artworkUrl100
              };
              if (this.audioElement) {
                this.audioElement.src = track.previewUrl;
                try {
                  await this.audioElement.play();
                  this.state.isPlaying = true;
                } catch (e) {}
              }
              this.state.isLoading = false;
              this.notify();
              return this.state.currentTrack;
            }
          }
        }
      } catch (err) {
        console.warn('[MusicPlayer] iTunes search fallback failed:', err);
      }

      // Final fallback if resolution was blocked
      this.state.isLoading = false;
      this.notify();
    }

    this.notify();
    return this.state.currentTrack;
  }

  pause() {
    if (this.state.sourceType === 'audio' && this.audioElement) {
      this.audioElement.pause();
    }
    this.state.isPlaying = false;
    this.notify();
  }

  async resume() {
    if (this.state.sourceType === 'audio' && this.audioElement) {
      try {
        await this.audioElement.play();
        this.state.isPlaying = true;
      } catch (e) {}
    } else {
      this.state.isPlaying = true;
    }
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
    if (this.state.sourceType === 'audio' && this.audioElement) {
      this.audioElement.currentTime = seconds;
      this.state.currentTime = seconds;
      this.notify();
    }
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
