import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AppService } from "./app.service";

@ApiTags("health")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: "Root endpoint",
    description: "Returns a welcome message",
  })
  @ApiResponse({
    status: 200,
    description: "Welcome message",
    schema: { type: "string", example: "Hello World!" },
  })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get("health")
  @ApiOperation({
    summary: "API health check",
    description: "Returns the health status of the API",
  })
  @ApiResponse({
    status: 200,
    description: "API is healthy",
    schema: {
      type: "object",
      properties: {
        status: { type: "string", example: "healthy" },
        timestamp: { type: "string", example: "2025-11-23T21:00:00.000Z" },
        uptime: { type: "number", example: 123.456 },
      },
    },
  })
  health() {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
