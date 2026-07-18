'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, Music, FileAudio, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import api from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadItem {
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  errorMsg?: string;
}

export default function UploadPage() {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        alert(`Unsupported file format: ${file.name}. Supported formats: MP3, WAV, FLAC`);
      }
    });

    if (newItems.length === 0) return;

    // Add to uploads state
    const addedUploads = newItems.map((item) => ({
      name: item.name,
      size: item.size,
      progress: 0,
      status: 'pending' as const,
    }));

    setUploads((prev) => [...prev, ...addedUploads]);

    // Start upload process sequentially
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
    }
  };

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Upload Music</h1>
        <p className="text-gray-400 text-sm mt-1">Upload high fidelity MP3, WAV, or FLAC audio files</p>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`glass-panel border-2 border-dashed p-10 rounded-3xl text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-60 select-none ${
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
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Upload Queue</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto no-scrollbar pr-2">
            <AnimatePresence>
              {uploads.map((item, idx) => (
                <motion.div
                  key={`${item.name}-${idx}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="glass-panel p-4 rounded-2xl flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shrink-0">
                      <FileAudio className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white truncate">{item.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{formatSize(item.size)}</div>

                      {/* Progress bar inside upload item */}
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

                  {/* Status Indicator */}
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
  );
}
