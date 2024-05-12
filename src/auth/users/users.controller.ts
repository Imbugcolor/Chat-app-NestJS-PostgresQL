import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  SerializeOptions,
  UploadedFile,
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
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('users')
@SerializeOptions({ strategy: 'excludeAll' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
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

  @Get('profile/:id')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  async getUserProfile(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUser(id);
  }

  @Get('search')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  async getUsers(@Query('searchTerm') searchTerm: string) {
    return this.usersService.getUsers(searchTerm);
  }

  @Get('admin')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  async getAdminResource() {
    return 'Admin resouce';
  }

  @Get('online')
  @UseGuards(AccessTokenGuard)
  async getUsersOnline() {
    return this.usersService.getUsersOnline();
  }

  @Patch('update')
  @UseGuards(AccessTokenGuard)
  async updateUserProfile(
    @GetUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user, updateProfileDto);
  }

  @Patch('photo')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(FileInterceptor('file'))
  async updateUserPhoto(
    @GetUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.updateUserPhoto(user, file);
  }
}
