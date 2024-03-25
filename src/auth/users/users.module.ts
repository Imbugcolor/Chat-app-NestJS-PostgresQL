import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../roles/entities/role.entity';
import { UserRole } from '../roles/entities/userRoles.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, UserRole])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
