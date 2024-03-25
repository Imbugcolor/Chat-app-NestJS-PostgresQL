import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Post,
  SerializeOptions,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { RegisterDto } from '../dto/register.dto';
import { AccessTokenGuard } from '../guards/accessToken.guard';
import { GetUser } from '../decorators/getUser.decorator';
import { User } from './entities/user.entity';
import { Roles } from '../decorators/roles.decorator';
import { ROLES } from '../roles/enums/roles.enum';
import { RolesGuard } from '../guards/roles.guard';

@Controller('users')
@SerializeOptions({ strategy: 'excludeAll' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseInterceptors(ClassSerializerInterceptor)
  async register(@Body() registerDto: RegisterDto) {
    if (registerDto.password !== registerDto.cf_password) {
      throw new BadRequestException('Confirm password did not match.');
    }
    return this.usersService.register(registerDto);
  }

  @Get()
  @UseGuards(AccessTokenGuard)
  async getUser(@GetUser() user: User) {
    return user;
  }

  @Get('admin')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  async getAdminResource() {
    return 'Admin resouce';
  }
}
