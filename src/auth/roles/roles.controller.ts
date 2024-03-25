import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { RolesService } from './roles.service';
import { ROLES } from './enums/roles.enum';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  async register(@Body('roleName') role_name: ROLES) {
    return this.rolesService.createRole(role_name);
  }

  @Post('admin/:userId')
  async grantAdminPermission(@Param('userId', ParseIntPipe) userId: number) {
    return this.rolesService.grantAdminPermission(userId);
  }
}
