'use client';

import React, { useEffect, useState } from 'react';
import SongRow from '@/components/SongRow';
import { Song } from '@/store/playerStore';
import api from '@/services/api';
import { Heart, Play, Music, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';

export default function LikedSongsPage() {
  const { user } = useAuthStore();
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLikedSongs = async () => {
    try {
      const [likedRes, playlistRes] = await Promise.all([
        api.get('/songs/liked'),
        api.get('/playlists'),
      ]);
      setSongs(likedRes.data);
      setPlaylists(playlistRes.data);
    } catch (err) {
      console.error('Failed to load liked songs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLikedSongs();
  }, []);

  const handlePlaylistRefresh = () => {
    fetchLikedSongs();
  };

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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-bg-dark border border-white/5 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
        <div className="absolute inset-0 bg-primary/5 blur-3xl opacity-50 pointer-events-none" />

        <div className="h-24 w-24 md:h-32 md:w-32 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
          <Heart className="h-12 w-12 md:h-16 md:w-16 fill-bg-dark text-bg-dark" />
        </div>

        <div className="text-center md:text-left space-y-1">
          <span className="text-[10px] uppercase font-extrabold tracking-widest text-primary">Playlist</span>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">Liked Songs</h1>
          <p className="text-gray-400 text-sm mt-1">
            {user?.username ? user.username : 'You'} &bull; {songs.length} songs
          </p>
        </div>
      </div>

      {/* Songs List */}
      {songs.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center text-gray-500 max-w-lg mx-auto mt-8">
          <Heart className="h-12 w-12 mx-auto text-gray-600 mb-4 animate-[pulse_1.5s_infinite]" />
          <h3 className="text-lg font-semibold text-white">No liked songs yet</h3>
          <p className="text-sm mt-2">Songs you like while listening will show up in this space.</p>
          <Link href="/search" className="inline-flex items-center gap-2 text-primary text-sm font-bold mt-6 hover:underline">
            <span>Explore songs</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {songs.map((song, idx) => (
            <SongRow
              key={song.id}
              song={song}
              index={idx}
              queueContext={songs}
              isLiked={true}
              playlists={playlists}
              onDelete={handlePlaylistRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
