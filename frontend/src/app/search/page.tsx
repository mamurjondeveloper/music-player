'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SongRow from '@/components/SongRow';
import { Song } from '@/store/playerStore';
import api from '@/services/api';
import { Search, Loader2, Music, Disc } from 'lucide-react';
import Link from 'next/link';

interface Playlist {
  id: string;
  name: string;
  coverUrl: string | null;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [allPlaylists, setAllPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set());

  // Fetch all user playlists to support playlist adding options inside SongRow
  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const res = await api.get('/playlists');
        setAllPlaylists(res.data);
        const likedRes = await api.get('/songs/liked');
        setLikedSongIds(new Set(likedRes.data.map((s: Song) => s.id)));
      } catch (err) {
        console.error('Failed to load search contexts:', err);
      }
    };
    fetchPlaylists();
  }, []);

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSongs([]);
      setPlaylists([]);
      return;
    }
    setLoading(true);
    try {
      // Find matching songs
      const songRes = await api.get(`/songs/search?q=${encodeURIComponent(q)}`);
      setSongs(songRes.data);

      // Find matching playlists from the loaded user playlists locally
      const filteredPlaylists = allPlaylists.filter((p) =>
        p.name.toLowerCase().includes(q.toLowerCase()),
      );
      setPlaylists(filteredPlaylists);
    } catch (err) {
      console.error('Failed to fetch search results:', err);
    } finally {
      setLoading(false);
    }
  }, [allPlaylists]);

  // Debounced search trigger
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      handleSearch(query);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, handleSearch]);

  return (
    <div className="space-y-8 pb-12">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Search</h1>
        <p className="text-gray-400 text-sm mt-1">Find your uploaded songs, artists, or playlists</p>
      </div>

      {/* Glassmorphic Search Bar */}
      <div className="relative max-w-2xl">
        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
          {loading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Search className="h-5 w-5" />}
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you want to listen to?"
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-sm"
        />
      </div>

      {/* Results Section */}
      {query.trim() === '' ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
          <Search className="h-12 w-12 text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-white">Search catalog</h3>
          <p className="text-sm mt-1 max-w-xs">Type a title, artist, or playlist name above to start streaming.</p>
        </div>
      ) : songs.length === 0 && playlists.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500">
          <Music className="h-12 w-12 text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-white">No results found</h3>
          <p className="text-sm mt-1">We couldn&apos;t find any matches for &quot;{query}&quot;.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Matching Songs */}
          {songs.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-white mb-3">Matching Songs</h2>
              <div className="space-y-2">
                {songs.map((song, idx) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    index={idx}
                    queueContext={songs}
                    isLiked={likedSongIds.has(song.id)}
                    playlists={allPlaylists}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Matching Playlists */}
          {playlists.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-white mb-3">Playlists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {playlists.map((playlist) => (
                  <Link key={playlist.id} href={`/playlists/${playlist.id}`}>
                    <div className="glass-panel glass-panel-hover p-4 rounded-3xl cursor-pointer">
                      <div className="aspect-square w-full rounded-2xl bg-white/5 border border-white/10 overflow-hidden relative mb-3 flex items-center justify-center">
                        {playlist.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${playlist.coverUrl}`}
                            alt={playlist.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Disc className="h-12 w-12 text-gray-600" />
                        )}
                      </div>
                      <div className="font-bold text-sm text-white truncate">{playlist.name}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
