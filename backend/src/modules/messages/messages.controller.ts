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

// MessagesController
@Controller()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  // GET /chats/:id/messages
  @Get('chats/:id/messages')
  @UseGuards(JwtAuthGuard)
  async getMessagesByChat(
    @Param('id', ParseIntPipe) chatId: number,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ): Promise<MessageDto[]> {
    return this.messagesService.findAllByChat(chatId, page, pageSize);
  }

  // POST /messages
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
