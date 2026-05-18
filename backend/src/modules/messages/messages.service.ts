import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageDto } from './dto/message.dto';
import { ChatsGateway } from '../chats/chats.gateway';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService, private readonly chatsGateway: ChatsGateway) {}

  async findAllByChat(
    chatId: number,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<MessageDto[]> {
    const skip = Math.max(0, (page - 1) * pageSize);
    const take = Math.max(1, pageSize);

    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      skip,
      take,
      include: {
        author: true,
      },
    });

    return messages as MessageDto[];
  }

  async create(dto: CreateMessageDto): Promise<MessageDto> {
    const authorId = dto.authorId;
    if (!authorId) {
      throw new BadRequestException('Author ID is required to create a message.');
    }

    let chatId = dto.chatId;
    let createdChat: any | null = null;
    let chatMemberIds: number[] = [];

    if (!chatId) {
      if (!dto.recipientId) {
        throw new BadRequestException('Either chatId or recipientId must be provided.');
      }

      const authorIdNumber = Number(authorId);
      const recipientIdNumber = Number(dto.recipientId);

      // Зверни увагу: у твоїй новій міграції таблиця називається `participants` або `members`? 
      // Залишаю як у тебе (members), але перевір відповідність новій схемі!
      const existingChat = await this.prisma.chat.findFirst({
        where: {
          type: 'DIRECT',
          AND: [
            { members: { some: { userId: authorIdNumber } } },
            { members: { some: { userId: recipientIdNumber } } },
          ],
        },
        include: { members: true },
      });

      if (existingChat) {
        chatId = existingChat.id;
      } else {
        createdChat = await this.prisma.chat.create({
          data: {
            type: 'DIRECT',
            members: {
              create: [
                { userId: authorIdNumber, role: 'MEMBER' },
                { userId: recipientIdNumber, role: 'MEMBER' },
              ],
            },
          },
        });
        chatId = createdChat.id;
        chatMemberIds = [authorIdNumber, recipientIdNumber];
      }
    }

    // 🌟 ФІКС ПОМИЛКИ: Гарантуємо TypeScript, що chatId існує і є числом
    if (!chatId) {
      throw new BadRequestException('Chat could not be found or created.');
    }

    // Тепер TypeScript знає, що тут chatId — це суворо number
    const message = await this.prisma.message.create({
      data: {
        content: dto.content,
        type: dto.type || 'TEXT',
        chatId, // 🔥 Більше не свариться!
        authorId,
      },
      include: {
        author: true,
      },
    });

    const memberRecords = await this.prisma.chatMember.findMany({
      where: { chatId },
      select: { userId: true },
    });

    const recipients = memberRecords
      .map((member) => member.userId)
      .filter((userId) => userId !== authorId);

    if (createdChat) {
      this.chatsGateway.sendChatCreated(createdChat, chatMemberIds);
    }

    this.chatsGateway.sendMessageCreated(message, recipients);

    return message as MessageDto;
  }

  async findById(messageId: number): Promise<MessageDto | null> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { author: true },
    });

    return message as MessageDto | null;
  }

  async update(messageId: number, newContent: string, requesterId: number): Promise<MessageDto> {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.authorId !== requesterId) {
      throw new ForbiddenException('Only the message author can edit this message');
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { content: newContent },
      include: { author: true },
    });

    // notify chat members
    const members = await this.prisma.chatMember.findMany({ where: { chatId: updated.chatId }, select: { userId: true } });
    const recipientIds = members.map((m) => m.userId).filter((id) => id !== requesterId);
    this.chatsGateway.sendMessageEdited(updated, recipientIds);

    return updated as MessageDto;
  }

  async delete(messageId: number, requesterId: number): Promise<void> {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.authorId !== requesterId) {
      throw new ForbiddenException('Only the message author can delete this message');
    }

    await this.prisma.message.delete({ where: { id: messageId } });

    const members = await this.prisma.chatMember.findMany({ where: { chatId: message.chatId }, select: { userId: true } });
    const recipientIds = members.map((m) => m.userId).filter((id) => id !== requesterId);
    this.chatsGateway.sendMessageDeleted(messageId, message.chatId, recipientIds);
  }

  async markAsRead(messageId: number): Promise<MessageDto> {
    const message = await this.prisma.message.update({
      where: { id: messageId },
      data: { isRead: true },
      include: { author: true },
    });

    return message as MessageDto;
  }
}
