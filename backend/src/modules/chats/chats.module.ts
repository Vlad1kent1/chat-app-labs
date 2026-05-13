import { Module } from '@nestjs/common';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * ChatsModule
 * 
 * Encapsulates all chat-related functionality following the Nest.js modular pattern.
 * This module is responsible for:
 * - Creating and managing chats (group and direct messages)
 * - Serving API endpoints for chat operations
 * - Managing chat members
 * 
 * Imports: PrismaModule to access database layer
 * Controllers: ChatsController for HTTP routes
 * Providers: ChatsService for business logic
 */
@Module({
  imports: [PrismaModule],
  controllers: [ChatsController],
  providers: [ChatsService],
  exports: [ChatsService],
})
export class ChatsModule {}
