import { IsOptional, IsString, IsObject } from 'class-validator';

export class UpdateItemDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject({ message: '属性加成必须是对象格式' })
  @IsOptional()
  stats?: Record<string, any>;
}
