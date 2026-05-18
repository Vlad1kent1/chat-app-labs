import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import * as PrismaClient from '@prisma/client';

/**
 * UsersController
 *
 * RESTful API endpoints for user profile operations.
 * Handles HTTP requests for retrieving, updating, and deleting user profiles.
 *
 * Endpoints:
 * - GET /users/:id - Retrieve a specific user (public)
 * - PATCH /users/profile - Update authenticated user's profile (protected)
 * - DELETE /users/profile - Delete authenticated user's account (protected)
 * - PATCH /users/status - Update online status (protected)
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/:id
   * Retrieves a specific user's public profile.
   *
   * @param id - The user ID
   * @returns UserDto
   */
  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) id: number): Promise<UserDto> {
    return this.usersService.findById(id);
  }

  /**
   * PATCH /users/profile
   * Updates the authenticated user's profile.
   * Protected by JwtAuthGuard - requires valid JWT token.
   * Extracts user ID from JWT and validates uniqueness of editable fields.
   *
   * Body (UpdateUserDto):
   * @param firstName - Optional new first name
   * @param lastName - Optional new last name
   * @param username - Optional new username (must be unique)
   * @param email - Optional new email (must be unique)
   * @param phone - Optional new phone (must be unique)
   * @param avatarUrl - Optional new avatar URL
   *
   * Returns: Updated UserDto
   * HTTP Status: 200 OK
   *
   * Example Request:
   * PATCH /users/profile
   * Authorization: Bearer <jwt_token>
   * Content-Type: application/json
   *
   * {
   *   "firstName": "John",
   *   "lastName": "Doe",
   *   "username": "@johndoe",
   *   "phone": "+1234567890",
   *   "avatarUrl": "https://example.com/avatar.jpg"
   * }
   */
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @GetUser() user: PrismaClient.User,
    @Body() dto: UpdateUserDto,
  ): Promise<UserDto> {
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.usersService.updateProfile(user.id, dto);
  }

  /**
   * DELETE /users/profile
   * Permanently deletes the authenticated user's account.
   * Protected by JwtAuthGuard - requires valid JWT token.
   * Cascades to delete all associated messages and chat memberships.
   *
   * Returns: void (204 No Content)
   * HTTP Status: 204 No Content
   *
   * Example Request:
   * DELETE /users/profile
   * Authorization: Bearer <jwt_token>
   *
   * WARNING: This action cannot be undone. All user data will be permanently deleted.
   */
  @Delete('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProfile(
    @GetUser() user: PrismaClient.User,
  ): Promise<void> {

    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.usersService.deleteAccount(user.id);
  }

  /**
   * PATCH /users/status
   * Updates the authenticated user's online status (heartbeat).
   * Protected by JwtAuthGuard - requires valid JWT token.
   *
   * Returns: Updated UserDto
   * HTTP Status: 200 OK
   */
  @Patch('status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateStatus(@GetUser() user: PrismaClient.User): Promise<UserDto> {
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.usersService.updateStatus(user.id);
  }
}
