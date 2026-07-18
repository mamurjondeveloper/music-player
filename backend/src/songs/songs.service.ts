import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

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
}
