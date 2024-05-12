import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../roles/entities/role.entity';
import { UserRole } from '../roles/entities/userRoles.entity';
import { RedisModule } from 'src/redis/redis.module';
import { OtpModule } from 'src/otp/otp.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, UserRole]),
    RedisModule,
    OtpModule,
    CloudinaryModule,
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
