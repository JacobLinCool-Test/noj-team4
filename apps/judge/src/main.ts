import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  console.log('Judge worker started successfully');

  // Keep the process running
  process.on('SIGINT', async () => {
    console.log('Shutting down judge worker...');
    await app.close();
    process.exit(0);
  });
}

bootstrap();
