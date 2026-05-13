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

/**
 * AuthService
 * 
 * This service handles authentication operations:
 * - User registration with username auto-generation
 * - User login with email or phone
 * - Password hashing and verification
 * - JWT token generation
 * 
 * Key Features:
 * - Auto-generates unique username from email (adds @ prefix)
 * - Supports login via email OR phone
 * - Uses bcrypt for secure password hashing
 * - JWT token generation for subsequent requests
 * 
 * Security Considerations:
 * - Passwords are hashed with bcrypt (10 salt rounds)
 * - Password is never exposed in responses
 * - JWT tokens are signed with a secret key
 */
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  /**
   * Registers a new user with auto-generated username.
   * 
   * Username Generation:
   * - Extracts the part before @ in email
   * - Adds @ prefix to create username (e.g., john.doe@example.com -> @john.doe)
   * - If username already exists, appends a random suffix
   * 
   * Password Handling:
   * - Hashed with bcrypt (10 salt rounds)
   * - Original password is never stored
   * 
   * @param dto - RegisterDto containing email, password, firstName, lastName, phone
   * @returns Promise resolving to AuthResponseDto with user data and JWT token
   * @throws ConflictException if email already exists
   * @throws BadRequestException if username generation fails
   * 
   * Example:
   * const response = await authService.register({
   *   email: 'john@example.com',
   *   password: 'Password123!',
   *   firstName: 'John',
   *   lastName: 'Doe',
   *   phone: '+380123456789'
   * });
   * // Returns: { user: {...}, accessToken: 'eyJ0eXA...' }
   */
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

  /**
   * Authenticates a user and returns JWT token.
   * 
   * Supports two login methods:
   * 1. Email + Password
   * 2. Phone + Password
   * 
   * At least one identifier (email or phone) must be provided.
   * 
   * @param dto - LoginDto with email OR phone and password
   * @returns Promise resolving to AuthResponseDto with user data and token
   * @throws BadRequestException if neither email nor phone provided
   * @throws UnauthorizedException if user not found or password invalid
   * 
   * Example:
   * // Login with email
   * const response = await authService.login({
   *   email: 'john@example.com',
   *   password: 'Password123!'
   * });
   * 
   * // Or login with phone
   * const response = await authService.login({
   *   phone: '+380123456789',
   *   password: 'Password123!'
   * });
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    // Validate that at least one identifier is provided
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Email or phone must be provided');
    }

    // Find user by email or phone
    let user = null;
    if (dto.email) {
      user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
    } else if (dto.phone) {
      user = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Map to UserDto (excludes password)
    const userDto = await this.usersService.findById(user.id);

    // Generate JWT token
    const accessToken = this.generateToken(user.id, user.email);

    return {
      user: userDto,
      accessToken,
    };
  }

  /**
   * Verifies a JWT token and returns the decoded payload.
   * 
   * Used by JWT authentication guard to validate request tokens.
   * 
   * @param token - JWT token string (without 'Bearer' prefix)
   * @returns Promise resolving to decoded token payload
   * @throws UnauthorizedException if token is invalid or expired
   */
  async verifyToken(token: string): Promise<any> {
    try {
      const decoded = this.jwtService.verify(token);
      return decoded;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Generates a JWT token for the given user.
   * 
   * Token Payload:
   * - sub: User ID (for subject claim)
   * - email: User's email
   * - iat: Issued at timestamp
   * - exp: Expiration (set to 7 days)
   * 
   * @param userId - The user's ID
   * @param email - The user's email
   * @returns Signed JWT token string
   * 
   * @private
   */
  private generateToken(userId: number, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload, {
      expiresIn: '7d',
    });
  }

  /**
   * Generates a username from email address.
   * 
   * Process:
   * 1. Extract part before @ symbol
   * 2. Add @ prefix
   * 
   * Examples:
   * - john.doe@example.com -> @john.doe
   * - user+test@domain.org -> @user+test
   * 
   * @param email - User's email address
   * @returns Generated username starting with @
   * @private
   */
  private generateUsernameFromEmail(email: string): string {
    const emailPart = email.split('@')[0];
    return `@${emailPart}`;
  }

  /**
   * Ensures the generated username is unique.
   * If username already exists, appends a random suffix.
   * 
   * Example:
   * - If @john_doe exists, tries @john_doe1, @john_doe2, etc.
   * - Maximum 10 attempts before throwing error
   * 
   * @param baseUsername - The base username to check
   * @returns Unique username guaranteed to not exist in database
   * @throws BadRequestException if cannot generate unique username after 10 attempts
   * @private
   */
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
