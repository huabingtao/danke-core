import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSourceDto {
  @IsString()
  @IsNotEmpty({ message: '途径名称不能为空' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: '途径类型不能为空' })
  type: string;

  @IsString()
  @IsOptional()
  description?: string;
}
