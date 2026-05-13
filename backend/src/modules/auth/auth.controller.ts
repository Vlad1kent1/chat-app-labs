import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

/**
 * AuthController
 * 
 * RESTful API endpoints for authentication operations.
 * Handles user registration and login.
 * 
 * Endpoints:
 * - POST /auth/register - Create new user account
 * - POST /auth/login - Authenticate user and get JWT token
 * 
 * All responses are automatically wrapped by TransformInterceptor.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/register
   * 
   * Registers a new user and returns JWT token.
   * 
   * Features:
   * - Auto-generates unique username from email (adds @ prefix)
   * - Validates email uniqueness
   * - Hashes password with bcrypt
   * - Returns user data and JWT token
   * 
   * Body Parameters (RegisterDto):
   * @param email - User's email (must be unique, valid email format)
   * @param password - User's password (min 8 chars, must contain uppercase, lowercase, digit, special char)
   * @param firstName - User's first name (min 2 chars)
   * @param lastName - User's last name (optional)
   * @param phone - User's phone number (optional)
   * 
   * Returns: AuthResponseDto containing user data and accessToken
   * HTTP Status: 201 Created
   * 
   * Example Request:
   * POST /auth/register
   * Content-Type: application/json
   * 
   * {
   *   "email": "john@example.com",
   *   "password": "SecurePass123!",
   *   "firstName": "John",
   *   "lastName": "Doe",
   *   "phone": "+380123456789"
   * }
   * 
   * Example Response (wrapped by interceptor):
   * {
   *   "success": true,
   *   "data": {
   *     "user": {
   *       "id": 1,
   *       "email": "john@example.com",
   *       "phone": "+380123456789",
   *       "firstName": "John",
   *       "lastName": "Doe",
   *       "username": "@john",
   *       "avatarUrl": null,
   *       "fcmToken": null,
   *       "isOnline": false,
   *       "lastSeen": "2026-05-13T10:00:00Z",
   *       "createdAt": "2026-05-13T10:00:00Z",
   *       "updatedAt": "2026-05-13T10:00:00Z"
   *     },
   *     "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   *   }
   * }
   * 
   * Errors:
   * - 400 Bad Request: Invalid DTO data, password requirements not met
   * - 409 Conflict: Email or phone already registered
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  /**
   * POST /auth/login
   * 
   * Authenticates a user and returns JWT token.
   * 
   * Features:
   * - Supports login via email OR phone
   * - Verifies password against bcrypt hash
   * - Returns user data and JWT token
   * - Token valid for 7 days
   * 
   * Body Parameters (LoginDto):
   * @param email - User's email (optional if phone provided)
   * @param phone - User's phone (optional if email provided)
   * @param password - User's password (required)
   * 
   * Note: Either email or phone must be provided, not both.
   * 
   * Returns: AuthResponseDto containing user data and accessToken
   * HTTP Status: 200 OK
   * 
   * Example Request (Email Login):
   * POST /auth/login
   * Content-Type: application/json
   * 
   * {
   *   "email": "john@example.com",
   *   "password": "SecurePass123!"
   * }
   * 
   * Example Request (Phone Login):
   * POST /auth/login
   * Content-Type: application/json
   * 
   * {
   *   "phone": "+380123456789",
   *   "password": "SecurePass123!"
   * }
   * 
   * Example Response (wrapped by interceptor):
   * {
   *   "success": true,
   *   "data": {
   *     "user": {
   *       "id": 1,
   *       "email": "john@example.com",
   *       "phone": "+380123456789",
   *       "firstName": "John",
   *       "lastName": "Doe",
   *       "username": "@john",
   *       "isOnline": false,
   *       "lastSeen": "2026-05-13T10:00:00Z",
   *       ...
   *     },
   *     "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   *   }
   * }
   * 
   * Usage:
   * 1. Store the accessToken in secure storage (e.g., keychain, secure storage)
   * 2. Include in all subsequent requests: Authorization: Bearer <accessToken>
   * 3. Token expires in 7 days, then user must login again
   * 
   * Errors:
   * - 400 Bad Request: Neither email nor phone provided
   * - 401 Unauthorized: Invalid email/phone or password
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }
}
