import { User } from 'src/auth/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  JoinColumn,
  CreateDateColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { Message } from './message.entity';

@Entity()
export class UserReadMessage {
  constructor(partial: Partial<UserReadMessage>) {
    Object.assign(this, partial);
  }

  @PrimaryGeneratedColumn()
  @Expose()
  id: number;

  @ManyToOne(() => Message, (msg) => msg.usersRead)
  @JoinColumn()
  @Expose()
  message: Message;

  @OneToOne(() => User)
  @Expose()
  readBy: User;

  @CreateDateColumn()
  @Expose()
  readAt: Date;
}
