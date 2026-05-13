import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';

/**
 * UsersService
 * 
 * This service handles all user-related database operations.
 * Manages user profiles, status updates, and profile lookups.
 * 
 * Key Methods:
 * - findById: Retrieve a user by ID
 * - findByUsername: Retrieve a user by unique username
 * - updateProfile: Update user profile information
 * - updateStatus: Update user's online status and lastSeen timestamp
 * 
 * All operations are asynchronous and use Prisma for database access.
 * Follows the Single Responsibility Principle by isolating user business logic.
 */
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves a user by their unique ID.
   * 
   * @param id - The user ID to search for
   * @returns Promise resolving to UserDto if found
   * @throws NotFoundException if user doesn't exist
   * 
   * Example:
   * const user = await usersService.findById(3);
   */
  async findById(id: number): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.mapToUserDto(user);
  }

  /**
   * Retrieves a user by their unique username.
   * 
   * Usernames start with @ and are case-sensitive unique identifiers.
   * This is useful for searching users in chat applications.
   * 
   * @param username - The username to search for (e.g., "@john_doe")
   * @returns Promise resolving to UserDto if found, null otherwise
   * 
   * Example:
   * const user = await usersService.findByUsername("@john_doe");
   */
  async findByUsername(username: string): Promise<UserDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    return user ? this.mapToUserDto(user) : null;
  }

  /**
   * Retrieves a user by email address.
   * 
   * @param email - The email address to search for
   * @returns Promise resolving to UserDto if found, null otherwise
   */
  async findByEmail(email: string): Promise<UserDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return user ? this.mapToUserDto(user) : null;
  }

  /**
   * Retrieves a user by phone number.
   * 
   * @param phone - The phone number to search for
   * @returns Promise resolving to UserDto if found, null otherwise
   */
  async findByPhone(phone: string): Promise<UserDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { phone },
    });

    return user ? this.mapToUserDto(user) : null;
  }

  /**
   * Updates a user's profile information.
   * 
   * Supports partial updates for firstName, lastName, avatarUrl, and fcmToken.
   * Only provided fields are updated.
   * 
   * @param id - The user ID to update
   * @param dto - UpdateUserDto with fields to update
   * @returns Promise resolving to updated UserDto
   * @throws NotFoundException if user doesn't exist
   * 
   * Example:
   * const updated = await usersService.updateProfile(3, {
   *   firstName: 'John',
   *   avatarUrl: 'https://example.com/avatar.jpg'
   * });
   */
  async updateProfile(id: number, dto: UpdateUserDto): Promise<UserDto> {
    // Verify user exists before updating
    await this.findById(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        avatarUrl: dto.avatarUrl,
        fcmToken: dto.fcmToken,
      },
    });

    return this.mapToUserDto(user);
  }

  /**
   * Updates user's online status and last seen timestamp.
   * 
   * This is the heartbeat endpoint that keeps track of user activity.
   * Called periodically by the mobile app to indicate the user is still active.
   * 
   * Updates:
   * - isOnline: Sets to true (user is actively using the app)
   * - lastSeen: Sets to current timestamp
   * 
   * @param id - The user ID to update
   * @returns Promise resolving to updated UserDto with new timestamps
   * @throws NotFoundException if user doesn't exist
   * 
   * Example:
   * const updated = await usersService.updateStatus(3);
   * // User is now marked as online with current lastSeen time
   */
  async updateStatus(id: number): Promise<UserDto> {
    // Verify user exists before updating
    await this.findById(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        isOnline: true,
        lastSeen: new Date(),
      },
    });

    return this.mapToUserDto(user);
  }

  /**
   * Sets user's offline status.
   * Called when user logs out or app goes to background.
   * 
   * @param id - The user ID to update
   * @returns Promise resolving to updated UserDto
   */
  async setOffline(id: number): Promise<UserDto> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        isOnline: false,
        lastSeen: new Date(),
      },
    });

    return this.mapToUserDto(user);
  }

  /**
   * Maps Prisma User model to UserDto.
   * Ensures password is never exposed in responses.
   * 
   * @param user - The Prisma User model
   * @returns UserDto safe for API responses
   * @private
   */
  private mapToUserDto(user: any): UserDto {
    // Explicitly exclude password field
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as UserDto;
  }
}
