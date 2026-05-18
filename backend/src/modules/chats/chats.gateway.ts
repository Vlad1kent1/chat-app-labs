import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface JwtPayload {
  sub: number;
  email: string;
  iat?: number;
  exp?: number;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatsGateway.name);
  private readonly activeConnections = new Map<number, Set<string>>();

  constructor(private readonly jwtService: JwtService, private readonly prisma: PrismaService) {}

  private emitToUser(userId: number, event: string, payload: any) {
    const sockets = this.activeConnections.get(userId);
    if (!sockets || sockets.size === 0) {
      return;
    }

    for (const socketId of sockets) {
      this.server.to(socketId).emit(event, payload);
    }
  }

  sendChatCreated(chat: any, members: number[]) {
    members.forEach((userId) => {
      this.emitToUser(userId, 'chat_created', { chat });
    });
  }

  sendMessageCreated(message: any, recipientIds: number[]) {
    recipientIds.forEach((userId) => {
      this.emitToUser(userId, 'message_created', { message });
    });
  }

  sendChatUpdated(chat: any, members: number[]) {
    members.forEach((userId) => {
      this.emitToUser(userId, 'chat_updated', { chat });
    });
  }

  sendMessageEdited(message: any, recipientIds: number[]) {
    recipientIds.forEach((userId) => {
      this.emitToUser(userId, 'message_edited', { message });
    });
  }

  sendMessageDeleted(messageId: number, chatId: number, recipientIds: number[]) {
    recipientIds.forEach((userId) => {
      this.emitToUser(userId, 'message_deleted', { messageId, chatId });
    });
  }

  async handleConnection(client: Socket) {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers.authorization?.toString().split(' ')[1];

    if (!token) {
      this.logger.warn('Socket connection rejected: missing token');
      client.disconnect();
      return;
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch (error) {
      this.logger.warn(`Socket connection rejected: invalid token (${(error as Error).message})`);
      client.disconnect();
      return;
    }

    const userId = Number(payload.sub);
    if (!userId || Number.isNaN(userId)) {
      this.logger.warn('Socket connection rejected: invalid user id');
      client.disconnect();
      return;
    }

    client.data.userId = userId;
    const sockets = this.activeConnections.get(userId) ?? new Set<string>();
    sockets.add(client.id);
    this.activeConnections.set(userId, sockets);

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isOnline: true },
      });
    } catch (error) {
      this.logger.error(`Failed to mark user online for userId ${userId}`, error as Error);
    }

    this.logger.log(`User ${userId} connected via socket ${client.id}`);
    this.server.emit('statusChanged', { userId, isOnline: true });
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId as number | undefined;
    if (!userId) {
      return;
    }

    const sockets = this.activeConnections.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.activeConnections.delete(userId);

        const lastSeen = new Date();
        try {
          await this.prisma.user.update({
            where: { id: userId },
            data: { isOnline: false, lastSeen },
          });
        } catch (error) {
          this.logger.error(`Failed to mark user offline for userId ${userId}`, error as Error);
        }

        this.logger.log(`User ${userId} disconnected and marked offline`);
        this.server.emit('statusChanged', { userId, isOnline: false, lastSeen });
        return;
      }

      this.activeConnections.set(userId, sockets);
    }

    this.logger.log(`Socket ${client.id} disconnected for user ${userId} (remaining connections: ${sockets?.size ?? 0})`);
  }
}
