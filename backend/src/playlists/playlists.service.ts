import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PlaylistsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, name: string, description?: string) {
    return this.prisma.playlist.create({
      data: {
        name,
        description,
        userId,
      },
    });
  }

  async findAllByUser(userId: string) {
    return this.prisma.playlist.findMany({
      where: { userId },
      include: {
        _count: {
          select: { playlistSongs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
      include: {
        playlistSongs: {
          orderBy: { orderIndex: 'asc' },
          include: {
            song: true,
          },
        },
      },
    });

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    if (playlist.userId !== userId) {
      throw new ForbiddenException('You do not own this playlist');
    }

    return playlist;
  }

  async update(id: string, userId: string, name: string, description?: string) {
    const playlist = await this.findOne(id, userId);
    return this.prisma.playlist.update({
      where: { id: playlist.id },
      data: { name, description },
    });
  }

  async remove(id: string, userId: string) {
    const playlist = await this.findOne(id, userId);
    return this.prisma.playlist.delete({
      where: { id: playlist.id },
    });
  }

  async addSong(playlistId: string, songId: string, userId: string) {
    await this.findOne(playlistId, userId);
    
    const song = await this.prisma.song.findUnique({ where: { id: songId } });
    if (!song) {
      throw new NotFoundException('Song not found');
    }

    const existing = await this.prisma.playlistSong.findUnique({
      where: {
        playlistId_songId: { playlistId, songId },
      },
    });

    if (existing) {
      return existing;
    }

    const lastPlaylistSong = await this.prisma.playlistSong.findFirst({
      where: { playlistId },
      orderBy: { orderIndex: 'desc' },
    });

    const orderIndex = lastPlaylistSong ? lastPlaylistSong.orderIndex + 1 : 0;

    return this.prisma.playlistSong.create({
      data: {
        playlistId,
        songId,
        orderIndex,
      },
    });
  }

  async removeSong(playlistId: string, songId: string, userId: string) {
    await this.findOne(playlistId, userId);

    return this.prisma.playlistSong.delete({
      where: {
        playlistId_songId: { playlistId, songId },
      },
    });
  }

  async reorderSongs(playlistId: string, songIds: string[], userId: string) {
    await this.findOne(playlistId, userId);

    const updates = songIds.map((songId, index) =>
      this.prisma.playlistSong.update({
        where: {
          playlistId_songId: { playlistId, songId },
        },
        data: {
          orderIndex: index,
        },
      }),
    );

    await this.prisma.$transaction(updates);
    return this.findOne(playlistId, userId);
  }
}
