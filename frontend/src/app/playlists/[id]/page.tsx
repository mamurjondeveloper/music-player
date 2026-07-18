'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SongRow from '@/components/SongRow';
import { Song } from '@/store/playerStore';
import api from '@/services/api';
import { Disc, Play, Edit2, Trash2, Check, X, Loader2, GripVertical } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface PlaylistSong {
  song: Song;
}

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  userId: string;
  playlistSongs: PlaylistSong[];
}

export default function PlaylistDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuthStore();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);

  // Drag and drop states
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const fetchPlaylistDetails = async () => {
    try {
      const res = await api.get(`/playlists/${id}`);
      setPlaylist(res.data);
      setSongs(res.data.playlistSongs.map((ps: PlaylistSong) => ps.song));
      setEditName(res.data.name);
      setEditDesc(res.data.description || '');
    } catch (err) {
      console.error('Failed to load playlist:', err);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylistDetails();
  }, [id]);

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await api.put(`/playlists/${id}`, {
        name: editName,
        description: editDesc,
      });
      setPlaylist((prev) => (prev ? { ...prev, name: res.data.name, description: res.data.description } : null));
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update playlist:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!confirm('Are you sure you want to delete this playlist? This action cannot be undone.')) return;
    try {
      await api.delete(`/playlists/${id}`);
      router.push('/');
    } catch (err) {
      console.error('Failed to delete playlist:', err);
    }
  };

  const handleRemoveSong = async (songId: string) => {
    try {
      await api.delete(`/playlists/${id}/songs/${songId}`);
      setSongs(songs.filter((s) => s.id !== songId));
    } catch (err) {
      console.error('Failed to remove song from playlist:', err);
    }
  };

  // HTML5 Drag and Drop handlers for reordering songs
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const reorderedSongs = Array.from(songs);
    const draggedSong = reorderedSongs[draggedIndex];
    reorderedSongs.splice(draggedIndex, 1);
    reorderedSongs.splice(index, 0, draggedSong);

    setDraggedIndex(index);
    setSongs(reorderedSongs);
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);
    try {
      const songIds = songs.map((s) => s.id);
      await api.put(`/playlists/${id}/reorder`, { songIds });
    } catch (err) {
      console.error('Failed to save reordered playlist:', err);
      // Revert in case of backend sync error
      fetchPlaylistDetails();
    }
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

  if (!playlist) return null;

  return (
    <div className="space-y-8 pb-12">
      {/* Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-bg-dark border border-white/5 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
        <div className="absolute inset-0 bg-primary/5 blur-3xl opacity-40 pointer-events-none" />

        <div className="h-28 w-28 md:h-36 md:w-36 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg shrink-0 overflow-hidden">
          {playlist.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${playlist.coverUrl}`}
              alt={playlist.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <Disc className="h-14 w-14 text-gray-500" />
          )}
        </div>

        <div className="text-center md:text-left space-y-2 flex-1 min-w-0">
          <span className="text-[10px] uppercase font-bold tracking-widest text-primary">Playlist</span>

          {isEditing ? (
            <div className="space-y-2 max-w-md mx-auto md:mx-0">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white font-bold focus:outline-none focus:border-primary text-xl"
                placeholder="Playlist name"
                required
              />
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-gray-300 focus:outline-none focus:border-primary text-xs h-16 resize-none"
                placeholder="Playlist description (optional)"
              />
              <div className="flex gap-2 justify-center md:justify-start">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="px-3 py-1 bg-primary text-bg-dark rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>Save</span>
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 bg-white/10 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight truncate">
                {playlist.name}
              </h1>
              {playlist.description && (
                <p className="text-gray-400 text-sm max-w-xl truncate">{playlist.description}</p>
              )}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-gray-400 pt-1">
                <span>Created by Friend</span>
                <span>&bull;</span>
                <span>{songs.length} songs</span>
              </div>
            </>
          )}
        </div>

        {/* Action Controls */}
        {!isEditing && (
          <div className="flex md:flex-col gap-2 shrink-0">
            <button
              onClick={() => setIsEditing(true)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
            >
              <Edit2 className="h-4 w-4" />
              <span>Edit Details</span>
            </button>
            <button
              onClick={handleDeletePlaylist}
              className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 text-red-400 transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Playlist</span>
            </button>
          </div>
        )}
      </div>

      {/* Playlist Songs listing */}
      {songs.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center text-gray-500 max-w-lg mx-auto mt-8">
          <Disc className="h-12 w-12 mx-auto text-gray-600 mb-4 animate-[spin_8s_infinite_linear]" />
          <h3 className="text-lg font-semibold text-white">This playlist is empty</h3>
          <p className="text-sm mt-2">Find your favorite tracks and click the &quot;+&quot; icon to add them.</p>
          <button
            onClick={() => router.push('/search')}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-bg-dark font-bold text-sm px-4 py-2 rounded-xl mt-6 transition-colors cursor-pointer"
          >
            Search songs
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {songs.map((song, idx) => (
            <div
              key={`${song.id}-${idx}`}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-2 rounded-2xl transition-all ${
                draggedIndex === idx ? 'bg-white/10 opacity-50 scale-95 border-primary border' : 'border border-transparent'
              }`}
            >
              {/* Drag Handle */}
              <div
                className="hidden md:flex p-1 text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing"
                title="Drag to reorder"
              >
                <GripVertical className="h-4.5 w-4.5 shrink-0" />
              </div>

              {/* Row */}
              <div className="flex-1 min-w-0">
                <SongRow
                  song={song}
                  index={idx}
                  queueContext={songs}
                  onPlaylistRemove={() => handleRemoveSong(song.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
