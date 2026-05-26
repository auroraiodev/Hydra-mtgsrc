import { Module } from '@nestjs/common';
import { MtgsrcController } from './mtgsrc.controller';
import { MtgsrcService } from './mtgsrc.service';
import { CurrencyService } from './currency.service';
import { ParserService } from './parser.service';

@Module({
  controllers: [MtgsrcController],
  providers: [MtgsrcService, CurrencyService, ParserService],
  exports: [],
})
export class MtgsrcModule {}
