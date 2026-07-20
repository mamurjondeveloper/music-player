'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, Music, FileAudio, CheckCircle, AlertCircle, Loader2, Link } from 'lucide-react';
import api from '@/services/api';
import { useToastStore } from '@/store/toastStore';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadItem {
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  errorMsg?: string;
}

interface YoutubeImportItem {
  id?: string;
  url: string;
  title: string;
  status: 'pending' | 'importing' | 'completed' | 'failed';
  error?: string;
}

export default function UploadPage() {
  const showToast = useToastStore((state) => state.showToast);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // YouTube Importer States
  const [ytUrl, setYtUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [youtubeImports, setYoutubeImports] = useState<YoutubeImportItem[]>([]);

  // Poll YouTube background imports status
  React.useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await api.get('/songs/import-status');
        setYoutubeImports(response.data);
      } catch (err) {}
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000); // poll every 3 seconds

    return () => clearInterval(interval);
  }, []);

  // Local File Upload Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (selectedFiles: File[]) => {
    const validExtensions = ['.mp3', '.wav', '.flac'];
    const newItems: { file: File; name: string; size: number }[] = [];

    selectedFiles.forEach((file) => {
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (validExtensions.includes(ext)) {
        newItems.push({
          file,
          name: file.name,
          size: file.size,
        });
      } else {
        showToast(`Unsupported format: ${file.name}. Supported: MP3, WAV, FLAC`, 'error');
      }
    });

    if (newItems.length === 0) return;

    const addedUploads = newItems.map((item) => ({
      name: item.name,
      size: item.size,
      progress: 0,
      status: 'pending' as const,
    }));

    setUploads((prev) => [...prev, ...addedUploads]);

    newItems.forEach((item, index) => {
      uploadFile(item.file, uploads.length + index);
    });
  };

  const uploadFile = async (file: File, indexOffset: number) => {
    const formData = new FormData();
    formData.append('file', file);

    setUploads((prev) => {
      const copy = [...prev];
      if (copy[indexOffset]) {
        copy[indexOffset].status = 'uploading';
      }
      return copy;
    });

    try {
      await api.post('/songs/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || file.size;
          const percent = Math.round((progressEvent.loaded * 100) / total);
          setUploads((prev) => {
            const copy = [...prev];
            if (copy[indexOffset]) {
              copy[indexOffset].progress = percent;
            }
            return copy;
          });
        },
      });

      setUploads((prev) => {
        const copy = [...prev];
        if (copy[indexOffset]) {
          copy[indexOffset].status = 'completed';
          copy[indexOffset].progress = 100;
        }
        return copy;
      });
      showToast(`Uploaded "${file.name}" successfully!`, 'success');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Upload failed.';
      setUploads((prev) => {
        const copy = [...prev];
        if (copy[indexOffset]) {
          copy[indexOffset].status = 'failed';
          copy[indexOffset].errorMsg = errMsg;
        }
        return copy;
      });
      showToast(errMsg, 'error');
    }
  };

  // YouTube Downloader Handlers
  const handleYoutubeImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ytUrl.trim()) return;

    const url = ytUrl.trim();
    setYtUrl('');
    setIsImporting(true);

    try {
      const response = await api.post('/songs/youtube', { url });
      
      if (response.data.status === 'completed') {
        if (response.data.alreadyExists) {
          showToast(`"${response.data.song.title}" already exists in library!`, 'warning');
        } else {
          showToast(`"${response.data.song.title}" successfully imported!`, 'success');
        }
      } else {
        showToast('YouTube link added to background download queue!', 'success');
      }

      // Fetch status immediately to show the queued item
      const statusRes = await api.get('/songs/import-status');
      setYoutubeImports(statusRes.data);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'YouTube import failed.';
      showToast(errMsg, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Add Music</h1>
        <p className="text-zinc-400 text-sm mt-1">Ingest audio files locally or import directly from YouTube</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Side: Local File Upload */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-primary" /> Upload Local Files
          </h2>
          
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`bg-zinc-900/40 border-2 border-dashed p-10 rounded-3xl text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-60 select-none ${
              isDragActive
                ? 'border-primary bg-primary/5 shadow-[0_0_30px_rgba(34,197,94,0.1)]'
                : 'border-white/10 hover:border-white/20 hover:bg-white/1'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept=".mp3,.wav,.flac"
              className="hidden"
            />

            <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mb-4 text-gray-400 group-hover:text-white transition-colors">
              <UploadCloud className="h-8 w-8 text-primary" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1.5">Drag and drop audio files here</h3>
            <p className="text-sm text-gray-400 max-w-xs mb-3">Or click to browse files from your computer</p>
            <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
              MP3, WAV, or FLAC up to 100MB
            </span>
          </div>

          {/* Uploads Progress List */}
          {uploads.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-400">Upload Queue</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto no-scrollbar">
                <AnimatePresence>
                  {uploads.map((item, idx) => (
                    <motion.div
                      key={`${item.name}-${idx}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="bg-zinc-900/40 border border-white/5 backdrop-blur-xl p-4 rounded-2xl flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-10 w-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shrink-0">
                          <FileAudio className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-white truncate">{item.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{formatSize(item.size)}</div>

                          {item.status === 'uploading' && (
                            <div className="w-full bg-white/5 rounded-full h-1 mt-2 overflow-hidden">
                              <div
                                className="bg-primary h-full rounded-full transition-all duration-300"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {item.status === 'uploading' && (
                          <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>{item.progress}%</span>
                          </div>
                        )}
                        {item.status === 'completed' && (
                          <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                            <CheckCircle className="h-4 w-4 text-primary" />
                            <span>Ready</span>
                          </div>
                        )}
                        {item.status === 'failed' && (
                          <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold" title={item.errorMsg}>
                            <AlertCircle className="h-4 w-4 text-red-400" />
                            <span>Failed</span>
                          </div>
                        )}
                        {item.status === 'pending' && (
                          <span className="text-xs text-gray-500">Queued</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: YouTube Importer */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Link className="w-5 h-5 text-primary" /> Import from YouTube
          </h2>
          
          <form onSubmit={handleYoutubeImport} className="flex flex-col gap-3 p-6 border border-white/5 rounded-3xl bg-zinc-900/40 backdrop-blur-xl">
            <p className="text-xs text-zinc-400 leading-normal">
              Paste any YouTube video URL. Symphony will automatically download the audio stream, convert it to high-quality MP3 format, and download the highest resolution thumbnail as cover art.
            </p>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                className="flex-1 bg-zinc-950/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-green-500/80 focus:ring-1 focus:ring-green-500/80 transition-all duration-200"
              />
              <button
                type="submit"
                disabled={isImporting || !ytUrl.trim()}
                className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold px-5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-green-500/10 hover:scale-[1.02] active:scale-95 text-sm shrink-0"
              >
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}
              </button>
            </div>
          </form>

          {/* YouTube Imports List */}
          {youtubeImports.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold tracking-wider uppercase text-zinc-400">Import Queue</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto no-scrollbar">
                <AnimatePresence>
                  {youtubeImports.map((item, idx) => (
                    <motion.div
                      key={`${item.url}-${idx}`}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-xl flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-10 w-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center shrink-0">
                          <Music className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-white truncate">{item.title}</div>
                          <div className="text-[10px] text-zinc-500 truncate mt-0.5">{item.url}</div>
                          {item.status === 'failed' && item.error && (
                            <div className="text-[11px] text-red-400/90 mt-1 line-clamp-2">{item.error}</div>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {item.status === 'pending' && (
                          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-semibold animate-pulse">
                            <Loader2 className="h-4 w-4 animate-spin opacity-60" />
                            <span>Queued...</span>
                          </div>
                        )}
                        {item.status === 'importing' && (
                          <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Importing...</span>
                          </div>
                        )}
                        {item.status === 'completed' && (
                          <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                            <CheckCircle className="h-4 w-4 text-primary" />
                            <span>Success</span>
                          </div>
                        )}
                        {item.status === 'failed' && (
                          <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold" title={item.error}>
                            <AlertCircle className="h-4 w-4 text-red-400" />
                            <span>Failed</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
