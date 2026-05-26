import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Swagger setup (disabled in production)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Hydra MTG Source Search Service')
      .setDescription(
        'Proxy service for external MTG card sources (Importation/Hareruya). ' +
          'Provides search, pricing, currency conversion, and card name parsing. ' +
          'Consumed by hydra-be and hydra-fe.',
      )
      .setVersion('1.0')
      .addServer(`http://localhost:${process.env.PORT || 3006}`, 'Local development')
      .addTag('App', 'Health and readiness checks')
      .addTag('mtgsrc', 'MTG card source proxy endpoints')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
    methods: ['GET', 'HEAD', 'POST', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3006;
  await app.listen(port, '0.0.0.0');
  logger.log(`MTG Source Search Service running on: http://localhost:${port}`);
}
void bootstrap();
