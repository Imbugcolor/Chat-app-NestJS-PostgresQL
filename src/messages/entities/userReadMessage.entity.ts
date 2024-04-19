import { User } from 'src/auth/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
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

  @ManyToOne(() => Message, (msg) => msg.usersRead, {
    onDelete: 'CASCADE',
  })
  @Expose()
  message: Message;

  @ManyToOne(() => User, (user) => user.readMessages)
  @Expose()
  readBy: User;

  @CreateDateColumn()
  @Expose()
  readAt: Date;
}
