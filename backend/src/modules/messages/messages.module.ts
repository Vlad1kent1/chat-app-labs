import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * MessagesModule
 * 
 * Encapsulates all message-related functionality following the Nest.js modular pattern.
 * This module is responsible for:
 * - Handling message CRUD operations
 * - Serving API endpoints for message retrieval and creation
 * 
 * Imports: PrismaModule to access database layer
 * Controllers: MessagesController for HTTP routes
 * Providers: MessagesService for business logic
 */
@Module({
  imports: [PrismaModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
