'use client';

import React, { useEffect, useState } from 'react';
import { usePlayerStore, Song } from '@/store/playerStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Maximize2,
  ChevronDown,
  Gauge,
  ListMusic,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function formatTime(seconds: number) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function BottomPlayer() {
  const {
    currentSong,
    isPlaying,
    duration,
    currentTime,
    volume,
    playbackSpeed,
    isShuffle,
    isLoop,
    isQueueOpen,
    isRadioMode,
    init,
    togglePlay,
    playNext,
    playPrevious,
    seek,
    setVolume,
    setPlaybackSpeed,
    toggleShuffle,
    toggleLoop,
    toggleQueue,
  } = usePlayerStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.8);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  if (!currentSong) return null;

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering mobile expand when clicking play/pause
    togglePlay();
  };

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMuted) {
      setVolume(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <>
      {/* ========================================== */}
      {/* DESKTOP PLAYER & MOBILE MINI PLAYER SHELL */}
      {/* ========================================== */}
      <div
        onClick={() => !isExpanded && setIsExpanded(true)}
        className={`fixed bottom-16 md:bottom-0 left-0 md:left-64 right-0 h-20 md:h-24 bg-black/90 backdrop-blur-xl border-t border-border-dark flex items-center justify-between px-4 md:px-8 z-30 select-none cursor-pointer md:cursor-default transition-[right] duration-200 ${
          isQueueOpen ? 'md:right-80' : 'md:right-0'
        }`}
      >
        {/* Left Section: Song details */}
        <div className="flex items-center gap-3 w-1/3 min-w-0">
          <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl bg-white/5 border border-white/10 overflow-hidden relative shrink-0">
            {currentSong.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${API_URL}${currentSong.coverUrl}`}
                alt={currentSong.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                M
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate hover:underline cursor-pointer">
              {currentSong.title}
            </div>
            <div className="text-xs text-gray-400 truncate hover:text-white cursor-pointer">
              {currentSong.artist}
            </div>
          </div>
        </div>

        {/* Center Section: Playback controls & Progress bar (Desktop) */}
        <div className="hidden md:flex flex-col items-center w-1/3 max-w-xl">
          <div className="flex items-center gap-6 mb-2">
            {!isRadioMode && (
              <button
                onClick={toggleShuffle}
                className={`p-1 transition-colors cursor-pointer ${
                  isShuffle ? 'text-primary' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Shuffle className="h-5 w-5" />
              </button>
            )}
            {!isRadioMode && (
              <button onClick={playPrevious} className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer">
                <SkipBack className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={handlePlayPause}
              className="h-10 w-10 rounded-full bg-primary hover:bg-primary-hover text-bg-dark flex items-center justify-center shadow-md shadow-primary/20 hover:scale-105 transition-all cursor-pointer"
            >
              {isPlaying ? <Pause className="h-5 w-5 fill-bg-dark" /> : <Play className="h-5 w-5 fill-bg-dark ml-0.5" />}
            </button>
            {!isRadioMode && (
              <button onClick={playNext} className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer">
                <SkipForward className="h-5 w-5" />
              </button>
            )}
            {!isRadioMode && (
              <button
                onClick={toggleLoop}
                className={`p-1 transition-colors cursor-pointer relative ${
                  isLoop !== 'none' ? 'text-primary' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Repeat className="h-5 w-5" />
                {isLoop === 'one' && (
                  <span className="absolute top-0 -right-1 text-[8px] bg-primary text-bg-dark rounded-full px-0.5 font-bold scale-90">
                    1
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Seek bar */}
          <div className="flex items-center gap-3 w-full text-xs text-gray-400">
            <span className="w-8 text-right">{formatTime(currentTime)}</span>
            <div className="relative flex-1 group py-1.5 cursor-pointer">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => seek(parseFloat(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="w-full h-1 bg-white/10 rounded-full appearance-none outline-none accent-primary cursor-pointer group-hover:h-1.5 transition-all"
              />
            </div>
            <span className="w-8 text-left">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right Section: Volume & Playback Speed (Desktop) */}
        <div className="hidden md:flex items-center justify-end gap-4 w-1/3 relative">
          {/* Queue Toggle Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleQueue();
            }}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isQueueOpen
                ? 'bg-primary/10 border-primary/20 text-primary'
                : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
            }`}
            title="Queue"
          >
            <ListMusic className="h-4 w-4" />
          </button>

          {/* Playback speed trigger */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSpeedMenu(!showSpeedMenu);
              }}
              className="p-2 text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold rounded-xl bg-white/5 border border-white/5"
            >
              <Gauge className="h-4 w-4" />
              <span>{playbackSpeed}x</span>
            </button>

            <AnimatePresence>
              {showSpeedMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-12 right-0 bg-surface-dark border border-border-dark rounded-xl p-1 shadow-2xl z-40 w-24"
                >
                  {speeds.map((speed) => (
                    <button
                      key={speed}
                      onClick={() => {
                        setPlaybackSpeed(speed);
                        setShowSpeedMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                        playbackSpeed === speed
                          ? 'bg-primary text-bg-dark font-bold'
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Volume control */}
          <div className="flex items-center gap-2 group">
            <button onClick={handleMuteToggle} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
              {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-24 h-1 bg-white/10 rounded-full appearance-none outline-none accent-primary cursor-pointer group-hover:h-1.5 transition-all"
            />
          </div>
        </div>

        {/* Mobile controls (Mini Player view) */}
        <div className="flex md:hidden items-center gap-3">
          <button
            onClick={handlePlayPause}
            className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shadow-md shadow-primary/20 cursor-pointer"
          >
            {isPlaying ? <Pause className="h-5 w-5 fill-bg-dark text-bg-dark" /> : <Play className="h-5 w-5 fill-bg-dark text-bg-dark ml-0.5" />}
          </button>
          {!isRadioMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                playNext();
              }}
              className="p-1 text-gray-400 hover:text-white cursor-pointer"
            >
              <SkipForward className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Mobile progress line at bottom of mini player */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* ========================================== */}
      {/* MOBILE FULL SCREEN SWIPE-UP/EXPANDED VIEW */}
      {/* ========================================== */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-0 bg-bg-dark z-50 flex flex-col px-6 py-8 md:hidden"
          >
            {/* Expanded Header */}
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-white cursor-pointer"
              >
                <ChevronDown className="h-6 w-6" />
              </button>
              <span className="text-xs uppercase font-bold tracking-widest text-gray-400">Now Playing</span>
              <div className="w-10 h-10" /> {/* Spacer */}
            </div>

            {/* Song Cover Art (Large) */}
            <div className="flex-1 flex flex-col justify-center items-center">
              <div className="w-72 h-72 rounded-3xl bg-white/5 border border-white/10 overflow-hidden shadow-2xl relative mb-8">
                {currentSong.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${API_URL}${currentSong.coverUrl}`}
                    alt={currentSong.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-primary/20 flex items-center justify-center text-primary text-5xl font-bold">
                    M
                  </div>
                )}
              </div>

              {/* Title & Artist */}
              <div className="text-center w-full max-w-xs mb-8">
                <h3 className="text-2xl font-bold text-white truncate">{currentSong.title}</h3>
                <p className="text-base text-gray-400 mt-1.5 truncate">{currentSong.artist}</p>
              </div>

              {/* Seek Slider */}
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => seek(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none outline-none accent-primary cursor-pointer"
                />
              </div>
            </div>

            {/* Playback Controls (Bottom) */}
            <div className="pb-12 pt-6 flex flex-col items-center gap-6">
              <div className="flex items-center justify-between w-full max-w-xs">
                {!isRadioMode && (
                  <button
                    onClick={toggleShuffle}
                    className={`p-2 transition-colors cursor-pointer ${
                      isShuffle ? 'text-primary' : 'text-gray-400'
                    }`}
                  >
                    <Shuffle className="h-6 w-6" />
                  </button>
                )}

                {!isRadioMode && (
                  <button onClick={playPrevious} className="p-2 text-white cursor-pointer">
                    <SkipBack className="h-7 w-7" />
                  </button>
                )}

                <button
                  onClick={togglePlay}
                  className="h-16 w-16 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/20 scale-110 active:scale-95 transition-all cursor-pointer"
                >
                  {isPlaying ? <Pause className="h-8 w-8 text-bg-dark fill-bg-dark" /> : <Play className="h-8 w-8 text-bg-dark fill-bg-dark ml-1" />}
                </button>

                {!isRadioMode && (
                  <button onClick={playNext} className="p-2 text-white cursor-pointer">
                    <SkipForward className="h-7 w-7" />
                  </button>
                )}

                {!isRadioMode && (
                  <button
                    onClick={toggleLoop}
                    className={`p-2 transition-colors cursor-pointer relative ${
                      isLoop !== 'none' ? 'text-primary' : 'text-gray-400'
                    }`}
                  >
                    <Repeat className="h-6 w-6" />
                    {isLoop === 'one' && (
                      <span className="absolute top-1 -right-0 text-[8px] bg-primary text-bg-dark rounded-full px-0.5 font-bold scale-90">
                        1
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Volume Slider for mobile inside full page */}
              <div className="flex items-center gap-3 w-full max-w-xs text-gray-400 mt-4">
                <button onClick={handleMuteToggle}>
                  {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    if (isMuted) setIsMuted(false);
                  }}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none outline-none accent-primary cursor-pointer"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
