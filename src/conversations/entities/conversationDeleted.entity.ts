import { User } from 'src/auth/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity()
export class ConversationDeleted {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Conversation, (conver) => conver.deletedBy)
  conversation: Conversation;

  @OneToOne(() => User)
  @JoinColumn()
  deletedBy: User;

  @CreateDateColumn()
  deletedAt: Date;
}
