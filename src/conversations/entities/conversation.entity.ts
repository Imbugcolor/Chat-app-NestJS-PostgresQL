import { User } from 'src/auth/users/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Participant } from './participant.entity';
import { ConversationDeleted } from './conversationdeleted.entity';
import { Expose } from 'class-transformer';
import { Message } from 'src/messages/entities/message.entity';

@Entity()
export class Conversation {
  constructor(partial: Partial<Conversation>) {
    Object.assign(this, partial);
  }

  @PrimaryGeneratedColumn()
  @Expose()
  id: number;

  @Column({ default: null })
  @Expose()
  name: string;

  @OneToMany(() => Participant, (participant) => participant.conversation)
  @Expose()
  participants: Participant[];

  @ManyToOne(() => User, (user) => user.conversations)
  @JoinColumn()
  @Expose()
  createdBy: User;

  @OneToMany(() => ConversationDeleted, (cvDeleted) => cvDeleted.conversation)
  @Expose()
  deletedBy: ConversationDeleted[];

  @OneToMany(() => Message, (msg) => msg.conversation)
  @Expose()
  messages: Message[];

  @CreateDateColumn()
  @Expose()
  createdAt: Date;

  @Expose()
  isRead?: boolean;
}
