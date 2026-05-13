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
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageDto } from './dto/message.dto';

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
   * Creates a new message in the specified chat.
   * The authorId should be extracted from the authenticated user's JWT token.
   * 
   * Body Parameters (CreateMessageDto):
   * @param content - The message text content
   * @param chatId - The ID of the chat to post to
   * @param authorId - The ID of the user creating the message
   * @param type - Optional message type (TEXT or IMAGE), defaults to TEXT
   * 
   * Returns: The created MessageDto with generated id and timestamp
   * HTTP Status: 201 Created
   * 
   * Example Request:
   * POST /messages
   * Content-Type: application/json
   * 
   * {
   *   "content": "Hello, everyone!",
   *   "chatId": 5,
   *   "authorId": 3,
   *   "type": "TEXT"
   * }
   * 
   * Example Response (wrapped by interceptor):
   * {
   *   "success": true,
   *   "data": {
   *     "id": 43,
   *     "content": "Hello, everyone!",
   *     "type": "TEXT",
   *     "chatId": 5,
   *     "authorId": 3,
   *     "createdAt": "2026-05-13T10:35:00Z",
   *     "isRead": false
   *   }
   * }
   */
  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  async createMessage(@Body() dto: CreateMessageDto): Promise<MessageDto> {
    return this.messagesService.create(dto);
  }
}
