import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Role } from './entities/role.entity';
import { Repository } from 'typeorm';
import { UserRole } from './entities/userRoles.entity';
import { ROLES } from './enums/roles.enum';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
  ) {}

  async createRole(roleName: ROLES) {
    const roleExist = await this.roleRepository.findOneBy({
      role_name: roleName,
    });
    if (roleExist) {
      throw new BadRequestException('Role name already exists.');
    }

    const newRole = this.roleRepository.create({ role_name: roleName });

    return await this.roleRepository.save(newRole);
  }

  async grantAdminPermission(userId: number) {
    const user = await this.userRepository.findOneBy({ id: userId });

    const existUserRole = await this.userRoleRepository.findOneBy({ user });

    if (existUserRole && existUserRole.role?.role_name === 'admin') {
      throw new BadRequestException('Permission already granted.');
    }

    const adminRole = await this.roleRepository.findOneBy({
      role_name: ROLES.ADMIN,
    });

    const newUserRole = this.userRoleRepository.create({
      role: adminRole,
      user,
    });

    await this.userRoleRepository.save(newUserRole);

    return { status: HttpStatus.OK };
  }
}
