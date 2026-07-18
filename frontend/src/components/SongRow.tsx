'use client';

import React, { useState } from 'react';
import { usePlayerStore, Song } from '../store/playerStore';
import { Play, Pause, Heart, Trash2, Plus, Clock } from 'lucide-react';
import api from '../services/api';

interface SongRowProps {
  song: Song;
  index: number;
  queueContext: Song[];
  isLiked?: boolean;
  onDelete?: () => void;
  onPlaylistRemove?: () => void;
  playlists?: { id: string; name: string }[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function formatTime(seconds: number) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function SongRow({
  song,
  index,
  queueContext,
  isLiked = false,
  onDelete,
  onPlaylistRemove,
  playlists = [],
}: SongRowProps) {
  const { currentSong, isPlaying, playSong } = usePlayerStore();
  const [liked, setLiked] = useState(isLiked);
  const [showPlaylists, setShowPlaylists] = useState(false);

  const isCurrent = currentSong?.id === song.id;

  const handleRowClick = () => {
    playSong(song, queueContext);
  };

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Optimistic UI update
    setLiked(!liked);
    try {
      await api.post(`/songs/${song.id}/like`);
    } catch (err) {
      // Revert if request fails
      setLiked(liked);
      console.error('Error toggling like:', err);
    }
  };

  const handleAddToPlaylist = async (playlistId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.post(`/playlists/${playlistId}/songs`, { songId: song.id });
      setShowPlaylists(false);
      alert('Song added to playlist!');
    } catch (err) {
      console.error('Error adding song to playlist:', err);
    }
  };

  return (
    <div
      onClick={handleRowClick}
      className={`flex items-center justify-between px-4 py-3 rounded-2xl hover:bg-white/5 transition-all group select-none cursor-pointer ${
        isCurrent ? 'bg-white/5 border border-primary/20 shadow-[0_0_15px_rgba(34,197,94,0.05)]' : 'border border-transparent'
      }`}
    >
      {/* Left Column: Number/Play icon and Song Art */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Play/Pause state overlay */}
        <div className="w-8 flex items-center justify-center shrink-0">
          <span className="text-sm font-semibold text-gray-500 group-hover:hidden">
            {isCurrent && isPlaying ? (
              <span className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 bg-primary animate-[bounce_0.8s_infinite]" style={{ animationDelay: '0.1s' }} />
                <span className="w-0.5 bg-primary animate-[bounce_0.8s_infinite]" style={{ animationDelay: '0.3s' }} />
                <span className="w-0.5 bg-primary animate-[bounce_0.8s_infinite]" style={{ animationDelay: '0.5s' }} />
              </span>
            ) : (
              index + 1
            )}
          </span>
          <button className="hidden group-hover:flex text-white hover:text-primary transition-colors">
            {isCurrent && isPlaying ? (
              <Pause className="h-5 w-5 fill-white text-white" />
            ) : (
              <Play className="h-5 w-5 fill-white text-white" />
            )}
          </button>
        </div>

        {/* Cover Art */}
        <div className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 overflow-hidden shrink-0 relative">
          {song.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`${API_URL}${song.coverUrl}`} alt={song.title} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              M
            </div>
          )}
        </div>

        {/* Title / Artist details */}
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-semibold truncate ${isCurrent ? 'text-primary' : 'text-white'}`}>
            {song.title}
          </div>
          <div className="text-xs text-gray-400 truncate group-hover:text-gray-300">
            {song.artist}
          </div>
        </div>
      </div>

      {/* Middle Column: Album Name (Desktop) */}
      <div className="hidden md:block text-sm text-gray-400 truncate w-48 px-4">
        {song.album}
      </div>

      {/* Right Column: Actions & Duration */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Heart icon */}
        <button
          onClick={handleLikeClick}
          className={`p-1.5 rounded-lg hover:bg-white/5 transition-all cursor-pointer ${
            liked ? 'text-primary' : 'text-gray-500 hover:text-white'
          }`}
        >
          <Heart className={`h-4.5 w-4.5 ${liked ? 'fill-primary' : ''}`} />
        </button>

        {/* Plus Playlist dropdown */}
        {playlists.length > 0 && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPlaylists(!showPlaylists);
              }}
              className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-all cursor-pointer"
              title="Add to Playlist"
            >
              <Plus className="h-4.5 w-4.5" />
            </button>

            {showPlaylists && (
              <div className="absolute right-0 bottom-8 bg-surface-dark border border-border-dark rounded-xl p-1 shadow-2xl z-40 w-48 max-h-40 overflow-y-auto no-scrollbar">
                <div className="text-[10px] uppercase font-bold text-gray-500 px-3 py-1.5">Add to playlist</div>
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={(e) => handleAddToPlaylist(playlist.id, e)}
                    className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-white/5 text-gray-300 hover:text-white truncate transition-colors cursor-pointer"
                  >
                    {playlist.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Playlist Remove vs Library Delete */}
        {onPlaylistRemove ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlaylistRemove();
            }}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all cursor-pointer"
            title="Remove from Playlist"
          >
            <Trash2 className="h-4.5 w-4.5" />
          </button>
        ) : (
          onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
              title="Delete Song"
            >
              <Trash2 className="h-4.5 w-4.5" />
            </button>
          )
        )}

        {/* Duration */}
        <span className="text-xs text-gray-400 w-10 text-right flex items-center justify-end gap-1">
          <Clock className="h-3.5 w-3.5 md:hidden text-gray-500" />
          {formatTime(song.duration)}
        </span>
      </div>
    </div>
  );
}
