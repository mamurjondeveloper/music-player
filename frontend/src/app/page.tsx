'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import SongRow from '../components/SongRow';
import { Song } from '../store/playerStore';
import api from '../services/api';
import { Play, Disc, Heart, FolderHeart, Music, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  _count?: { playlistSongs: number };
}

export default function HomePage() {
  const { user } = useAuthStore();
  const [recentPlayed, setRecentPlayed] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<Song[]>([]);
  const [trending, setTrending] = useState<Song[]>([]);
  const [likedSongIds, setLikedSongIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recentRes, playlistRes, addedRes, trendingRes, likedRes] = await Promise.all([
          api.get('/songs/history?limit=6'),
          api.get('/playlists'),
          api.get('/songs/recent?limit=8'),
          api.get('/songs/trending?limit=5'),
          api.get('/songs/liked'),
        ]);

        setRecentPlayed(recentRes.data);
        setPlaylists(playlistRes.data);
        setRecentlyAdded(addedRes.data);
        setTrending(trendingRes.data);

        const likedIds = new Set<string>(likedRes.data.map((s: Song) => s.id));
        setLikedSongIds(likedIds);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleSongDelete = async (songId: string) => {
    if (!confirm('Are you sure you want to delete this song from your library?')) return;
    try {
      await api.delete(`/songs/${songId}`);
      setRecentlyAdded(recentlyAdded.filter((s) => s.id !== songId));
      setTrending(trending.filter((s) => s.id !== songId));
      setRecentPlayed(recentPlayed.filter((s) => s.id !== songId));
    } catch (err) {
      console.error('Failed to delete song:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-64 bg-white/5 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 bg-white/5 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-6 w-48 bg-white/5 rounded-xl" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-white/5 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
          {getGreeting()},{' '}
          <span className="text-primary font-bold">
            {user?.username ? user.username.charAt(0).toUpperCase() + user.username.slice(1) : 'Friend'}
          </span>
        </h1>
        <p className="text-gray-400 text-sm mt-1">Ready for some good music?</p>
      </div>

      {/* Recently Played Quick Grid (6 items) */}
      {recentPlayed.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Recently Played</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {recentPlayed.map((song) => (
              <div
                key={song.id}
                className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-2xl p-3 hover:bg-white/10 transition-all cursor-pointer group"
              >
                <div className="h-14 w-14 rounded-xl bg-white/5 border border-white/10 overflow-hidden relative shrink-0">
                  {song.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${song.coverUrl}`}
                      alt={song.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      M
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white truncate">{song.title}</div>
                  <div className="text-xs text-gray-400 truncate">{song.artist}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Playlists Horizontal list */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4">Your Playlists</h2>
        {playlists.length === 0 ? (
          <div className="glass-panel p-8 rounded-3xl text-center text-gray-500">
            <FolderHeart className="h-10 w-10 mx-auto text-gray-600 mb-3" />
            <p className="text-sm">No playlists yet. Create one on the sidebar!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {playlists.map((playlist) => (
              <Link key={playlist.id} href={`/playlists/${playlist.id}`}>
                <div className="glass-panel glass-panel-hover p-4 rounded-3xl flex flex-col h-full select-none cursor-pointer">
                  <div className="aspect-square w-full rounded-2xl bg-white/5 border border-white/10 overflow-hidden relative mb-4 flex items-center justify-center">
                    {playlist.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${playlist.coverUrl}`}
                        alt={playlist.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Disc className="h-16 w-16 text-gray-600" />
                    )}
                  </div>
                  <div className="font-bold text-sm text-white truncate">{playlist.name}</div>
                  <div className="text-xs text-gray-400 mt-1 truncate">
                    {playlist._count?.playlistSongs || 0} songs
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Two columns: Recently Added & Trending */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recently Added (2 columns wide) */}
        <section className="lg:col-span-2">
          <h2 className="text-xl font-bold text-white mb-4">Recently Added</h2>
          {recentlyAdded.length === 0 ? (
            <div className="glass-panel p-8 rounded-3xl text-center text-gray-500">
              <Music className="h-10 w-10 mx-auto text-gray-600 mb-3 animate-[pulse_2s_infinite]" />
              <p className="text-sm">No songs in your library. Upload some to get started!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentlyAdded.map((song, idx) => (
                <SongRow
                  key={song.id}
                  song={song}
                  index={idx}
                  queueContext={recentlyAdded}
                  isLiked={likedSongIds.has(song.id)}
                  onDelete={() => handleSongDelete(song.id)}
                  playlists={playlists}
                />
              ))}
            </div>
          )}
        </section>

        {/* Trending (1 column wide) */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Trending</h2>
          {trending.length === 0 ? (
            <div className="glass-panel p-8 rounded-3xl text-center text-gray-500">
              <p className="text-sm">Listen to songs to see trending charts.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {trending.map((song, idx) => (
                <div
                  key={song.id}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all group cursor-pointer"
                >
                  <span className="text-lg font-black text-gray-600 w-6 text-center">
                    {idx + 1}
                  </span>
                  <div className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 overflow-hidden relative shrink-0">
                    {song.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${song.coverUrl}`}
                        alt={song.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        M
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white truncate">{song.title}</div>
                    <div className="text-xs text-gray-400 truncate">{song.artist}</div>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0 font-medium">
                    {song.playCount} plays
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
