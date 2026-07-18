'use client';

import React, { useEffect, useState } from 'react';
import SongRow from '@/components/SongRow';
import { Song } from '@/store/playerStore';
import api from '@/services/api';
import { History, Music, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HistoryPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const [historyRes, playlistRes] = await Promise.all([
          api.get('/songs/history?limit=50'),
          api.get('/playlists'),
        ]);
        setSongs(historyRes.data);
        setPlaylists(playlistRes.data);
      } catch (err) {
        console.error('Failed to load listening history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 bg-white/5 rounded-3xl" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-white/5 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/10 via-white/5 to-bg-dark border border-white/5 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
        <div className="absolute inset-0 bg-white/5 blur-3xl opacity-50 pointer-events-none" />

        <div className="h-24 w-24 md:h-32 md:w-32 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
          <History className="h-12 w-12 md:h-16 md:w-16 text-white" />
        </div>

        <div className="text-center md:text-left space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Library</span>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">Listening History</h1>
          <p className="text-gray-400 text-sm mt-1">Recently streamed tracks on this device</p>
        </div>
      </div>

      {/* History Songs List */}
      {songs.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center text-gray-500 max-w-lg mx-auto mt-8">
          <History className="h-12 w-12 mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-white">No history yet</h3>
          <p className="text-sm mt-2">Songs you stream on Symphony will be listed here.</p>
          <Link href="/" className="inline-flex items-center gap-2 text-primary text-sm font-bold mt-6 hover:underline">
            <span>Go to dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {songs.map((song, idx) => (
            <SongRow
              key={`${song.id}-${idx}`}
              song={song}
              index={idx}
              queueContext={songs}
              playlists={playlists}
            />
          ))}
        </div>
      )}
    </div>
  );
}
