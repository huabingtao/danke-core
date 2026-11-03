import { GemValuationDto } from './gem-valuation.dto';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { ClassificationFields } from '../../item-classifications/classifications.dto';
import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export class CreateItemDto extends ClassificationFields {
  @IsString()
  @IsNotEmpty({ message: '物品名称不能为空' })
  name: string;

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

  @IsOptional()
  @ValidateNested()
  @Type(() => GemValuationDto)
  gemValuation?: GemValuationDto;
}
