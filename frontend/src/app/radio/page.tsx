'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { usePlayerStore, Song } from '@/store/playerStore';
import api from '@/services/api';
import { Radio, Play, Pause, Disc, Sparkles } from 'lucide-react';

export default function RadioPage() {
  const { user } = useAuthStore();
  const { currentSong, isPlaying, playSong, setQueue, queue } = usePlayerStore();
  
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRadioActive, setIsRadioActive] = useState(false);

  useEffect(() => {
    const fetchAllSongs = async () => {
      try {
        const res = await api.get('/songs');
        setSongs(res.data);
      } catch (err) {
        console.error('Failed to load songs for radio:', err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchAllSongs();
  }, [user]);

  // Check if current playing song is part of a radio queue
  useEffect(() => {
    if (songs.length > 0 && queue.length > 0 && currentSong) {
      // visual cues
    }
  }, [queue, currentSong, songs]);

  const startRadio = () => {
    if (songs.length === 0) return;
    
    // Shuffle all songs
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    
    // Play the first one, pass the rest as queue
    playSong(shuffled[0], shuffled);
    setIsRadioActive(true);
  };

  const currentRadioSong = currentSong;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <Radio className="h-16 w-16 text-primary animate-pulse" />
        <p className="text-gray-400 font-medium tracking-wide animate-pulse">Tuning frequencies...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] px-4">
      {/* Dynamic Background Glow based on state */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-primary/10 border border-primary/20 mb-2 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
          <Radio className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Symphony Radio</h1>
        <p className="text-gray-400 text-lg max-w-lg mx-auto">
          Endless stream of randomized tracks from your entire library. Just sit back, relax, and let the music flow.
        </p>
      </div>

      <div className="glass-panel p-8 md:p-12 rounded-[3rem] w-full max-w-2xl text-center relative overflow-hidden border border-white/10 shadow-2xl">
        {/* Subtle decorative elements */}
        <Sparkles className="absolute top-6 left-6 h-5 w-5 text-primary/40" />
        <Sparkles className="absolute bottom-6 right-6 h-6 w-6 text-primary/30" />

        <div className="relative mx-auto w-48 h-48 md:w-64 md:h-64 mb-10">
          <div className={`absolute inset-0 rounded-full border-4 border-primary/30 ${isPlaying ? 'animate-[spin_3s_linear_infinite]' : ''} border-t-primary shadow-[0_0_40px_rgba(34,197,94,0.4)]`} />
          <div className="absolute inset-2 rounded-full overflow-hidden bg-black flex items-center justify-center">
            {currentRadioSong?.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${currentRadioSong.coverUrl}`}
                alt="Cover"
                className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`}
              />
            ) : (
              <Disc className={`w-24 h-24 text-gray-700 ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
            )}
          </div>
          {/* Inner hole of the vinyl */}
          <div className="absolute inset-0 m-auto w-12 h-12 bg-black rounded-full border-4 border-white/10 z-10" />
        </div>

        {currentRadioSong ? (
          <div className="space-y-3 mb-8">
            <h2 className="text-2xl font-bold text-white truncate px-4">{currentRadioSong.title}</h2>
            <p className="text-primary font-medium text-lg truncate px-4">{currentRadioSong.artist}</p>
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            <h2 className="text-2xl font-bold text-white">Ready to Broadcast</h2>
            <p className="text-gray-400 font-medium text-lg">{songs.length} tracks loaded</p>
          </div>
        )}

        <button
          onClick={startRadio}
          className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-primary text-black rounded-full font-bold text-lg hover:bg-primary-hover hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(34,197,94,0.4)] overflow-hidden"
        >
          <div className="absolute inset-0 w-full h-full bg-white/20 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          <Play className="h-6 w-6 fill-black" />
          <span>{currentRadioSong ? 'Shuffle & Restart Radio' : 'Start Radio'}</span>
        </button>
      </div>
    </div>
  );
}
