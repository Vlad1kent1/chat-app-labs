import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UserDto } from './dto/user.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';
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

  // PATCH /users/:id
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ): Promise<UserDto> {
    return this.usersService.updateProfile(id, dto);
  }

  // PATCH /users/status
  @Patch('status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(@GetUser() user: PrismaClient.User): Promise<UserDto> {
    if (!user || !user.id) {
      throw new Error('User not authenticated');
    }
    return this.usersService.updateStatus(user.id);
  }
}
