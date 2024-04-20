import { BadRequestException, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcryptjs from 'bcryptjs';
import { RegisterDto } from '../dto/register.dto';
import { Role } from '../roles/entities/role.entity';
import { UserRole } from '../roles/entities/userRoles.entity';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Role)
    private userRoleRepository: Repository<UserRole>,
    private redisService: RedisService,
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

  public async getUsers(searchTerm: string) {
    const users = await this.userRepository
      .createQueryBuilder()
      .select()
      .where('username ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .orWhere('email ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
      .getManyAndCount();

    return users;
  }

  public async getUsersOnline() {
    const keys = await this.redisService.getKeys();
    const userIds: number[] = keys.map((key: string) => {
      const parts = key.split(':');
      return parseInt(parts[1]); // Extract the number part and convert it to an integer
    });

    return userIds;
  }
}
