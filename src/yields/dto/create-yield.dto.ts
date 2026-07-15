import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateYieldDto {
  @IsString()
  @IsNotEmpty({ message: '物品 ID 不能为空' })
  itemId: string;

  @IsString()
  @IsNotEmpty({ message: '途径 ID 不能为空' })
  sourceId: string;

  @IsString()
  @IsOptional()
  eventId?: string;

  @IsInt({ message: '产出数量必须是整数' })
  @Min(0, { message: '产出数量不能小于 0' })
  amount: number;

  @IsInt({ message: '月份必须是整数' })
  @Min(1, { message: '月份最小为 1' })
  @Max(12, { message: '月份最大为 12' })
  month: number;

  @IsInt({ message: '年份必须是整数' })
  @Min(2000, { message: '年份无效' })
  year: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
