import { User } from 'src/auth/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Message } from './message.entity';

@Entity()
export class MessageDeleted {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Message, (message) => message.deletedBy)
  message: Message;

  @OneToOne(() => User)
  @JoinColumn()
  deletedBy: User;

  @CreateDateColumn()
  deletedAt: Date;
}
