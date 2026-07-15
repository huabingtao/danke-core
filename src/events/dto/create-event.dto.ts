import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty({ message: '活动名称不能为空' })
  name: string;

  @IsDateString({}, { message: '开始时间必须是有效的 ISO 日期格式' })
  @IsNotEmpty({ message: '开始时间不能为空' })
  startDate: string;

  @IsDateString({}, { message: '结束时间必须是有效的 ISO 日期格式' })
  @IsNotEmpty({ message: '结束时间不能为空' })
  endDate: string;

  @IsString()
  @IsOptional()
  rewards?: string;
}
