'use client';

import React from 'react';
import { Play } from 'lucide-react';

export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  createdAt: string;
}

interface PlaylistCardProps {
  playlist: Playlist;
  onClick: (id: string) => void;
  onPlay?: (e: React.MouseEvent, playlist: Playlist) => void;
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({
  playlist,
  onClick,
  onPlay,
}) => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4005';
  const coverImage = playlist.coverUrl ? `${API_URL}${playlist.coverUrl}` : '/vercel.svg';

  return (
    <div
      onClick={() => onClick(playlist.id)}
      className="group relative bg-zinc-900/40 border border-white/5 hover:bg-zinc-900/80 hover:border-white/10 p-4 rounded-2xl transition-all duration-300 shadow-lg shadow-black/10 select-none cursor-pointer"
    >
      {/* Cover Art Wrapper */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-950 mb-3.5 shadow-md">
        {playlist.coverUrl ? (
          <img
            src={coverImage}
            alt={playlist.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
            <span className="text-zinc-500 text-3xl font-bold uppercase select-none">
              {playlist.name.slice(0, 2)}
            </span>
          </div>
        )}

        {/* Hover Play Overlay */}
        {onPlay && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-end justify-end p-3.5 transition-all duration-300 backdrop-blur-[1px]">
            <button
              onClick={(e) => onPlay(e, playlist)}
              className="bg-green-500 hover:bg-green-400 text-black p-3 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer"
            >
              <Play className="w-4.5 h-4.5 fill-black" />
            </button>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-col gap-0.5">
        <h4 className="text-sm font-semibold tracking-wide truncate text-white">
          {playlist.name}
        </h4>
        <p className="text-xs text-zinc-400 truncate leading-normal">
          {playlist.description || 'Playlist'}
        </p>
      </div>
    </div>
  );
};
