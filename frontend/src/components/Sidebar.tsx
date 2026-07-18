'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { motion } from 'framer-motion';
import {
  Home,
  Search,
  Heart,
  Music,
  Plus,
  History,
  Upload,
  LogOut,
  ChevronRight,
  FolderHeart,
} from 'lucide-react';
import api from '@/services/api';

interface Playlist {
  id: string;
  name: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const res = await api.get('/playlists');
        setPlaylists(res.data);
      } catch (err) {
        console.error('Error fetching sidebar playlists:', err);
      }
    };
    if (user) {
      fetchPlaylists();
    }
  }, [pathname, user]);

  const links = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Search', href: '/search', icon: Search },
    { name: 'Liked Songs', href: '/liked', icon: Heart },
    { name: 'History', href: '/history', icon: History },
    { name: 'Upload Music', href: '/upload', icon: Upload },
  ];

  const handleCreatePlaylist = async () => {
    try {
      const name = `My Playlist #${playlists.length + 1}`;
      const res = await api.post('/playlists', { name });
      setPlaylists([res.data, ...playlists]);
    } catch (err) {
      console.error('Error creating playlist:', err);
    }
  };

  return (
    <div className="hidden md:flex w-64 flex-col bg-black border-r border-border-dark p-6 h-screen select-none shrink-0 relative z-20">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
          <Music className="h-5 w-5 text-primary" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">Symphony</span>
      </div>

      {/* Main Navigation Links */}
      <nav className="space-y-1 mb-8">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link key={link.href} href={link.href} className="block group">
              <div
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 relative ${
                  isActive
                    ? 'text-primary font-medium bg-white/5'
                    : 'text-gray-400 group-hover:text-white group-hover:bg-white/2'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className="h-5 w-5 shrink-0" />
                <span className="text-sm">{link.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Playlists Header */}
      <div className="flex items-center justify-between px-4 mb-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        <span>Playlists</span>
        <button
          onClick={handleCreatePlaylist}
          className="hover:text-white transition-colors cursor-pointer p-0.5 rounded-lg hover:bg-white/5"
          title="Create Playlist"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Playlists List */}
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-1 pr-2">
        {playlists.length === 0 ? (
          <div className="text-xs text-gray-500 px-4 py-3 italic">No playlists created</div>
        ) : (
          playlists.map((playlist) => (
            <Link key={playlist.id} href={`/playlists/${playlist.id}`} className="block group">
              <div
                className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm transition-all ${
                  pathname === `/playlists/${playlist.id}`
                    ? 'text-white font-medium bg-white/5'
                    : 'text-gray-400 group-hover:text-white group-hover:bg-white/2'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <FolderHeart className="h-4 w-4 shrink-0 text-gray-500 group-hover:text-primary transition-colors" />
                  <span className="truncate">{playlist.name}</span>
                </div>
                <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 text-gray-500 transition-all shrink-0" />
              </div>
            </Link>
          ))
        )}
      </div>

      {/* User Session Info / Profile */}
      {user && (
        <div className="border-t border-border-dark pt-4 mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20 shrink-0 text-sm font-bold text-primary">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">{user.username}</div>
              <div className="text-xs text-gray-400 truncate">Friend Session</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
            title="Log Out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
