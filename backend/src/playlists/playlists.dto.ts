import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

export class CreatePlaylistDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdatePlaylistDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class AddSongDto {
  @IsString()
  @IsNotEmpty()
  songId: string;
}

export class ReorderSongsDto {
  @IsArray()
  @IsString({ each: true })
  songIds: string[];
}
