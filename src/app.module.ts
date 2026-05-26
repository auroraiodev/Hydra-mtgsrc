import * as path from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MtgsrcModule } from './mtgsrc/mtgsrc.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.join(process.cwd(), '.env'),
    }),
    MtgsrcModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
