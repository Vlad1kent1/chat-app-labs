import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { ChatDto } from './dto/chat.dto';

/**
 * ChatsService
 * 
 * This service handles all chat-related database operations.
 * Manages chat creation, retrieval, and member management.
 * 
 * Key Methods:
 * - create: Creates a new chat
 * - findById: Retrieves a chat by ID
 * - findUserChats: Gets all chats for a specific user
 * - addMember: Adds a user to a chat
 * 
 * All operations are asynchronous and use Prisma for database access.
 * Follows the Single Responsibility Principle by isolating chat business logic.
 */
@Injectable()
export class ChatsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Creates a new chat.
   * 
   * Supports both direct messages and group chats.
   * For group chats, title and chatImageUrl can be provided.
   * 
   * @param dto - CreateChatDto with optional title and image
   * @param creatorId - The ID of the user creating the chat
   * @returns Promise resolving to created ChatDto
   * 
   * Example:
   * const chat = await chatsService.create({
   *   title: 'Project Team',
   *   isGroup: true
   * }, 3);
   */
  async create(dto: CreateChatDto, creatorId: number): Promise<ChatDto> {
    const chat = await this.prisma.chat.create({
      data: {
        title: dto.title,
        chatImageUrl: dto.chatImageUrl,
        isGroup: dto.isGroup || false,
        members: {
          create: {
            userId: creatorId,
            role: 'ADMIN',
          },
        },
      },
    });

    return this.mapToChatDto(chat);
  }

  /**
   * Retrieves a chat by its ID.
   * 
   * @param chatId - The ID of the chat to retrieve
   * @returns Promise resolving to ChatDto
   * @throws NotFoundException if chat doesn't exist
   */
  async findById(chatId: number): Promise<ChatDto> {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      throw new NotFoundException(`Chat with ID ${chatId} not found`);
    }

    return this.mapToChatDto(chat);
  }

  /**
   * Retrieves all chats for a specific user.
   * Returns chats where the user is a member.
   * 
   * @param userId - The user ID to fetch chats for
   * @returns Promise resolving to array of ChatDto
   */
  async findUserChats(userId: number): Promise<ChatDto[]> {
    const memberships = await this.prisma.chatMember.findMany({
      where: { userId },
      include: {
        chat: true,
      },
    });

    return memberships.map((membership) => this.mapToChatDto(membership.chat));
  }

  /**
   * Adds a user to a chat as a member.
   * 
   * @param chatId - The chat ID to add member to
   * @param userId - The user ID to add
   * @param role - The role of the member (ADMIN or MEMBER), defaults to MEMBER
   * @returns Promise resolving to void
   * @throws NotFoundException if chat or user doesn't exist
   */
  async addMember(
    chatId: number,
    userId: number,
    role: string = 'MEMBER',
  ): Promise<void> {
    // Verify chat exists
    await this.findById(chatId);

    await this.prisma.chatMember.create({
      data: {
        chatId,
        userId,
        role,
      },
    });
  }

  /**
   * Removes a user from a chat.
   * 
   * @param chatId - The chat ID
   * @param userId - The user ID to remove
   * @returns Promise resolving to void
   */
  async removeMember(chatId: number, userId: number): Promise<void> {
    await this.prisma.chatMember.deleteMany({
      where: {
        chatId,
        userId,
      },
    });
  }

  /**
   * Maps Prisma Chat model to ChatDto.
   * 
   * @param chat - The Prisma Chat model
   * @returns ChatDto for API responses
   * @private
   */
  private mapToChatDto(chat: any): ChatDto {
    return {
      id: chat.id,
      title: chat.title,
      chatImageUrl: chat.chatImageUrl,
      isGroup: chat.isGroup,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  }
}
