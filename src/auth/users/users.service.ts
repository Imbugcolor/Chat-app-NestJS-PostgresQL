import { BadRequestException, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcryptjs from 'bcryptjs';
import { RegisterDto } from '../dto/register.dto';
import { Role } from '../roles/entities/role.entity';
import { UserRole } from '../roles/entities/userRoles.entity';
import { RedisService } from 'src/redis/redis.service';
import { OtpService } from 'src/otp/otp.service';
import { HttpResponse } from 'src/httpReponses/http.response';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

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
    private otpService: OtpService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcryptjs.genSalt();
    return await bcryptjs.hash(password, salt);
  }

  public async register(registerDto: RegisterDto) {
    const { username, email, password, phone } = registerDto;
    const usernameExist = await this.userRepository.findOneBy({ username });

    let messageResponse: string = '';

    if (usernameExist) {
      throw new BadRequestException('Username already in use.');
    }

    if (email) {
      const emailExist = await this.userRepository.findOneBy({ email });
      if (emailExist) {
        throw new BadRequestException('Email has been registed.');
      }
      await this.otpService.sendOtpMail(email);
      messageResponse =
        'We have just sent you an OTP code to your email, please check to activate your account.';
    }

    if (phone) {
      const phoneExist = await this.userRepository.findOneBy({ phone });
      if (phoneExist) {
        throw new BadRequestException('Phone number has been registed.');
      }
      if (!email) {
        await this.otpService.sendOtpSMS(phone);
        messageResponse =
          'We have just sent you an OTP code to your phone, please check to activate your account.';
      }
    }

    const hashedPassword = await this.hashPassword(password);

    const userObj = {
      username,
      fullname: username,
      email: email ? email : null,
      password: hashedPassword,
      phone: phone ? phone : null,
    };
    const user = new User(userObj);

    await this.userRepository.save(user);

    return new HttpResponse(messageResponse).success();
  }

  public async updateProfile(user: User, updateProfileDto: UpdateProfileDto) {
    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set(updateProfileDto)
      .where('id = :id', { id: user.id })
      .execute();

    return new HttpResponse().success();
  }

  public async updateUserPhoto(user: User, file: Express.Multer.File) {
    const photo_upload = await this.cloudinaryService.uploadFile(file);

    const { secure_url } = photo_upload;

    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({ avatar: secure_url })
      .where('id = :id', { id: user.id })
      .execute();

    return secure_url;
  }

  public async getUser(id: number) {
    const user = await this.userRepository.findOneBy({ id });
    return new User(user);
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
