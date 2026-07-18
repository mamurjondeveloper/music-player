'use client';

import React, { useState } from 'react';
import { usePlayerStore, Song } from '@/store/playerStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, GripVertical, Play } from 'lucide-react';

export const QueueSidebar: React.FC = () => {
  const {
    queue,
    history,
    currentSong,
    isQueueOpen,
    toggleQueue,
    clearQueue,
    removeFromQueue,
    playSong,
    setQueue,
  } = usePlayerStore();

  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  if (!isQueueOpen) return null;

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4005';

  // Drag & Drop handlers
  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;

    const newQueue = [...queue];
    const [draggedItem] = newQueue.splice(draggedIdx, 1);
    newQueue.splice(idx, 0, draggedItem);
    setQueue(newQueue);
    setDraggedIdx(idx);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  return (
    <motion.aside
      initial={{ x: 350, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 350, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      className="hidden md:flex flex-col w-80 bg-zinc-950/80 border-l border-white/5 backdrop-blur-xl h-full z-20 overflow-hidden shrink-0 shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/5">
        <h3 className="text-md font-semibold tracking-wide text-white">Playing Queue</h3>
        <button
          onClick={toggleQueue}
          className="text-zinc-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs Selector */}
      <div className="flex px-4 py-3 gap-2 border-b border-white/5 bg-black/20">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all cursor-pointer ${
            activeTab === 'queue' ? 'bg-white/10 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Queue ({queue.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all cursor-pointer ${
            activeTab === 'history' ? 'bg-white/10 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          History ({history.length})
        </button>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {activeTab === 'queue' ? (
          <>
            {/* Active Playing Track Info */}
            {currentSong && (
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Now Playing</span>
                <div className="flex items-center gap-3 p-2 bg-green-500/5 border border-green-500/20 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 overflow-hidden shrink-0">
                    {currentSong.coverUrl ? (
                      <img
                        src={`${API_URL}${currentSong.coverUrl}`}
                        alt={currentSong.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-green-500">M</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-semibold text-green-400 truncate">{currentSong.title}</h5>
                    <p className="text-[10px] text-zinc-400 truncate">{currentSong.artist}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Queue List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Next In Queue</span>
                {queue.length > 0 && (
                  <button
                    onClick={clearQueue}
                    className="text-[10px] text-red-400 hover:text-red-300 font-semibold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>

              {queue.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-zinc-500">Queue is empty</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {queue.map((song, idx) => {
                    const isPlayingNow = currentSong?.id === song.id;
                    return (
                      <div
                        key={song.id}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-2.5 p-2 rounded-xl border border-white/5 transition-all group ${
                          isPlayingNow ? 'bg-white/5 border-white/10' : 'hover:bg-white/5'
                        }`}
                      >
                        {/* Drag Handle */}
                        <div className="cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 transition-colors">
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>

                        {/* Cover image */}
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 overflow-hidden relative shrink-0">
                          {song.coverUrl ? (
                            <img
                              src={`${API_URL}${song.coverUrl}`}
                              alt={song.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-white">
                              {song.title[0]}
                            </div>
                          )}
                          
                          {/* Play overlay */}
                          <div
                            onClick={() => playSong(song, queue)}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                          >
                            <Play className="w-3 h-3 text-white fill-white" />
                          </div>
                        </div>

                        {/* Title and artist */}
                        <div className="min-w-0 flex-1">
                          <h6 className={`text-xs font-semibold truncate ${isPlayingNow ? 'text-green-400' : 'text-white'}`}>
                            {song.title}
                          </h6>
                          <p className="text-[10px] text-zinc-400 truncate">{song.artist}</p>
                        </div>

                        {/* Delete from Queue Button */}
                        <button
                          onClick={() => removeFromQueue(song.id)}
                          className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-all p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          /* History List */
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Recently Played</span>
            {history.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-zinc-500">No playback history yet</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {history.map((song) => (
                  <div
                    key={song.id}
                    onClick={() => playSong(song)}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 overflow-hidden shrink-0">
                      {song.coverUrl ? (
                        <img
                          src={`${API_URL}${song.coverUrl}`}
                          alt={song.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-white">
                          {song.title[0]}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h6 className="text-xs font-semibold text-white truncate group-hover:text-green-400 transition-colors">
                        {song.title}
                      </h6>
                      <p className="text-[10px] text-zinc-400 truncate">{song.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.aside>
  );
};
