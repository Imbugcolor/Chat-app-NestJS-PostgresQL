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
import { Expose } from 'class-transformer';
import { Message } from 'src/messages/entities/message.entity';
import { ConversationDeleted } from './conversationDeleted.entity';

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

  @Column({ default: null })
  @Expose()
  description: string;

  @Column({
    default:
      'https://res.cloudinary.com/dnv2v2tiz/image/upload/v1712566566/chat-app-postgresql/mat-avatar_clj1in.jpg',
  })
  @Expose()
  thumbnail: string;

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

  @Expose()
  lastMessage?: Message;

  @Expose()
  numUnReads?: number;
}
