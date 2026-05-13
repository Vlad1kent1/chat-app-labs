import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ChatsService } from './chats.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { ChatDto } from './dto/chat.dto';

/**
 * ChatsController
 * 
 * RESTful API endpoints for chat operations.
 * Handles HTTP requests for creating, retrieving, and managing chats.
 * 
 * Endpoints:
 * - POST /chats - Create a new chat
 * - GET /chats/:id - Retrieve a specific chat
 * - GET /users/:userId/chats - Get all chats for a user
 * 
 * All responses are automatically wrapped by TransformInterceptor.
 */
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  /**
   * POST /chats
   * 
   * Creates a new chat (group or direct message).
   * 
   * Body Parameters (CreateChatDto):
   * @param title - Chat title (required for group chats, optional for DMs)
   * @param chatImageUrl - URL to chat image (optional)
   * @param isGroup - Flag indicating if group chat (defaults to false)
   * 
   * Returns: Created ChatDto
   * HTTP Status: 201 Created
   * 
   * Example Request:
   * POST /chats
   * Content-Type: application/json
   * 
   * {
   *   "title": "Project Team",
   *   "isGroup": true,
   *   "chatImageUrl": "https://example.com/group-avatar.jpg"
   * }
   * 
   * Example Response (wrapped by interceptor):
   * {
   *   "success": true,
   *   "data": {
   *     "id": 5,
   *     "title": "Project Team",
   *     "chatImageUrl": "https://example.com/group-avatar.jpg",
   *     "isGroup": true,
   *     "createdAt": "2026-05-13T10:00:00Z",
   *     "updatedAt": "2026-05-13T10:00:00Z"
   *   }
   * }
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateChatDto): Promise<ChatDto> {
    // TODO: Extract userId from JWT token via @GetUser() decorator
    const creatorId = 1; // Placeholder - replace with authenticated user ID
    return this.chatsService.create(dto, creatorId);
  }

  /**
   * GET /chats/:id
   * 
   * Retrieves a specific chat by ID.
   * 
   * Path Parameters:
   * @param id - The chat ID
   * 
   * Returns: ChatDto object
   * 
   * Example Request:
   * GET /chats/5
   * 
   * Example Response (wrapped by interceptor):
   * {
   *   "success": true,
   *   "data": {
   *     "id": 5,
   *     "title": "Project Team",
   *     "isGroup": true,
   *     "createdAt": "2026-05-13T10:00:00Z",
   *     "updatedAt": "2026-05-13T10:00:00Z"
   *   }
   * }
   * 
   * Errors:
   * - 404 Not Found: Chat with specified ID doesn't exist
   */
  @Get(':id')
  async getChat(@Param('id', ParseIntPipe) id: number): Promise<ChatDto> {
    return this.chatsService.findById(id);
  }

  /**
   * GET /users/:userId/chats
   * 
   * Retrieves all chats for a specific user.
   * Returns chats where the user is a member.
   * 
   * Path Parameters:
   * @param userId - The user ID to fetch chats for
   * 
   * Returns: Array of ChatDto objects
   * 
   * Example Request:
   * GET /users/3/chats
   * 
   * Example Response (wrapped by interceptor):
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "id": 5,
   *       "title": "Project Team",
   *       "isGroup": true,
   *       "createdAt": "2026-05-13T10:00:00Z",
   *       "updatedAt": "2026-05-13T10:00:00Z"
   *     },
   *     {
   *       "id": 6,
   *       "title": null,
   *       "isGroup": false,
   *       "createdAt": "2026-05-12T15:30:00Z",
   *       "updatedAt": "2026-05-12T15:30:00Z"
   *     }
   *   ]
   * }
   */
  @Get('user/:userId')
  async getUserChats(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<ChatDto[]> {
    return this.chatsService.findUserChats(userId);
  }
}
