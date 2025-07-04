import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('ClipsCommerce API')
    .setDescription('The ClipsCommerce API documentation')
    .setVersion('1.0')
    .addTag('Engagement Prediction', 'AI-powered content engagement prediction')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // Write OpenAPI JSON to file
  const outputPath = join(process.cwd(), 'public', 'openapi.json');
  writeFileSync(outputPath, JSON.stringify(document, null, 2));
  
  console.log(`OpenAPI document generated at: ${outputPath}`);
  
  // Setup Swagger UI endpoint (optional - for development)
  SwaggerModule.setup('api-docs', app, document);
  
  await app.listen(3001);
  console.log('NestJS application is running on: http://localhost:3001');
  console.log('Swagger UI available at: http://localhost:3001/api-docs');
}

// Export the bootstrap function for use in build scripts
export { bootstrap };

// Run bootstrap if this file is executed directly
if (require.main === module) {
  bootstrap().catch((error) => {
    console.error('Error starting NestJS application:', error);
    process.exit(1);
  });
}