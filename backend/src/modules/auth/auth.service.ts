import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { VerificationType } from '@prisma/client';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  private readonly codeTTL = 10 * 60 * 1000;

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<void> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser && existingUser.isVerified) {
      throw new ConflictException('Email already registered');
    }

    if (dto.phone) {
      const phoneOwner = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });

      if (phoneOwner && phoneOwner.email !== dto.email) {
        throw new ConflictException('Phone number already registered');
      }
    }

    const baseUsername = this.generateUsernameFromEmail(dto.email);
    const username = await this.ensureUniqueUsername(baseUsername);
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    if (existingUser) {
      await this.prisma.user.update({
        where: { email: dto.email },
        data: {
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          isVerified: false,
          username,
        },
      });
    } else {
      await this.prisma.user.create({
        data: {
          email: dto.email,
          phone: dto.phone,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          username,
          isVerified: false,
        },
      });
    }

    const code = await this.saveVerificationCode(dto.email, VerificationType.REGISTER);
    void this.sendVerificationEmail(dto.email, code, VerificationType.REGISTER);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Email or phone must be provided');
    }

    const user = await this.prisma.user.findUnique({
      where: dto.email ? { email: dto.email } : { phone: dto.phone },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email before signing in');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userDto = await this.usersService.findById(user.id);
    if (!userDto) {
      throw new UnauthorizedException('User profile sync error');
    }

    const accessToken = this.generateToken(user.id, user.email);

    return {
      user: userDto,
      accessToken,
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.isVerified) {
      throw new BadRequestException('Please verify your email before resetting your password');
    }

    const code = await this.saveVerificationCode(email, VerificationType.RESET);
    void this.sendVerificationEmail(email, code, VerificationType.RESET);
  }

  async resendOtp(email: string, type: VerificationType): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (type === VerificationType.RESET && !user.isVerified) {
      throw new BadRequestException('Please verify your account before resetting your password');
    }

    const code = await this.saveVerificationCode(email, type);
    void this.sendVerificationEmail(email, code, type);
  }

  async verifyOtp(email: string, code: string, type: VerificationType): Promise<boolean> {
    await this.cleanupExpiredCodes();

    const verification = await this.prisma.verificationCode.findUnique({
      where: {
        email_type: {
          email,
          type,
        },
      },
    });

    if (!verification) {
      throw new BadRequestException('Verification code not found');
    }

    if (verification.code !== code) {
      throw new BadRequestException('Invalid code');
    }

    if (verification.expiresAt < new Date()) {
      throw new BadRequestException('Code has expired');
    }

    if (type === VerificationType.REGISTER) {
      await this.prisma.user.update({
        where: { email },
        data: { isVerified: true },
      });
    }

    await this.prisma.verificationCode.delete({
      where: {
        email_type: {
          email,
          type,
        },
      },
    });

    return true;
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    await this.verifyOtp(email, code, VerificationType.RESET);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });
  }

  async verifyToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private generateToken(userId: number, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload, {
      expiresIn: '7d',
    });
  }

  private generateUsernameFromEmail(email: string): string {
    const emailPart = email.split('@')[0];
    return `@${emailPart}`;
  }

  private async ensureUniqueUsername(baseUsername: string): Promise<string> {
    let existingUser = await this.usersService.findByUsername(baseUsername);
    if (!existingUser) {
      return baseUsername;
    }

    for (let i = 1; i <= 20; i++) {
      const candidateUsername = `${baseUsername}${i}`;
      existingUser = await this.usersService.findByUsername(candidateUsername);
      if (!existingUser) {
        return candidateUsername;
      }
    }

    throw new BadRequestException('Could not generate unique username for this email');
  }

  private async saveVerificationCode(email: string, type: VerificationType): Promise<string> {
    const code = this.generateSixDigitCode();
    const expiresAt = new Date(Date.now() + this.codeTTL);

    await this.cleanupExpiredCodes();

    await this.prisma.verificationCode.upsert({
      where: {
        email_type: {
          email,
          type,
        },
      },
      update: {
        code,
        expiresAt,
        createdAt: new Date(),
      },
      create: {
        email,
        code,
        type,
        expiresAt,
      },
    });

    return code;
  }

  private async sendVerificationEmail(email: string, code: string, type: VerificationType): Promise<void> {
    try {
      await this.mailService.sendVerificationCode(email, code, type);
    } catch (error) {
      console.error('Verification email send error:', error);
    }
  }

  private async cleanupExpiredCodes(): Promise<void> {
    await this.prisma.verificationCode.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  private generateSixDigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
