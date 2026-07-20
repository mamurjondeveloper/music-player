import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(username: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const payload = { sub: user.id, username: user.username };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async register(username: string, pass: string, inviteCode: string) {
    const expectedInviteCode = this.configService.get<string>('INVITE_CODE');
    if (!expectedInviteCode) {
      throw new UnauthorizedException('Registration is currently disabled');
    }
    if (inviteCode !== expectedInviteCode) {
      throw new UnauthorizedException('Invalid invite code');
    }

    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) {
      throw new ConflictException('Username is already taken');
    }

    const passwordHash = await bcrypt.hash(pass, 10);
    const user = await this.prisma.user.create({
      data: { username, passwordHash },
    });

    const payload = { sub: user.id, username: user.username };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async validateUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  }
}
