import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Message } from './message.entity';

@Entity()
export class Attachment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  public_id: string;

  @Column()
  url: string;

  @ManyToOne(() => Message, (message) => message.attachments)
  message: Message;
}
