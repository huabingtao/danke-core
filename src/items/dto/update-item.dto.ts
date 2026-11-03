import { GemValuationDto } from './gem-valuation.dto';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { ClassificationFields } from '../../item-classifications/classifications.dto';
import { IsOptional, IsString, IsObject } from 'class-validator';

export class UpdateItemDto extends ClassificationFields {
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

  @IsOptional()
  @ValidateNested()
  @Type(() => GemValuationDto)
  gemValuation?: GemValuationDto;
}
