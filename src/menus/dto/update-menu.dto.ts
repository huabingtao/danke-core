import { IsString, IsInt, IsOptional } from 'class-validator';

export class UpdateMenuDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  path?: string;

  @IsInt({ message: '排序必须是整数' })
  @IsOptional()
  sort?: number;
}
