import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * UsersModule
 * 
 * Encapsulates all user-related functionality following the Nest.js modular pattern.
 * This module is responsible for:
 * - Managing user profiles and authentication data
 * - Handling online status and heartbeat functionality
 * - Providing user lookup and profile update operations
 * 
 * Imports: PrismaModule to access database layer
 * Controllers: UsersController for HTTP routes
 * Providers: UsersService for business logic
 * Exports: UsersService for use in other modules (e.g., Auth)
 */
@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
