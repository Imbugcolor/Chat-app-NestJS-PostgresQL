import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Role } from './entities/role.entity';
import { UserRole } from './entities/userRoles.entity';
import { RolesService } from './roles.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, UserRole])],
  providers: [RolesService],
  controllers: [],
  exports: [RolesService],
})
export class RolesModule {}
