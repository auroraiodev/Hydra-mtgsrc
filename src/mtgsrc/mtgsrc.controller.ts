import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { MtgsrcService } from './mtgsrc.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { PriceQueryDto } from './dto/price-query.dto';

@ApiTags('mtgsrc')
@Controller('mtgsrc')
export class MtgsrcController {
  constructor(private readonly mtgsrcService: MtgsrcService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Search and enrich cards with MXN pricing and parsed metadata',
    description:
      'Single public endpoint. Orchestrates Hareruya search, price conversion (JPY→MXN), and name parsing.',
  })
  @ApiQuery({ name: 'cardName', required: true, type: String })
  @ApiQuery({ name: 'tax', required: true, type: Number })
  @ApiQuery({ name: 'profit', required: true, type: Number })
  @ApiQuery({ name: 'rows', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'includeOutOfStock', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Enriched card results.' })
  @ApiResponse({ status: 400, description: 'Missing required query parameters.' })
  @ApiResponse({ status: 502, description: 'External search service failed.' })
  @ApiResponse({ status: 503, description: 'Exchange rate service unavailable.' })
  async getCards(@Query() query: SearchQueryDto) {
    const { cardName, tax, profit } = query;
    if (!cardName || tax === undefined || profit === undefined) {
      throw new BadRequestException('cardName, tax and profit are required');
    }
    return this.mtgsrcService.getCards(query);
  }

  @Get('price')
  @ApiOperation({
    summary: 'Get updated price for a specific card variant',
    description:
      'Searches Hareruya by card name, then filters to find the variant that matches ' +
      'importationId, isFoil, and language. Returns current pricing in MXN.',
  })
  @ApiQuery({ name: 'cardName', required: true, type: String })
  @ApiQuery({ name: 'importationId', required: true, type: String })
  @ApiQuery({ name: 'tax', required: true, type: Number })
  @ApiQuery({ name: 'profit', required: true, type: Number })
  @ApiQuery({ name: 'isFoil', required: false, type: Boolean })
  @ApiQuery({ name: 'language', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Matched variant with current pricing, or null if not found.',
  })
  @ApiResponse({ status: 400, description: 'Missing required parameters.' })
  @ApiResponse({ status: 502, description: 'External search service failed.' })
  async getPrice(@Query() query: PriceQueryDto) {
    const { cardName, importationId, tax, profit, isFoil, language } = query;
    if (
      !cardName ||
      !importationId ||
      tax === undefined ||
      profit === undefined ||
      isFoil === undefined ||
      !language
    ) {
      throw new BadRequestException(
        'cardName, importationId, tax, profit, isFoil and language are required',
      );
    }
    return this.mtgsrcService.getPriceForVariant(query);
  }
}
