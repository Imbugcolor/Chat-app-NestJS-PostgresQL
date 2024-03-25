import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from './users/entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { UsersController } from './users/users.controller';
import { UsersModule } from './users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthController } from './auth.controller';
import { RolesController } from './roles/roles.controller';
import { RolesModule } from './roles/roles.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([User]),
    JwtModule.register({}),
    UsersModule,
    RolesModule,
  ],
  controllers: [UsersController, AuthController, RolesController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
