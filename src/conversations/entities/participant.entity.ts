import { User } from 'src/auth/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  JoinColumn,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { Expose } from 'class-transformer';

@Entity()
export class Participant {
  constructor(partial: Partial<Participant>) {
    Object.assign(this, partial);
  }

  @PrimaryGeneratedColumn()
  @Expose()
  id: number;

  @ManyToOne(() => Conversation, (conver) => conver.participants)
  @Expose()
  conversation: Conversation;

  @ManyToOne(() => User, (user) => user.participants)
  @JoinColumn()
  @Expose()
  user: User;

  @CreateDateColumn()
  @Expose()
  joinedAt: Date;
}
