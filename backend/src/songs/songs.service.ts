import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class SongsService {
  constructor(private prisma: PrismaService) {}

  async createSong(file: Express.Multer.File) {
    const songId = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    const sanitizedFilename = `${songId}${ext}`;
    const uploadPath = path.join(process.cwd(), 'uploads/songs', sanitizedFilename);

    // Save audio file to uploads/songs folder
    fs.writeFileSync(uploadPath, file.buffer);

    // Set file defaults in case parsing fails
    let title = path.basename(file.originalname, ext);
    let artist = 'Unknown Artist';
    let album = 'Unknown Album';
    let duration = 0;
    let coverUrl: string | null = null;

    try {
      // Dynamic import of music-metadata to avoid CommonJS vs ESM require exceptions
      const mm = await (eval('import("music-metadata")') as Promise<typeof import('music-metadata')>);
      const metadata = await mm.parseFile(uploadPath);

      if (metadata.common.title) {
        title = metadata.common.title;
      }
      if (metadata.common.artist) {
        artist = metadata.common.artist;
      }
      if (metadata.common.album) {
        album = metadata.common.album;
      }
      if (metadata.format.duration) {
        duration = Math.round(metadata.format.duration);
      }

      // Save embedded cover art picture if available
      const picture = metadata.common.picture?.[0];
      if (picture) {
        const coverExt = picture.format.split('/')[1] || 'jpg';
        const coverFilename = `${songId}.${coverExt}`;
        const coverPath = path.join(process.cwd(), 'uploads/covers', coverFilename);
        fs.writeFileSync(coverPath, picture.data);
        coverUrl = `/uploads/covers/${coverFilename}`;
      }
    } catch (error: any) {
      console.warn('Could not extract metadata, using file defaults:', error.message);
    }

    const audioUrl = `/uploads/songs/${sanitizedFilename}`;

    return this.prisma.song.create({
      data: {
        id: songId,
        title,
        artist,
        album,
        duration,
        audioUrl,
        coverUrl,
      },
    });
  }

  async findAll() {
    return this.prisma.song.findMany({
      orderBy: { uploadDate: 'desc' },
    });
  }

  async findRecent(limit = 10) {
    return this.prisma.song.findMany({
      orderBy: { uploadDate: 'desc' },
      take: limit,
    });
  }

  async findTrending(limit = 10) {
    return this.prisma.song.findMany({
      orderBy: { playCount: 'desc' },
      take: limit,
    });
  }

  async getSong(id: string) {
    const song = await this.prisma.song.findUnique({
      where: { id },
    });
    if (!song) {
      throw new NotFoundException('Song not found');
    }
    return song;
  }

  async incrementPlayCount(id: string) {
    await this.getSong(id); // Throws if not found
    return this.prisma.song.update({
      where: { id },
      data: { playCount: { increment: 1 } },
    });
  }

  async search(query: string) {
    return this.prisma.song.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { artist: { contains: query } },
          { album: { contains: query } },
        ],
      },
    });
  }

  async deleteSong(id: string) {
    const song = await this.getSong(id);

    // Delete local files
    try {
      const audioPath = path.join(process.cwd(), song.audioUrl);
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
      if (song.coverUrl) {
        const coverPath = path.join(process.cwd(), song.coverUrl);
        if (fs.existsSync(coverPath)) {
          fs.unlinkSync(coverPath);
        }
      }
    } catch (e: any) {
      console.warn('Error deleting physical song files:', e.message);
    }

    return this.prisma.song.delete({
      where: { id },
    });
  }

  async toggleLike(songId: string, userId: string) {
    const existing = await this.prisma.likedSong.findUnique({
      where: {
        userId_songId: { userId, songId },
      },
    });

    if (existing) {
      await this.prisma.likedSong.delete({
        where: {
          userId_songId: { userId, songId },
        },
      });
      return { liked: false };
    } else {
      await this.prisma.likedSong.create({
        data: {
          userId,
          songId,
        },
      });
      return { liked: true };
    }
  }

  async getLikedSongs(userId: string) {
    const likes = await this.prisma.likedSong.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        song: true,
      },
    });
    return likes.map((l) => l.song);
  }

  async addToHistory(songId: string, userId: string) {
    return this.prisma.history.create({
      data: {
        userId,
        songId,
      },
      include: {
        song: true,
      },
    });
  }

  async getHistory(userId: string, limit = 20) {
    const history = await this.prisma.history.findMany({
      where: { userId },
      orderBy: { playedAt: 'desc' },
      take: limit,
      include: {
        song: true,
      },
    });
    return history.map((h) => h.song);
  }

  private importQueue: any[] = [];
  private isProcessingQueue = false;

  getImportQueueStatus() {
    return this.importQueue;
  }

  async importFromYoutube(url: string) {
    const ytIdRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(ytIdRegex);
    if (!match) {
      throw new BadRequestException('Invalid YouTube URL');
    }
    const videoId = match[1];

    // Duplicate detection
    const existing = await this.prisma.song.findUnique({
      where: { youtubeId: videoId },
    });
    if (existing) {
      return { song: existing, alreadyExists: true, status: 'completed' };
    }

    // Check if already in queue
    const inQueue = this.importQueue.find(
      (item) => item.url === url && (item.status === 'pending' || item.status === 'importing')
    );
    if (inQueue) {
      return { status: 'queued', id: inQueue.id, alreadyExists: false };
    }

    const queueId = crypto.randomUUID();
    const newItem = {
      id: queueId,
      url,
      title: 'Queued...',
      status: 'pending' as const,
      addedAt: new Date(),
    };

    this.importQueue.unshift(newItem);
    if (this.importQueue.length > 50) {
      this.importQueue.pop();
    }

    // Start background processor asynchronously (non-blocking)
    this.processQueue();

    return { status: 'queued', id: queueId, alreadyExists: false };
  }

  private async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    try {
      while (true) {
        // Fetch next pending job (oldest first)
        const nextItem = [...this.importQueue].reverse().find((item) => item.status === 'pending');
        if (!nextItem) break;

        nextItem.status = 'importing';
        nextItem.title = 'Downloading...';

        try {
          const result = await this.executeYoutubeImport(nextItem.url);
          nextItem.status = 'completed';
          nextItem.title = result.song.title;
        } catch (e: any) {
          nextItem.status = 'failed';
          nextItem.error = e.message || 'Import failed';
          nextItem.title = 'Failed to import';
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  async executeYoutubeImport(url: string) {
    const ytIdRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(ytIdRegex);
    if (!match) {
      throw new BadRequestException('Invalid YouTube URL');
    }
    const videoId = match[1];

    const songId = crypto.randomUUID();
    const audioFilename = `${songId}.mp3`;
    const audioPath = path.join(process.cwd(), 'uploads/songs', audioFilename);
    const audioUrl = `/uploads/songs/${audioFilename}`;

    // Secure cookie and po_token parameters configuration
    const cookiesPath = path.join(process.cwd(), 'cookies.txt');
    const cookiesArg = fs.existsSync(cookiesPath) ? `--cookies "${cookiesPath}"` : '';

    const potScriptPath = '/root/bgutil-ytdlp-pot-provider/server/build/generate_once.js';
    const potArg = (!cookiesArg && fs.existsSync(potScriptPath))
      ? `--extractor-args "youtubepot-bgutilscript:script_path=${potScriptPath}"`
      : '';

    const jsRuntimeArg = '--js-runtimes node';

    try {
      // 1. Fetch metadata in JSON format
      const { stdout: metadataStdout } = await execAsync(
        `yt-dlp ${cookiesArg} ${potArg} ${jsRuntimeArg} -j "https://www.youtube.com/watch?v=${videoId}"`
      );
      const info = JSON.parse(metadataStdout);

      // Extract metadata fields
      const title = info.title || 'Unknown Title';
      const artist = info.uploader || 'Unknown Artist';
      const album = 'YouTube';
      const duration = info.duration ? Math.round(info.duration) : 0;
      const description = info.description || null;
      const youtubeUploadDate = info.upload_date || null; // format YYYYMMDD
      const originalUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      // 2. Download audio stream and convert to mp3 via ffmpeg
      await execAsync(
        `yt-dlp ${cookiesArg} ${potArg} ${jsRuntimeArg} -x --audio-format mp3 --audio-quality 192K -o "${audioPath}" "https://www.youtube.com/watch?v=${videoId}"`
      );

      // 3. Check file details after download
      let fileSize = 0;
      if (fs.existsSync(audioPath)) {
        fileSize = fs.statSync(audioPath).size;
      }
      const bitrate = 192000; // 192 Kbps

      // 4. Download high resolution cover
      const coverUrl = await this.downloadCover(videoId, songId);

      // 5. Create database record
      const song = await this.prisma.song.create({
        data: {
          id: songId,
          title,
          artist,
          album,
          duration,
          audioUrl,
          coverUrl,
          youtubeId: videoId,
          originalUrl,
          sourceType: 'YOUTUBE',
          fileSize,
          bitrate,
          description,
          youtubeUploadDate,
        },
      });

      return { song, alreadyExists: false };
    } catch (e: any) {
      console.error('YouTube import failed:', e);
      // Clean up file if partially downloaded
      if (fs.existsSync(audioPath)) {
        try { fs.unlinkSync(audioPath); } catch {}
      }
      throw new InternalServerErrorException(`YouTube import failed: ${e.message}`);
    }
  }

  private async downloadCover(videoId: string, songId: string): Promise<string | null> {
    const resolutions = [
      'maxresdefault.jpg',
      'sddefault.jpg',
      'hqdefault.jpg',
      'mqdefault.jpg',
      'default.jpg'
    ];
    
    const coversDir = path.join(process.cwd(), 'uploads/covers');
    const targetPath = path.join(coversDir, `${songId}.jpg`);
    
    for (const res of resolutions) {
      const url = `https://img.youtube.com/vi/${videoId}/${res}`;
      try {
        const response = await fetch(url);
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          // Double-check if the buffer is a valid image (maxresdefault sometimes returns a small placeholder if not found)
          if (res === 'maxresdefault.jpg' && buffer.length < 2000) {
            continue;
          }
          fs.writeFileSync(targetPath, buffer);
          return `/uploads/covers/${songId}.jpg`;
        }
      } catch (e) {
        // Try next resolution
      }
    }
    return null;
  }
}
