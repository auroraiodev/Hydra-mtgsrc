import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Returns the current health status of the MTG source service.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'hydra-mtgsrc' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  getHealth() {
    return {
      status: 'ok',
      service: 'hydra-mtgsrc',
      timestamp: new Date().toISOString(),
    };
  }
}
