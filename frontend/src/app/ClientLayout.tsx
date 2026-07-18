'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';
import { Loader2 } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import BottomPlayer from '../components/BottomPlayer';
import MobileNav from '../components/MobileNav';
import { QueueSidebar } from '../components/QueueSidebar';
import { ToastContainer } from '../components/ui/Toast';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isInitialized, initialize } = useAuthStore();

  useKeyboardShortcuts();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (isInitialized && !isAuthenticated && !isLoginPage) {
      router.push('/login');
    }
  }, [isInitialized, isAuthenticated, isLoginPage, router]);

  if (!isInitialized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg-dark text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Render Login page with no sidebar/player wrapper
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Render loading state while redirecting
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg-dark text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-bg-dark text-foreground overflow-hidden md:flex-row">
      {/* Desktop Sidebar (Left) */}
      <Sidebar />

      {/* Main Content Area (Center) */}
      <div className="flex flex-1 flex-col overflow-hidden pb-24 md:pb-24">
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 no-scrollbar">
          {children}
        </main>
      </div>

      {/* Desktop Queue Sidebar (Right) */}
      <QueueSidebar />

      {/* Global Toast Notifications */}
      <ToastContainer />

      {/* Sticky Music Player (Bottom) */}
      <BottomPlayer />

      {/* Mobile Bottom Navigation (Visible on small screens) */}
      <MobileNav />
    </div>
  );
}
