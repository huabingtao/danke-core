import { IsOptional, IsString } from 'class-validator';

export class QueryYieldDto {
  @IsString()
  @IsOptional()
  year?: string;

  @IsString()
  @IsOptional()
  month?: string;

  @IsString()
  @IsOptional()
  itemId?: string;

  @IsString()
  @IsOptional()
  sourceId?: string;
}
