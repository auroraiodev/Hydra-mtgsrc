import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ParseNameDto {
  @ApiProperty({
    description: 'Raw product name from the external source',
    example: '1st Edition Charizard VMAX #074/073 [CRZ] Holo',
  })
  @IsString()
  productNameEn: string;

  @ApiPropertyOptional({
    description: 'Original card name (optional, used as fallback)',
    example: 'Charizard VMAX',
  })
  @IsOptional()
  @IsString()
  cardNameOriginal?: string;
}
