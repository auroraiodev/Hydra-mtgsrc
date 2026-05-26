import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsString, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class PriceQueryDto {
  @ApiProperty({ description: 'Card name to search in Hareruya' })
  @IsString()
  cardName: string;

  @ApiProperty({ description: 'Hareruya product ID to match (importationId)' })
  @IsString()
  importationId: string;

  @ApiProperty({ description: 'Tax rate as decimal (e.g. 0.191)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  @Transform(({ value }) => parseFloat(value))
  tax: number;

  @ApiProperty({ description: 'Profit margin as decimal (e.g. 0.20)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  @Transform(({ value }) => parseFloat(value))
  profit: number;

  @ApiProperty({ description: 'Whether the card is foil' })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true || value === '1')
  isFoil: boolean;

  @ApiProperty({ description: 'Card language (e.g. ENGLISH, JAPANESE, EN, JP, SPANISH)' })
  @IsString()
  language: string;
}
