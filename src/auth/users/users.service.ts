import { BadRequestException, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcryptjs from 'bcryptjs';
import { RegisterDto } from '../dto/register.dto';
import { Role } from '../roles/entities/role.entity';
import { UserRole } from '../roles/entities/userRoles.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Role)
    private userRoleRepository: Repository<UserRole>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcryptjs.genSalt();
    return await bcryptjs.hash(password, salt);
  }

  public async register(registerDto: RegisterDto): Promise<User> {
    const { username, email, password } = registerDto;
    const usernameExist = await this.userRepository.findOneBy({ username });
    const emailExist = await this.userRepository.findOneBy({ email });

    if (usernameExist) {
      throw new BadRequestException('Username already in use.');
    }

    if (emailExist) {
      throw new BadRequestException('Email has been registed.');
    }

    const hashedPassword = await this.hashPassword(password);

    const userObj = {
      username,
      fullname: username,
      email,
      password: hashedPassword,
    };
    const user = new User(userObj);

    await this.userRepository.save(user);

    return user;
  }
}
