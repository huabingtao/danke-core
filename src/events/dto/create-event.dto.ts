import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty({ message: '活动名称不能为空' })
  name: string;

  @IsDateString({}, { message: '活动开始时间格式无效' })
  startDate: string;

  @IsDateString({}, { message: '活动结束时间格式无效' })
  endDate: string;

  @IsString()
  @IsOptional()
  rewards?: string | null;
}
