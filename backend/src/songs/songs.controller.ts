import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SongsService } from './songs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('songs')
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSong(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    // Accept audio file mime-types or extension fallbacks
    const allowedMimeTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/flac',
      'audio/x-flac',
    ];
    const isAudioExt = file.originalname.match(/\.(mp3|wav|flac)$/i);
    if (!allowedMimeTypes.includes(file.mimetype) && !isAudioExt) {
      throw new BadRequestException('Unsupported audio format. Supported: MP3, WAV, FLAC');
    }
    return this.songsService.createSong(file);
  }

  @Post('youtube')
  async importYoutube(@Body('url') url: string) {
    if (!url) {
      throw new BadRequestException('YouTube URL is required');
    }
    return this.songsService.importFromYoutube(url);
  }

  @Get()
  async getAll() {
    return this.songsService.findAll();
  }

  @Get('recent')
  async getRecent(@Query('limit') limit?: number) {
    return this.songsService.findRecent(limit ? Number(limit) : undefined);
  }

  @Get('trending')
  async getTrending(@Query('limit') limit?: number) {
    return this.songsService.findTrending(limit ? Number(limit) : 10);
  }

  @Get('search')
  async search(@Query('q') query: string) {
    if (!query) {
      return [];
    }
    return this.songsService.search(query);
  }

  @Post(':id/play')
  async playSong(@Param('id') id: string) {
    return this.songsService.incrementPlayCount(id);
  }

  @Post(':id/like')
  async toggleLike(@CurrentUser() user: any, @Param('id') id: string) {
    return this.songsService.toggleLike(id, user.id);
  }

  @Get('liked')
  async getLikedSongs(@CurrentUser() user: any) {
    return this.songsService.getLikedSongs(user.id);
  }

  @Post(':id/history')
  async addToHistory(@CurrentUser() user: any, @Param('id') id: string) {
    return this.songsService.addToHistory(id, user.id);
  }

  @Get('history')
  async getHistory(@CurrentUser() user: any, @Query('limit') limit?: number) {
    return this.songsService.getHistory(user.id, limit ? Number(limit) : undefined);
  }

  @Delete(':id')
  async deleteSong(@Param('id') id: string) {
    return this.songsService.deleteSong(id);
  }
}
