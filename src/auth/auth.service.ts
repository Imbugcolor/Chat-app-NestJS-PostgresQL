import {
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

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
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

  async login(loginDto: LoginDto, res: Response): Promise<User> {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOneBy({ email });

    if (user && user.authStrategy !== AUTHSTRATEGY.LOCAL) {
      throw new UnauthorizedException(
        'This account has registed with other method.',
      );
    }

    if (user && (await bcryptjs.compare(password, user.password))) {
      const accessToken = await this.getAccessToken(user.id);
      const refreshToken = await this.getRefreshToken(user.id);

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        path: `/auth/refreshtoken`,
        maxAge: 7 * 24 * 60 * 60 * 1000, //7days
      });

      await this.updateUserEntityRefreshToken(user.id, refreshToken);

      return new User({ ...user, accessToken });
    } else {
      throw new UnauthorizedException('Please check your login credentials.');
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
