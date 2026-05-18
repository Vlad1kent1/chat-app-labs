import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageDto } from './dto/message.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { type User } from '@prisma/client/edge';
import { Patch, Delete } from '@nestjs/common';

/**
 * MessagesController
 * 
 * RESTful API endpoints for message operations.
 * Handles HTTP requests for retrieving and creating messages.
 * 
 * Endpoints:
 * - GET /chats/:id/messages - Retrieve paginated messages for a chat
 * - POST /messages - Create a new message
 * 
 * All responses are automatically wrapped by TransformInterceptor in the format:
 * { success: true, data: [...] }
 */
@Controller()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * GET /chats/:id/messages
   * 
   * Retrieves all messages for a specific chat with pagination support.
   * Returns messages ordered by most recent first.
   * 
   * Query Parameters:
   * @param page - Page number (1-indexed), defaults to 1
   * @param pageSize - Messages per page, defaults to 20
   * 
   * Path Parameters:
   * @param id - The chat ID to fetch messages for
   * 
   * Returns: Array of MessageDto objects
   * 
   * Example Request:
   * GET /chats/5/messages?page=1&pageSize=20
   * 
   * Example Response (wrapped by interceptor):
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "id": 42,
   *       "content": "Hello!",
   *       "type": "TEXT",
   *       "chatId": 5,
   *       "authorId": 3,
   *       "createdAt": "2026-05-13T10:30:00Z",
   *       "isRead": false
   *     }
   *   ]
   * }
   */
  @Get('chats/:id/messages')
  @UseGuards(JwtAuthGuard)
  async getMessagesByChat(
    @Param('id', ParseIntPipe) chatId: number,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ): Promise<MessageDto[]> {
    return this.messagesService.findAllByChat(chatId, page, pageSize);
  }

  /**
   * POST /messages
   * 
   * Creates a new message in the specified chat or creates a direct chat lazily.
   */
  @Post('messages')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createMessage(
    @Body() dto: CreateMessageDto,
    @GetUser() user: User,
  ): Promise<MessageDto> {
    return this.messagesService.create({
      ...dto,
      authorId: user.id,
    });
  }

  @Patch('messages/:id')
  @UseGuards(JwtAuthGuard)
  async updateMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body('content') content: string,
    @GetUser() user: User,
  ): Promise<MessageDto> {
    return this.messagesService.update(id, content, user.id);
  }

  @Delete('messages/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessage(@Param('id', ParseIntPipe) id: number, @GetUser() user: User): Promise<void> {
    return this.messagesService.delete(id, user.id);
  }
}
