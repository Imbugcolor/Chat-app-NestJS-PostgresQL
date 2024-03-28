import { User } from 'src/auth/users/entities/user.entity';
import { Conversation } from 'src/conversations/entities/conversation.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';
import { MESSAGETYPE } from '../enums/messageType.enum';
import { Attachment } from './attachment.entity';
import { Expose } from 'class-transformer';

@Entity()
export class Message {
  constructor(partial: Partial<Message>) {
    Object.assign(this, partial);
  }

  @PrimaryGeneratedColumn()
  @Expose()
  id: number;

  @ManyToOne(() => Conversation, (cv) => cv.messages)
  @JoinColumn()
  @Expose()
  conversation: Conversation;

  @ManyToOne(() => User, (user) => user.messages)
  @JoinColumn()
  @Expose()
  senderId: User;

  @Column({ enum: MESSAGETYPE, default: MESSAGETYPE.TEXT })
  @Expose()
  message_type: MESSAGETYPE;

  @Column()
  @Expose()
  text: string;

  @OneToMany(() => Attachment, (att) => att.message)
  @Expose()
  attachments: Attachment[];

  @OneToMany(() => User, (user) => user.readMesages)
  @Expose()
  readBy: User[];

  @Column({ default: false })
  @Expose()
  isUpdated: boolean;

  @CreateDateColumn()
  @Expose()
  createdAt: Date;

  @UpdateDateColumn()
  @Expose()
  updatedAt: Date;
}
