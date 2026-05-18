import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ChatsService } from './chats.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { ChatDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { type User } from '@prisma/client/edge';

// ChatsController
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  // POST /chats
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateChatDto,
    @GetUser() user: User,
  ): Promise<ChatDto> {
    const creatorId = user.id;
    return this.chatsService.create(dto, creatorId);
  }

  @Post('group')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createGroup(
    @Body() dto: CreateChatDto,
    @GetUser() user: User,
  ): Promise<ChatDto> {
    const creatorId = user.id;
    return this.chatsService.createGroup(dto, creatorId);
  }

  // GET /chats/search
  @Get('search')
  @UseGuards(JwtAuthGuard)
  async search(
    @Query('query') query: string,
    @GetUser() user: User,
  ): Promise<{ users: any[]; chats: ChatDto[] }> {
    return this.chatsService.search(query, user.id);
  }

  // GET /chats
  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllChats(@GetUser() user: User): Promise<ChatDto[]> {
    return this.chatsService.findUserChats(user.id);
  }

  // GET /chats/check-direct/:recipientId
  @Get('check-direct/:recipientId')
  @UseGuards(JwtAuthGuard)
  async checkDirectChat(
    @Param('recipientId', ParseIntPipe) recipientId: number,
    @GetUser() user: User,
  ): Promise<ChatDto> {
    return this.chatsService.findDirectChatBetweenUsers(user.id, recipientId);
  }

  // GET /chats/:id
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getChat(@Param('id', ParseIntPipe) id: number): Promise<ChatDto> {
    return this.chatsService.findById(id);
  }

  // PATCH /chats/:id
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateChatTitle(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Partial<CreateChatDto>,
    @GetUser() user: User,
  ): Promise<ChatDto> {
    const newTitle = (body.title || body.name || '').trim();
    return this.chatsService.updateTitle(id, newTitle, user.id);
  }

  // POST /chats/:id/participants
  @Post(':id/participants')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async addParticipants(
    @Param('id', ParseIntPipe) id: number,
    @Body('userIds') userIds: number[],
    @GetUser() user: User,
  ): Promise<ChatDto> {
    await this.chatsService.addParticipants(id, userIds, user.id);
    return this.chatsService.findById(id);
  }

  // GET /users/:userId/chats
  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  async getUserChats(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<ChatDto[]> {
    return this.chatsService.findUserChats(userId);
  }
}
