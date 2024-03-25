import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { ROLES } from '../../roles/enums/roles.enum';

@Entity()
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ enum: ROLES, default: ROLES.USER })
  role_name: ROLES;
}
