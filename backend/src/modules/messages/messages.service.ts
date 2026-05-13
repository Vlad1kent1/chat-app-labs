import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageDto } from './dto/message.dto';

/**
 * MessagesService
 * 
 * This service handles all message-related database operations for the Chat Application.
 * It follows the Single Responsibility Principle by isolating message business logic.
 * 
 * Key Methods:
 * - findAllByChat: Retrieves paginated messages for a specific chat
 * - create: Saves a new message to the database
 * 
 * All operations are asynchronous and use Prisma for database access.
 */
@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves all messages for a specific chat with pagination.
   * 
   * Queries the Message table filtered by chatId, orders by creation date (newest first),
   * and applies pagination using skip/take parameters.
   * 
   * @param chatId - The ID of the chat to fetch messages for
   * @param page - The page number (1-indexed), defaults to 1
   * @param pageSize - Number of messages per page, defaults to 20
   * @returns Promise resolving to an array of MessageDto objects
   * 
   * Example: 
   * const messages = await messagesService.findAllByChat(5, 1, 20);
   * Returns the first 20 most recent messages from chat with ID 5.
   */
  async findAllByChat(
    chatId: number,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<MessageDto[]> {
    // Validate pagination parameters
    const skip = Math.max(0, (page - 1) * pageSize);
    const take = Math.max(1, pageSize);

    // Query messages ordered by newest first
    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });

    return messages as MessageDto[];
  }

  /**
   * Creates a new message in the database.
   * 
   * Inserts a new Message record with the provided data.
   * The message is immediately available for retrieval after creation.
   * 
   * @param dto - CreateMessageDto containing message content, chatId, and authorId
   * @returns Promise resolving to the created MessageDto with generated id and timestamps
   * 
   * Example:
   * const newMessage = await messagesService.create({
   *   content: 'Hello!',
   *   chatId: 5,
   *   authorId: 3,
   *   type: 'TEXT'
   * });
   */
  async create(dto: CreateMessageDto): Promise<MessageDto> {
    const message = await this.prisma.message.create({
      data: {
        content: dto.content,
        type: dto.type || 'TEXT',
        chatId: dto.chatId,
        authorId: dto.authorId,
      },
    });

    return message as MessageDto;
  }

  /**
   * Retrieves a single message by its ID.
   * Used for validating message existence before read operations.
   * 
   * @param messageId - The ID of the message to retrieve
   * @returns Promise resolving to MessageDto or null if not found
   */
  async findById(messageId: number): Promise<MessageDto | null> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    return message as MessageDto | null;
  }

  /**
   * Marks a message as read.
   * Called when a user views a message.
   * 
   * @param messageId - The ID of the message to mark as read
   * @returns Promise resolving to the updated MessageDto
   */
  async markAsRead(messageId: number): Promise<MessageDto> {
    const message = await this.prisma.message.update({
      where: { id: messageId },
      data: { isRead: true },
    });

    return message as MessageDto;
  }
}
