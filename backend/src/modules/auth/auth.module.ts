import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * AuthModule
 * 
 * Encapsulates all authentication functionality following the Nest.js modular pattern.
 * This module is responsible for:
 * - User registration with auto-generated usernames
 * - User login via email or phone
 * - Password hashing and verification
 * - JWT token generation and validation
 * 
 * Imports:
 * - JwtModule: For token generation and verification
 * - UsersModule: For user lookup and creation
 * - PrismaModule: For database access
 * 
 * Controllers: AuthController for HTTP routes
 * Providers: AuthService for authentication business logic
 * 
 * JWT Configuration:
 * - Secret key should be stored in environment variables
 * - Token expiration: 7 days
 */
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
    UsersModule,
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
