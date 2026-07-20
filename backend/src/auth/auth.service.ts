import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
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
    const invite = await this.prisma.inviteCode.findUnique({ where: { code: inviteCode } });
    if (!invite) {
      throw new UnauthorizedException('Invalid invite code');
    }
    if (invite.usedBy) {
      throw new UnauthorizedException('This invite code has already been used');
    }

    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) {
      throw new ConflictException('Username is already taken');
    }

    const passwordHash = await bcrypt.hash(pass, 10);
    const user = await this.prisma.user.create({
      data: { username, passwordHash },
    });

    await this.prisma.inviteCode.update({
      where: { code: inviteCode },
      data: { usedBy: user.id, usedAt: new Date() },
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

  async generateInviteCode(userId: string) {
    // 8 alphanumeric chars, easy to read aloud/type on a phone keyboard
    let alnum = '';
    while (alnum.length < 8) {
      alnum += crypto.randomBytes(8).toString('base64url').replace(/[^a-zA-Z0-9]/g, '');
    }
    const code = alnum.slice(0, 8).toUpperCase();

    const invite = await this.prisma.inviteCode.create({
      data: { code, createdBy: userId },
    });

    return { code: invite.code };
  }

  async getMyInviteCodes(userId: string) {
    return this.prisma.inviteCode.findMany({
      where: { createdBy: userId },
      orderBy: { createdAt: 'desc' },
      select: { code: true, usedBy: true, createdAt: true, usedAt: true },
    });
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
