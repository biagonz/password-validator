import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilita CORS para que o micro frontend (outro domínio/porta) possa chamar esta API
  // Em produção, restrinja o origin ao domínio real do frontend
  app.enableCors({
    origin: process.env.ALLOWED_ORIGIN ?? 'http://localhost:3000',
    methods: ['GET', 'POST'],
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`ms-password running on http://localhost:${port}`);
}

void bootstrap();
