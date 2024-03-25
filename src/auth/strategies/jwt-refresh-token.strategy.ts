import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { JwtPayload } from '../interface/jwtPayload.interface';

@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    super({
      secretOrKey: configService.get('JWT_REFRESH_TOKEN_SECRET'),
      ignoreExpiration: false,
      passReqToCallback: true,
      jwtFromRequest: ExtractJwt.fromExtractors([
        JwtRefreshTokenStrategy.extractJWTFromCookie,
      ]),
    });
  }

  private static extractJWTFromCookie(req: Request): string | null {
    if (req.cookies && req.cookies.refresh_token) {
      return req.cookies.refresh_token;
    }
    return null;
  }

  async validate(req: Request, payload: JwtPayload) {
    if (!payload) {
      throw new BadRequestException('invalid jwt token');
    }
    if (req.cookies && req.cookies.refresh_token) {
      return { ...payload, refreshToken: req.cookies.refresh_token };
    }
  }
}
