import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { ChatDto } from './dto/chat.dto';
import { MessageDto } from '../messages/dto/message.dto';
import { ChatsGateway } from './chats.gateway';

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
  constructor(private prisma: PrismaService, private readonly chatsGateway: ChatsGateway) {}

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
    const isGroup = Boolean(dto.isGroup);
    const title = dto.title?.trim() || dto.name?.trim();

    if (isGroup && !title) {
      throw new BadRequestException('Group chat title is required.');
    }

    const rawMemberIds = Array.isArray(dto.memberIds)
      ? dto.memberIds
      : Array.isArray(dto.userIds)
      ? dto.userIds
      : [];

    const memberIds = Array.from(new Set(rawMemberIds.filter((id) => id !== creatorId)));

    const chat = await this.prisma.chat.create({
      data: {
        title,
        chatImageUrl: dto.chatImageUrl,
        type: isGroup ? 'GROUP' : 'DIRECT',
        members: {
          create: [
            { userId: creatorId, role: 'ADMIN' },
            ...memberIds.map((userId) => ({ userId, role: 'MEMBER' })),
          ],
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { author: true },
        },
      },
    });

    const chatMemberIds = [creatorId, ...memberIds];
    if (isGroup) {
      this.chatsGateway.sendChatCreated(chat, chatMemberIds);
    }

    return this.mapToChatDto(chat);
  }

  async createGroup(dto: CreateChatDto, creatorId: number): Promise<ChatDto> {
    return this.create({ ...dto, isGroup: true }, creatorId);
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
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { author: true },
        },
        members: { include: { user: true } },
      },
    });

    if (!chat) {
      throw new NotFoundException(`Chat with ID ${chatId} not found`);
    }

    return this.mapToChatDto(chat);
  }

  /**
   * Retrieves all chats.
   * 
   * @returns Promise resolving to array of ChatDto
   */
  async findAll(): Promise<ChatDto[]> {
    const chats = await this.prisma.chat.findMany({
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { author: true },
        },
        members: { include: { user: true } },
      },
    });
    return chats.map((chat) => this.mapToChatDto(chat));
  }

  /**
   * Retrieves all chats for a specific user.
   * Returns chats where the user is a member.
   * 
   * @param userId - The user ID to fetch chats for
   * @returns Promise resolving to array of ChatDto
   */
  async findUserChats(userId: number): Promise<ChatDto[]> {
    const chats = await this.prisma.chat.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { author: true },
        },
        members: { include: { user: true } },
      },
    });

    return chats.map((chat) => this.mapToChatDto(chat));
  }

  async findDirectChatBetweenUsers(userId: number, recipientId: number): Promise<ChatDto> {
    const chat = await this.prisma.chat.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: recipientId } } },
        ],
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { author: true },
        },
        members: { include: { user: true } },
      },
    });

    if (!chat) {
      throw new NotFoundException('Direct chat not found');
    }

    return this.mapToChatDto(chat);
  }

  async search(query: string, currentUserId: number): Promise<{ users: any[]; chats: ChatDto[] }> {
    const normalizedSearch = query.trim();

    if (!normalizedSearch) {
      return { users: [], chats: [] };
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        OR: [
          { username: { contains: normalizedSearch, mode: 'insensitive' } },
          { firstName: { contains: normalizedSearch, mode: 'insensitive' } },
          { lastName: { contains: normalizedSearch, mode: 'insensitive' } },
          { phone: { contains: normalizedSearch, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });

    const chats = await this.prisma.chat.findMany({
      where: {
        type: 'GROUP',
        title: { contains: normalizedSearch, mode: 'insensitive' },
        members: {
          some: {
            userId: currentUserId,
          },
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { author: true },
        },
        members: { include: { user: true } },
      },
      take: 20,
    });

    return {
      users,
      chats: chats.map((chat) => this.mapToChatDto(chat)),
    };
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

  async addParticipants(chatId: number, userIds: number[], requesterId: number): Promise<void> {
    const chat = await this.prisma.chat.findUnique({ where: { id: chatId }, include: { members: true } });
    if (!chat) {
      throw new NotFoundException(`Chat ${chatId} not found`);
    }

    const toAdd = Array.from(new Set(userIds)).filter((id) => !chat.members.some((m) => m.userId === id));
    if (toAdd.length === 0) return;

    await this.prisma.$transaction(
      toAdd.map((userId) =>
        this.prisma.chatMember.create({ data: { chatId, userId, role: 'MEMBER' } }),
      ),
    );

    // Inform members via gateway
    const memberRecords = await this.prisma.chatMember.findMany({ where: { chatId }, select: { userId: true } });
    const memberIds = memberRecords.map((m) => m.userId);
    const chatWithMembers = await this.prisma.chat.findUnique({ where: { id: chatId }, include: { members: { include: { user: true } }, messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { author: true } } } });
    if (chatWithMembers) {
      this.chatsGateway.sendChatUpdated(chatWithMembers, memberIds);
    }
  }

  async updateTitle(chatId: number, newTitle: string, requesterId: number): Promise<ChatDto> {
    const chat = await this.prisma.chat.findUnique({ where: { id: chatId }, include: { members: true } });
    if (!chat) {
      throw new NotFoundException(`Chat ${chatId} not found`);
    }

    // ensure requester is a member
    const isMember = chat.members.some((m) => m.userId === requesterId);
    if (!isMember) {
      throw new BadRequestException('Only chat members can rename the chat.');
    }

    const updated = await this.prisma.chat.update({
      where: { id: chatId },
      data: { title: newTitle || null },
      include: { members: { include: { user: true } }, messages: { orderBy: { createdAt: 'desc' }, take: 1, include: { author: true } } },
    });

    const memberIds = updated.members.map((m) => m.userId);
    this.chatsGateway.sendChatUpdated(updated, memberIds);

    return this.mapToChatDto(updated);
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
      type: chat.type,
      isGroup: chat.type === 'GROUP',
      lastMessage: chat.messages?.[0] ? (chat.messages[0] as MessageDto) : undefined,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      members: Array.isArray(chat.members)
        ? chat.members.map((m: any) => {
            const user = m.user ?? m;
            return {
              id: user.id,
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName ?? null,
              avatarUrl: user.avatarUrl ?? null,
            };
          })
        : undefined,
    };
  }
}
