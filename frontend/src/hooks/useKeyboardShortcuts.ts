import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';

export default function useKeyboardShortcuts() {
  const {
    togglePlay,
    playNext,
    playPrevious,
    volume,
    setVolume,
    toggleLoop,
    toggleShuffle,
    currentSong,
  } = usePlayerStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (activeElement) {
        const tagName = activeElement.tagName.toLowerCase();
        if (
          tagName === 'input' ||
          tagName === 'textarea' ||
          activeElement.hasAttribute('contenteditable')
        ) {
          return;
        }
      }

      if (!currentSong) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          if (e.ctrlKey || e.metaKey || e.altKey) {
            e.preventDefault();
            playNext();
          }
          break;
        case 'ArrowLeft':
          if (e.ctrlKey || e.metaKey || e.altKey) {
            e.preventDefault();
            playPrevious();
          }
          break;
        case 'ArrowUp':
          if (e.ctrlKey || e.metaKey || e.altKey) {
            e.preventDefault();
            setVolume(Math.min(1, volume + 0.05));
          }
          break;
        case 'ArrowDown':
          if (e.ctrlKey || e.metaKey || e.altKey) {
            e.preventDefault();
            setVolume(Math.max(0, volume - 0.05));
          }
          break;
        case 'KeyL':
          e.preventDefault();
          toggleLoop();
          break;
        case 'KeyS':
          e.preventDefault();
          toggleShuffle();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    togglePlay,
    playNext,
    playPrevious,
    volume,
    setVolume,
    toggleLoop,
    toggleShuffle,
    currentSong,
  ]);
}
