import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';

// UsersService
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Retrieves a user by their unique ID.
  async findById(id: number): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.mapToUserDto(user);
  }

  // Retrieves a user by their unique username.
  async findByUsername(username: string): Promise<UserDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    return user ? this.mapToUserDto(user) : null;
  }

  // Retrieves a user by email address.
  async findByEmail(email: string): Promise<UserDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return user ? this.mapToUserDto(user) : null;
  }

  // Retrieves a user by phone number.
  async findByPhone(phone: string): Promise<UserDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { phone },
    });

    return user ? this.mapToUserDto(user) : null;
  }

  // Updates a user's profile information.
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

  // Updates user's online status and last seen timestamp.
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

  // Sets user's offline status.
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

  // Maps Prisma User model to UserDto.
  private mapToUserDto(user: any): UserDto {
    // Explicitly exclude password field
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as UserDto;
  }
}
