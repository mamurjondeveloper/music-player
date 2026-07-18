import { create } from 'zustand';
import api from '../services/api';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  audioUrl: string;
  coverUrl: string | null;
  playCount: number;
}

interface PlayerState {
  currentSong: Song | null;
  queue: Song[];
  history: Song[];
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  volume: number;
  playbackSpeed: number;
  isShuffle: boolean;
  isLoop: 'none' | 'one' | 'all';
  audio: HTMLAudioElement | null;
  init: () => void;
  playSong: (song: Song, contextQueue?: Song[]) => void;
  togglePlay: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleShuffle: () => void;
  toggleLoop: () => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (songId: string) => void;
  setQueue: (songs: Song[]) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const usePlayerStore = create<PlayerState>((set, get) => {
  let audioInstance: HTMLAudioElement | null = null;

  // Sync with Media Session API
  const updateMediaSession = (song: Song) => {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        album: song.album,
        artwork: [
          {
            src: song.coverUrl ? `${API_URL}${song.coverUrl}` : '/placeholder-cover.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      });
    }
  };

  return {
    currentSong: null,
    queue: [],
    history: [],
    isPlaying: false,
    duration: 0,
    currentTime: 0,
    volume: 0.8,
    playbackSpeed: 1.0,
    isShuffle: false,
    isLoop: 'none',
    audio: null,

    init: () => {
      if (typeof window === 'undefined' || audioInstance) return;

      audioInstance = new Audio();
      audioInstance.volume = get().volume;

      // Event Listeners
      let lastSavedSecond = -1;
      audioInstance.addEventListener('timeupdate', () => {
        if (audioInstance) {
          const currentSecond = Math.floor(audioInstance.currentTime);
          if (currentSecond !== lastSavedSecond) {
            lastSavedSecond = currentSecond;
            localStorage.setItem('symphony_current_time', audioInstance.currentTime.toString());
          }
          set({ currentTime: audioInstance.currentTime });
        }
      });

      audioInstance.addEventListener('durationchange', () => {
        if (audioInstance) {
          set({ duration: audioInstance.duration });
        }
      });

      audioInstance.addEventListener('ended', () => {
        const state = get();
        if (state.isLoop === 'one') {
          if (audioInstance) {
            audioInstance.currentTime = 0;
            audioInstance.play().catch(console.error);
          }
        } else {
          state.playNext();
        }
      });

      // Media Session Actions
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => get().togglePlay());
        navigator.mediaSession.setActionHandler('pause', () => get().togglePlay());
        navigator.mediaSession.setActionHandler('nexttrack', () => get().playNext());
        navigator.mediaSession.setActionHandler('previoustrack', () => get().playPrevious());
      }

      set({ audio: audioInstance });

      // Retrieve state from localStorage if available
      const savedVolume = localStorage.getItem('symphony_volume');
      if (savedVolume) {
        const vol = parseFloat(savedVolume);
        set({ volume: vol });
        audioInstance.volume = vol;
      }

      const savedSongStr = localStorage.getItem('symphony_current_song');
      const savedTimeStr = localStorage.getItem('symphony_current_time');
      const savedQueueStr = localStorage.getItem('symphony_queue');

      if (savedSongStr) {
        try {
          const savedSong = JSON.parse(savedSongStr);
          set({ currentSong: savedSong, duration: savedSong.duration });
          audioInstance.src = `${API_URL}${savedSong.audioUrl}`;

          if (savedTimeStr) {
            const savedTime = parseFloat(savedTimeStr);
            audioInstance.currentTime = savedTime;
            set({ currentTime: savedTime });
          }

          if (savedQueueStr) {
            const savedQueue = JSON.parse(savedQueueStr);
            set({ queue: savedQueue });
          }
          
          updateMediaSession(savedSong);
        } catch (e) {
          console.warn('Failed to restore playback state:', e);
        }
      }
    },

    playSong: async (song, contextQueue = []) => {
      const state = get();
      if (!state.audio) {
        state.init();
      }

      const activeAudio = get().audio;
      if (!activeAudio) return;

      // Check if same song is already playing
      if (state.currentSong?.id === song.id) {
        get().togglePlay();
        return;
      }

      // If playing a new song, record in history and playcount
      try {
        api.post(`/songs/${song.id}/play`).catch(() => {});
        api.post(`/songs/${song.id}/history`).catch(() => {});
      } catch (e) {}

      activeAudio.src = `${API_URL}${song.audioUrl}`;
      activeAudio.playbackRate = get().playbackSpeed;

      set({
        currentSong: song,
        isPlaying: true,
        currentTime: 0,
        duration: song.duration,
      });

      localStorage.setItem('symphony_current_song', JSON.stringify(song));
      localStorage.setItem('symphony_current_time', '0');

      if (contextQueue.length > 0) {
        const inQueue = contextQueue.some((s) => s.id === song.id);
        const newQueue = inQueue ? contextQueue : [song, ...contextQueue];
        set({ queue: newQueue });
        localStorage.setItem('symphony_queue', JSON.stringify(newQueue));
      } else if (!state.queue.some((s) => s.id === song.id)) {
        const newQueue = [song, ...state.queue];
        set({ queue: newQueue });
        localStorage.setItem('symphony_queue', JSON.stringify(newQueue));
      }

      updateMediaSession(song);
      activeAudio.play().catch((err) => {
        console.error('Playback failed', err);
        set({ isPlaying: false });
      });
    },

    togglePlay: () => {
      const state = get();
      if (!state.audio || !state.currentSong) return;

      if (state.isPlaying) {
        state.audio.pause();
        set({ isPlaying: false });
      } else {
        state.audio.play().catch(console.error);
        set({ isPlaying: true });
      }
    },

    playNext: () => {
      const state = get();
      if (state.queue.length === 0) return;

      let nextSong: Song | null = null;

      if (state.isShuffle && state.queue.length > 1) {
        let randomIndex = Math.floor(Math.random() * state.queue.length);
        while (state.queue[randomIndex].id === state.currentSong?.id) {
          randomIndex = Math.floor(Math.random() * state.queue.length);
        }
        nextSong = state.queue[randomIndex];
      } else {
        const currentIndex = state.queue.findIndex((s) => s.id === state.currentSong?.id);
        if (currentIndex !== -1 && currentIndex < state.queue.length - 1) {
          nextSong = state.queue[currentIndex + 1];
        } else if (state.isLoop === 'all') {
          nextSong = state.queue[0];
        }
      }

      if (nextSong) {
        get().playSong(nextSong, state.queue);
      } else {
        set({ isPlaying: false, currentTime: 0 });
        if (state.audio) state.audio.pause();
      }
    },

    playPrevious: () => {
      const state = get();
      if (state.queue.length === 0) return;

      let prevSong: Song | null = null;

      // If song has played for more than 3 seconds, restart it
      if (state.currentTime > 3 && state.audio) {
        state.audio.currentTime = 0;
        set({ currentTime: 0 });
        return;
      }

      const currentIndex = state.queue.findIndex((s) => s.id === state.currentSong?.id);
      if (currentIndex > 0) {
        prevSong = state.queue[currentIndex - 1];
      } else if (state.isLoop === 'all') {
        prevSong = state.queue[state.queue.length - 1];
      }

      if (prevSong) {
        get().playSong(prevSong, state.queue);
      }
    },

    seek: (time) => {
      const state = get();
      if (state.audio) {
        state.audio.currentTime = time;
        set({ currentTime: time });
      }
    },

    setVolume: (vol) => {
      const state = get();
      const clampedVol = Math.max(0, Math.min(1, vol));
      set({ volume: clampedVol });
      if (state.audio) {
        state.audio.volume = clampedVol;
      }
      localStorage.setItem('symphony_volume', clampedVol.toString());
    },

    setPlaybackSpeed: (speed) => {
      set({ playbackSpeed: speed });
      const state = get();
      if (state.audio) {
        state.audio.playbackRate = speed;
      }
    },

    toggleShuffle: () => {
      set({ isShuffle: !get().isShuffle });
    },

    toggleLoop: () => {
      const loops: ('none' | 'one' | 'all')[] = ['none', 'all', 'one'];
      const nextIndex = (loops.indexOf(get().isLoop) + 1) % loops.length;
      set({ isLoop: loops[nextIndex] });
    },

    addToQueue: (song) => {
      const state = get();
      if (state.queue.some((s) => s.id === song.id)) return;
      set({ queue: [...state.queue, song] });
    },

    removeFromQueue: (songId) => {
      set({ queue: get().queue.filter((s) => s.id !== songId) });
    },

    setQueue: (songs) => {
      set({ queue: songs });
    },
  };
});
