#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app/api/openapi/app.module';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

async function generateOpenApiDocs() {
  try {
    console.log('🔄 Generating OpenAPI documentation...');
    
    // Create NestJS application
    const app = await NestFactory.create(AppModule, {
      logger: false, // Disable logging for cleaner output
    });

    // Configure Swagger/OpenAPI
    const config = new DocumentBuilder()
      .setTitle('ClipsCommerce API')
      .setDescription('The ClipsCommerce API provides comprehensive tools for social media content management, engagement prediction, and performance optimization.')
      .setVersion('1.0.0')
      .addTag('Engagement Prediction', 'AI-powered content engagement prediction and optimization')
      .addTag('Authentication', 'User authentication and authorization')
      .addTag('Content Management', 'Content creation, editing, and management')
      .addTag('Analytics', 'Performance analytics and insights')
      .addTag('Social Media', 'Social media platform integrations')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addServer('http://localhost:3000', 'Development server')
      .addServer('https://api.clipscommerce.com', 'Production server')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    
    // Ensure public directory exists
    const publicDir = join(process.cwd(), 'public');
    if (!existsSync(publicDir)) {
      mkdirSync(publicDir, { recursive: true });
    }
    
    // Write OpenAPI JSON to file
    const outputPath = join(publicDir, 'openapi.json');
    writeFileSync(outputPath, JSON.stringify(document, null, 2));
    
    // Also generate a YAML version for better readability
    const yaml = require('js-yaml');
    const yamlOutputPath = join(publicDir, 'openapi.yaml');
    writeFileSync(yamlOutputPath, yaml.dump(document));
    
    console.log(`✅ OpenAPI JSON document generated at: ${outputPath}`);
    console.log(`✅ OpenAPI YAML document generated at: ${yamlOutputPath}`);
    
    // Generate summary
    const endpoints = Object.keys(document.paths || {}).length;
    const schemas = Object.keys(document.components?.schemas || {}).length;
    
    console.log(`📊 Documentation Summary:`);
    console.log(`   📝 Total Endpoints: ${endpoints}`);
    console.log(`   🏷️  Total Schemas: ${schemas}`);
    console.log(`   📚 Tags: ${document.tags?.length || 0}`);
    
    // Close the application
    await app.close();
    
    console.log('🎉 OpenAPI documentation generation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error generating OpenAPI documentation:', error);
    process.exit(1);
  }
}

// Run the generator if this script is executed directly
if (require.main === module) {
  generateOpenApiDocs()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { generateOpenApiDocs };