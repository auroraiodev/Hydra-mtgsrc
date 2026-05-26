import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class SearchQueryDto {
  @ApiProperty({ description: 'Card name to search' })
  @IsString()
  cardName: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  tax?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  profit?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  rows?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priceFilter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === '1')
  foil?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === '1')
  includeOutOfStock?: boolean;
}
