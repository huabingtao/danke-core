import { RESOURCE_VIEW_IDS } from './resource-views';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsIn,
  IsString,
} from 'class-validator';

export class ClassificationFields {
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  categoryIds?: string[];

  @IsOptional()
  @IsString()
  resourceTypeId?: string | null;
}
export class BulkClassificationDto extends ClassificationFields {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsString({ each: true })
  itemIds: string[];
}
export class MatrixPreferenceDto {
  @IsOptional()
  @IsString()
  @IsIn(RESOURCE_VIEW_IDS)
  viewId?: string;
  @IsArray()
  @ArrayMaxSize(5000)
  @ArrayUnique()
  @IsString({ each: true })
  selectedItemIds: string[];
}
