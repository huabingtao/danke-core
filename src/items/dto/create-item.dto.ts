import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty({ message: '物品名称不能为空' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: '物品类型不能为空' })
  type: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject({ message: '属性加成必须是对象格式' })
  @IsOptional()
  stats?: Record<string, any>;
}
