import { IsNotEmpty, IsString, IsInt, IsOptional } from 'class-validator';

export class CreateMenuDto {
  @IsString()
  @IsNotEmpty({ message: '菜单名称不能为空' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: '路径不能为空' })
  path: string;

  @IsInt({ message: '排序必须是整数' })
  @IsOptional()
  sort?: number;
}
