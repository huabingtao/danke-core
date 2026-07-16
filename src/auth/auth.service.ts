import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const { password, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const permissions = user.role.permissions.map(p => p.code);
    const isSuperUser = user.role.code === 'ADMIN' || permissions.includes('*');

    // 1. 获取所有菜单项，按 sort 排序
    const allMenus = await this.prisma.menu.findMany({
      orderBy: { sort: 'asc' },
    });

    // 2. 根据用户权限进行过滤
    const filteredMenus = allMenus.filter(menu => {
      if (!menu.permissionCode) {
        return true;
      }
      return isSuperUser || permissions.includes(menu.permissionCode);
    });

    // 3. 构建菜单树
    const menuTree: any[] = [];
    const menuMap = new Map<string, any>();

    // 先将所有菜单转为带 children 的对象存入 map
    filteredMenus.forEach(menu => {
      menuMap.set(menu.id, {
        id: menu.id,
        name: menu.name,
        path: menu.path,
        sort: menu.sort,
        parentId: menu.parentId,
        permissionCode: menu.permissionCode,
        children: [],
      });
    });

    // 组装父子树结构
    menuMap.forEach(menuNode => {
      if (menuNode.parentId) {
        const parentNode = menuMap.get(menuNode.parentId);
        if (parentNode) {
          parentNode.children.push(menuNode);
        }
      } else {
        menuTree.push(menuNode);
      }
    });

    // 4. 对所有层级的 children 按 sort 重新排序
    const sortTreeNodes = (nodes: any[]) => {
      nodes.sort((a, b) => a.sort - b.sort);
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          sortTreeNodes(node.children);
        }
      });
    };
    sortTreeNodes(menuTree);

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role.code,
        roleName: user.role.name,
      },
      permissions,
      menuTree,
    };
  }
}
