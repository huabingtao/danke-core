import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
export class GemPriceDto {
  @IsString() @IsNotEmpty() @MaxLength(120) id: string;
  @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(0) value: number;
}
export class GemValuationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique((price: GemPriceDto) => price.id)
  @ValidateNested({ each: true })
  @Type(() => GemPriceDto)
  prices: GemPriceDto[];
}
