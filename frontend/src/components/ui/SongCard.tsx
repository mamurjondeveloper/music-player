'use client';

import React from 'react';
import { Play, Pause } from 'lucide-react';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  audioUrl: string;
  coverUrl: string | null;
  playCount: number;
  sourceType: string;
  youtubeId?: string | null;
}

interface SongCardProps {
  song: Song;
  onPlay: (song: Song) => void;
  isActive?: boolean;
  isPlaying?: boolean;
}

export const SongCard: React.FC<SongCardProps> = ({
  song,
  onPlay,
  isActive = false,
  isPlaying = false,
}) => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4005';
  const coverImage = song.coverUrl ? `${API_URL}${song.coverUrl}` : '/vercel.svg'; // fallback default

  return (
    <div className="group relative bg-zinc-900/40 border border-white/5 hover:bg-zinc-900/80 hover:border-white/10 p-4 rounded-2xl transition-all duration-300 shadow-lg shadow-black/10 select-none">
      {/* Cover Art Wrapper */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-950 mb-3.5 shadow-md">
        {song.coverUrl ? (
          <img
            src={coverImage}
            alt={song.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
            <span className="text-zinc-500 text-3xl font-bold uppercase select-none">
              {song.title.slice(0, 2)}
            </span>
          </div>
        )}

        {/* Hover Play Button Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-[2px]">
          <button
            onClick={() => onPlay(song)}
            className="bg-green-500 hover:bg-green-400 text-black p-3.5 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer"
          >
            {isActive && isPlaying ? (
              <Pause className="w-5 h-5 fill-black" />
            ) : (
              <Play className="w-5 h-5 fill-black" />
            )}
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-col gap-0.5">
        <h4 className={`text-sm font-semibold tracking-wide truncate ${isActive ? 'text-green-400 font-bold' : 'text-white'}`}>
          {song.title}
        </h4>
        <p className="text-xs text-zinc-400 truncate">
          {song.artist}
        </p>
      </div>
    </div>
  );
};
