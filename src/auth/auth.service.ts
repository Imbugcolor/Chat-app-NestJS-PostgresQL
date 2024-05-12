import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './users/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcryptjs from 'bcryptjs';
import { Response } from 'express';
import { AUTHSTRATEGY } from './users/enums/authStrategy.enum';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import { OtpService } from 'src/otp/otp.service';
import { HttpResponse } from 'src/httpReponses/http.response';
import { VerifyMailDto } from './dto/verify-mail.dto';
import { ERROR_CODE } from './error_code/error.code';
import { ReSendOtpDto } from './dto/resend-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private otpService: OtpService,
  ) {}

  private async hashData(data: string): Promise<string> {
    const salt = await bcryptjs.genSalt();
    const hashedData = await bcryptjs.hash(data, salt);
    return hashedData;
  }

  private async updateUserEntityRefreshToken(
    userId: number,
    refreshToken: string,
  ): Promise<User> {
    const hashedRefreshToken = await this.hashData(refreshToken);

    const user = await this.userRepository.findOneBy({ id: userId });

    if (!user) {
      throw new UnauthorizedException('Invalid token.');
    }

    user.rf_token = hashedRefreshToken;

    return await this.userRepository.save(user);
  }

  private async getAccessToken(userId: number): Promise<string> {
    const accessToken = await this.jwtService.signAsync(
      {
        id: userId,
      },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      },
    );

    return accessToken;
  }

  private async getRefreshToken(userId: number): Promise<string> {
    const refreshToken = await this.jwtService.signAsync(
      {
        id: userId,
      },
      {
        secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
        expiresIn: '7d',
      },
    );

    return refreshToken;
  }

  public async activeAccountByPhone(verifyPhoneDto: VerifyPhoneDto) {
    const { phone, code } = verifyPhoneDto;
    const user = await this.userRepository.findOneBy({ phone });

    if (!user) {
      throw new BadRequestException({
        error_code: ERROR_CODE.ERR_100,
        message: 'Phone number have not registed yet.',
      });
    }

    const verifyCode = await this.otpService.verifyOtpSMS(phone, code);

    if (verifyCode.valid !== true) {
      throw new UnauthorizedException({
        error_code: ERROR_CODE.ERR_104,
        message: 'Account activated failed.',
      });
    }

    const activeUser = new User({ ...user, isActive: true });
    await this.userRepository.save(activeUser);

    return new HttpResponse('Account activated successfully.').success();
  }

  public async activeAccountByMail(verifyMailDto: VerifyMailDto) {
    const { email, otp } = verifyMailDto;

    const user = await this.userRepository.findOneBy({ email });

    if (!user) {
      throw new BadRequestException({
        error_code: ERROR_CODE.ERR_100,
        message: 'Email have not registed yet.',
      });
    }

    if (await this.otpService.verifyOtpMail(email, otp)) {
      const activeUser = new User({ ...user, isActive: true });
      await this.userRepository.save(activeUser);
      return new HttpResponse('Account activated successfully.').success();
    } else {
      throw new UnauthorizedException({
        error_code: ERROR_CODE.ERR_104,
        message: 'Account activated failed.',
      });
    }
  }

  async reSendOtp(reSendOtpDto: ReSendOtpDto) {
    const { phone, email } = reSendOtpDto;
    try {
      if (email) {
        await this.otpService.sendOtpMail(email);
      } else {
        await this.otpService.sendOtpSMS(phone);
      }
      return new HttpResponse('Send OK.').success();
    } catch (error) {
      throw new UnauthorizedException({
        error_code: ERROR_CODE.ERR_104,
        message: 'Account activated failed.',
      });
    }
  }

  async login(loginDto: LoginDto, res: Response): Promise<User> {
    const { email, password, phone } = loginDto;
    let user: User;
    if (email) {
      user = await this.userRepository.findOne({ where: { email } });
    }

    if (phone) {
      user = await this.userRepository.findOne({ where: { phone } });
    }

    if (user && user.authStrategy !== AUTHSTRATEGY.LOCAL) {
      throw new UnauthorizedException({
        error_code: ERROR_CODE.ERR_101,
        message: 'This account has registed with other method.',
      });
    }

    if (user && !user.isActive) {
      throw new UnauthorizedException({
        error_code: ERROR_CODE.ERR_102,
        message: 'This account have not activated.',
      });
    }

    if (user && (await bcryptjs.compare(password, user.password))) {
      const accessToken = await this.getAccessToken(user.id);
      const refreshToken = await this.getRefreshToken(user.id);

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        path: `/auth/refreshtoken`,
        sameSite: 'none',
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, //7days
      });

      await this.updateUserEntityRefreshToken(user.id, refreshToken);

      return new User({ ...user, accessToken });
    } else {
      throw new UnauthorizedException({
        error_code: ERROR_CODE.ERR_103,
        message: 'Please check your login credentials.',
      });
    }
  }

  async refreshTokens(userId: number, refreshToken: string) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user || !user.rf_token) throw new ForbiddenException('Access Denied');
    const refreshTokenMatches = await bcryptjs.compare(
      refreshToken,
      user.rf_token,
    );
    if (!refreshTokenMatches) throw new ForbiddenException('Access Denied');
    const accessToken = await this.getAccessToken(user.id);
    return new User({ ...user, accessToken });
  }

  async signOut(userId: number, res: Response): Promise<{ msg: string }> {
    res.clearCookie('refresh_token', { path: `/auth/refreshtoken` });

    const user = await this.userRepository.findOneBy({ id: userId });

    user.rf_token = '';

    await this.userRepository.save(user);

    return { msg: 'Logged Out.' };
  }
}
