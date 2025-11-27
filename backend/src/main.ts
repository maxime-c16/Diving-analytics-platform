import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Set global prefix for all routes
  app.setGlobalPrefix('v1');

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Enable CORS
  app.enableCors();

  // Swagger/OpenAPI configuration
  const config = new DocumentBuilder()
    .setTitle("Diving Analytics API")
    .setDescription(
      "REST API for diving competition score calculation and analytics"
    )
    .setVersion("1.0")
    .addTag("health", "Health check endpoints")
    .addTag("scores", "Score calculation and FINA scoring algorithms")
    .addServer("http://localhost", "Development (via Nginx)")
    .addServer("http://localhost:3000", "Development (direct)")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document, {
    customSiteTitle: "Diving Analytics API Docs",
    customCss: ".swagger-ui .topbar { display: none }",
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: "none",
      filter: true,
      showRequestDuration: true,
    },
  });

  await app.listen(3000);
  console.log(`Application is running on: http://localhost:3000`);
  console.log(`Swagger documentation: http://localhost:3000/api/docs`);
}
bootstrap();
