import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Post,
  Req,
  Res,
  SerializeOptions,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Request, Response } from 'express';
import { RefreshTokenGuard } from './guards/refreshToken.guard';
import { AccessTokenGuard } from './guards/accessToken.guard';
import { GetUser } from './decorators/getUser.decorator';
import { User } from './users/entities/user.entity';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import { VerifyMailDto } from './dto/verify-mail.dto';
import { ReSendOtpDto } from './dto/resend-otp.dto';

@Controller('auth')
@SerializeOptions({ strategy: 'excludeAll' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  @UseInterceptors(ClassSerializerInterceptor)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.login(loginDto, response);
  }

  @Post('active/phone')
  async acctiveAccountByPhone(@Body() verifyPhoneDto: VerifyPhoneDto) {
    return this.authService.activeAccountByPhone(verifyPhoneDto);
  }

  @Post('active/mail')
  async acctiveAccountByMail(@Body() verifyMailDto: VerifyMailDto) {
    return this.authService.activeAccountByMail(verifyMailDto);
  }

  @Post('resend')
  async reSendOtp(@Body() reSendOtpDto: ReSendOtpDto) {
    return this.authService.reSendOtp(reSendOtpDto);
  }

  @Get('refreshtoken')
  @UseGuards(RefreshTokenGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  refreshTokens(@Req() req: Request) {
    const userId = req.user['id'];
    const refreshToken = req.user['refreshToken'];
    return this.authService.refreshTokens(userId, refreshToken);
  }

  @Get('logout')
  @UseGuards(AccessTokenGuard)
  logOut(
    @GetUser() user: User,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.signOut(user.id, response);
  }
}
