import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';

/**
 * UsersService
 *
 * Handles user profile queries and updates.
 * All operations are asynchronous and use Prisma for database access.
 */
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves a user by their unique ID.
   * @param id - The user ID
   * @returns Promise resolving to UserDto
   * @throws NotFoundException if user doesn't exist
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
   * @param username - The username to search for
   * @returns Promise resolving to UserDto or null
   */
  async findByUsername(username: string): Promise<UserDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    return user ? this.mapToUserDto(user) : null;
  }

  /**
   * Retrieves a user by email address.
   * @param email - The email to search for
   * @returns Promise resolving to UserDto or null
   */
  async findByEmail(email: string): Promise<UserDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return user ? this.mapToUserDto(user) : null;
  }

  /**
   * Retrieves a user by phone number.
   * @param phone - The phone number to search for
   * @returns Promise resolving to UserDto or null
   */
  async findByPhone(phone: string): Promise<UserDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { phone },
    });

    return user ? this.mapToUserDto(user) : null;
  }

  /**
   * Updates a user's profile information (authenticated user only).
   * Handles firstName, lastName, username, email, phone, and avatarUrl.
   * Validates username uniqueness and email/phone uniqueness if changed.
   *
   * @param id - The user ID (from authenticated context)
   * @param dto - UpdateUserDto with optional fields to update
   * @returns Promise resolving to updated UserDto
   * @throws NotFoundException if user doesn't exist
   * @throws BadRequestException if validation fails (e.g., duplicate username)
   */
  async updateProfile(id: number, dto: UpdateUserDto): Promise<UserDto> {
    // Verify user exists before updating
    const existingUser = await this.findById(id);

    // Check for duplicate username if username is being changed
    if (dto.username && dto.username !== existingUser.username) {
      const userWithUsername = await this.findByUsername(dto.username);
      if (userWithUsername) {
        throw new BadRequestException('Username already in use');
      }
    }

    // Check for duplicate email if email is being changed
    if (dto.email && dto.email !== existingUser.email) {
      const userWithEmail = await this.findByEmail(dto.email);
      if (userWithEmail) {
        throw new BadRequestException('Email already in use');
      }
    }

    // Check for duplicate phone if phone is being changed
    if (dto.phone && dto.phone !== existingUser.phone) {
      const userWithPhone = await this.findByPhone(dto.phone);
      if (userWithPhone) {
        throw new BadRequestException('Phone number already in use');
      }
    }

    // Build update data object with only provided fields
    const updateData: any = {};
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.username !== undefined) updateData.username = dto.username;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.avatarUrl !== undefined) updateData.avatarUrl = dto.avatarUrl;
    if (dto.fcmToken !== undefined) updateData.fcmToken = dto.fcmToken;

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return this.mapToUserDto(user);
  }

  /**
   * Deletes a user account and all associated data.
   * Cascades to remove all chat memberships and messages authored by the user.
   *
   * @param id - The user ID (from authenticated context)
   * @returns Promise resolving to void
   * @throws NotFoundException if user doesn't exist
   */
  async deleteAccount(id: number): Promise<void> {
    // Verify user exists before deleting
    await this.findById(id);

    // Delete all messages authored by the user
    await this.prisma.message.deleteMany({
      where: { authorId: id },
    });

    // Delete all chat memberships for the user
    await this.prisma.chatMember.deleteMany({
      where: { userId: id },
    });

    // Delete the user
    await this.prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Updates user's online status and last seen timestamp.
   * @param id - The user ID
   * @returns Promise resolving to updated UserDto
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
   * @param id - The user ID
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
   * Explicitly excludes password field from returned data.
   *
   * @param user - The Prisma user model
   * @returns UserDto for API responses
   * @private
   */
  private mapToUserDto(user: any): UserDto {
    // Explicitly exclude password field
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as UserDto;
  }
}
