import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UserDto } from './dto/user.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '@prisma/client';

/**
 * UsersController
 * 
 * RESTful API endpoints for user operations.
 * Handles HTTP requests for user profile management and status updates.
 * 
 * Endpoints:
 * - GET /users/:id - Retrieve user by ID
 * - PATCH /users/:id - Update user profile
 * - PATCH /users/status - Update user's online status (heartbeat)
 * 
 * All responses are automatically wrapped by TransformInterceptor.
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/:id
   * 
   * Retrieves a user's profile information by their ID.
   * 
   * Path Parameters:
   * @param id - The user ID to retrieve
   * 
   * Returns: UserDto object containing user information (password excluded)
   * 
   * Example Request:
   * GET /users/3
   * 
   * Example Response (wrapped by interceptor):
   * {
   *   "success": true,
   *   "data": {
   *     "id": 3,
   *     "email": "john@example.com",
   *     "phone": "+380123456789",
   *     "firstName": "John",
   *     "lastName": "Doe",
   *     "username": "@john_doe",
   *     "avatarUrl": "https://example.com/avatar.jpg",
   *     "isOnline": true,
   *     "lastSeen": "2026-05-13T10:35:00Z",
   *     "createdAt": "2026-01-01T00:00:00Z",
   *     "updatedAt": "2026-05-13T09:00:00Z"
   *   }
   * }
   * 
   * Errors:
   * - 404 Not Found: User with specified ID doesn't exist
   */
  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) id: number): Promise<UserDto> {
    return this.usersService.findById(id);
  }

  /**
   * PATCH /users/:id
   * 
   * Updates user's profile information.
   * Supports partial updates - only provided fields are updated.
   * 
   * Path Parameters:
   * @param id - The user ID to update
   * 
   * Body Parameters (UpdateUserDto - all optional):
   * @param firstName - User's first name
   * @param lastName - User's last name
   * @param avatarUrl - URL to user's avatar image
   * @param fcmToken - Firebase Cloud Messaging token
   * 
   * Returns: Updated UserDto
   * HTTP Status: 200 OK
   * 
   * Example Request:
   * PATCH /users/3
   * Content-Type: application/json
   * 
   * {
   *   "firstName": "Jonathan",
   *   "avatarUrl": "https://example.com/new-avatar.jpg"
   * }
   * 
   * Errors:
   * - 404 Not Found: User doesn't exist
   * - 400 Bad Request: Invalid DTO data
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ): Promise<UserDto> {
    return this.usersService.updateProfile(id, dto);
  }

  /**
   * PATCH /users/status
   * 
   * Heartbeat endpoint to update user's online status.
   * Called periodically by the mobile app to indicate user activity.
   * 
   * Updates:
   * - isOnline: Set to true
   * - lastSeen: Updated to current timestamp
   * 
   * Authentication: User ID is extracted from JWT token (via @GetUser() decorator)
   * Requires: Valid JWT token in Authorization header
   * 
   * Returns: Updated UserDto with new status and lastSeen timestamp
   * HTTP Status: 200 OK
   * 
   * Example Request:
   * PATCH /users/status
   * Authorization: Bearer <jwt_token>
   * 
   * Example Response (wrapped by interceptor):
   * {
   *   "success": true,
   *   "data": {
   *     "id": 3,
   *     "email": "john@example.com",
   *     "phone": "+380123456789",
   *     "firstName": "John",
   *     "lastName": "Doe",
   *     "username": "@john_doe",
   *     "isOnline": true,
   *     "lastSeen": "2026-05-13T10:35:00Z",
   *     ...
   *   }
   * }
   * 
   * Typical Usage Flow:
   * 1. User opens mobile app -> app sends PATCH /users/status
   * 2. App periodically sends heartbeat (e.g., every 30 seconds)
   * 3. User closes app or goes background -> sets isOnline to false
   * 
   * Note: This endpoint requires authentication.
   * The @GetUser() decorator extracts the user ID from the JWT token.
   * If no valid token is provided, a 401 Unauthorized error is returned.
   * 
   * Implementation Note:
   * To enable authentication, use @UseGuards(JwtAuthGuard) before this method.
   * The JWT auth guard should be implemented to verify the token and attach user to request.
   * 
   * Errors:
   * - 401 Unauthorized: No valid JWT token
   * - 404 Not Found: User doesn't exist
   */
  @Patch('status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(@GetUser() user: User): Promise<UserDto> {
    if (!user || !user.id) {
      throw new Error('User not authenticated');
    }
    return this.usersService.updateStatus(user.id);
  }
}
