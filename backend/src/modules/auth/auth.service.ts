import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserDto } from '../users/dto/user.dto';
import { User } from '@prisma/client';

// AuthService
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // Registers a new user with auto-generated username.
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    // Check if email already exists
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Check if phone already exists (if provided)
    if (dto.phone) {
      const phoneExists = await this.usersService.findByPhone(dto.phone);
      if (phoneExists) {
        throw new ConflictException('Phone number already registered');
      }
    }

    // Generate unique username from email
    const baseUsername = this.generateUsernameFromEmail(dto.email);
    const username = await this.ensureUniqueUsername(baseUsername);

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user in database
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone || '', // Phone is unique but optional - use empty string if not provided
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        username,
      },
    });

    // Map to UserDto (excludes password)
    const userDto = await this.usersService.findById(user.id);

    // Generate JWT token
    const accessToken = this.generateToken(user.id, user.email);

    return {
      user: userDto,
      accessToken,
    };
  }

  // Authenticates a user and returns JWT token.
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // 1. Check for the presence of identifiers (email or phone)
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Email or phone must be provided');
    }

    // 2. Search for the user with clear typing
    // We use the type User | null so that TypeScript knows the user might not be found
    let user: User | null = null;

    if (dto.email) {
      user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
    } else if (dto.phone) {
      // If the phone field is marked as @unique in the schema
      user = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
    }

    // 3. Type Guard: check if the user exists
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 4. Password verification (now TS knows that user.password exists)
    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 5. Get the safe user object (without password)
    // Since findById returns a UserDto, this matches the AuthResponseDto contract
    const userDto = await this.usersService.findById(user.id);
    if (!userDto) {
        throw new UnauthorizedException('User profile sync error');
    }

    // 6. Generate token
    const accessToken = this.generateToken(user.id, user.email);

    return {
      user: userDto,
      accessToken,
    };
  }

  // Verifies a JWT token and returns the decoded payload.
  async verifyToken(token: string): Promise<any> {
    try {
      const decoded = this.jwtService.verify(token);
      return decoded;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  // Generates a JWT token for the given user.
  private generateToken(userId: number, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload, {
      expiresIn: '7d',
    });
  }

  // Generates a username from email address.
  private generateUsernameFromEmail(email: string): string {
    const emailPart = email.split('@')[0];
    return `@${emailPart}`;
  }

  private async ensureUniqueUsername(baseUsername: string): Promise<string> {
    // Check if base username is available
    let existingUser = await this.usersService.findByUsername(baseUsername);
    if (!existingUser) {
      return baseUsername;
    }

    // Try appending numbers until unique
    for (let i = 1; i <= 10; i++) {
      const candidateUsername = `${baseUsername}${i}`;
      existingUser = await this.usersService.findByUsername(candidateUsername);
      if (!existingUser) {
        return candidateUsername;
      }
    }

    throw new BadRequestException(
      'Could not generate unique username for this email',
    );
  }
}
