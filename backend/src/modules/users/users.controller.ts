import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import * as PrismaClient from '@prisma/client';

// UsersController
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users/:id
  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) id: number): Promise<UserDto> {
    return this.usersService.findById(id);
  }

  // PATCH /users/profile
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @GetUser() user: PrismaClient.User,
    @Body() dto: UpdateUserDto,
  ): Promise<UserDto> {
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.usersService.updateProfile(user.id, dto);
  }

  // DELETE /users/profile
  @Delete('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProfile(
    @GetUser() user: PrismaClient.User,
  ): Promise<void> {

    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.usersService.deleteAccount(user.id);
  }

  // PATCH /users/status
  @Patch('status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateStatus(@GetUser() user: PrismaClient.User): Promise<UserDto> {
    if (!user || !user.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.usersService.updateStatus(user.id);
  }
}
