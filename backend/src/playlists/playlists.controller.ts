import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PlaylistsService } from './playlists.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  CreatePlaylistDto,
  UpdatePlaylistDto,
  AddSongDto,
  ReorderSongsDto,
} from './playlists.dto';

@UseGuards(JwtAuthGuard)
@Controller('playlists')
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Post()
  async create(@CurrentUser() user: any, @Body() dto: CreatePlaylistDto) {
    return this.playlistsService.create(user.id, dto.name, dto.description);
  }

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.playlistsService.findAllByUser(user.id);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.playlistsService.findOne(id, user.id);
  }

  @Put(':id')
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdatePlaylistDto,
  ) {
    return this.playlistsService.update(id, user.id, dto.name, dto.description);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.playlistsService.remove(id, user.id);
  }

  @Post(':id/songs')
  async addSong(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: AddSongDto,
  ) {
    return this.playlistsService.addSong(id, dto.songId, user.id);
  }

  @Delete(':id/songs/:songId')
  async removeSong(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('songId') songId: string,
  ) {
    return this.playlistsService.removeSong(id, songId, user.id);
  }

  @Put(':id/reorder')
  async reorderSongs(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ReorderSongsDto,
  ) {
    return this.playlistsService.reorderSongs(id, dto.songIds, user.id);
  }
}
