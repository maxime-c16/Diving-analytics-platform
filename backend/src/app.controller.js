"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.AppController = void 0;
var common_1 = require("@nestjs/common");
var swagger_1 = require("@nestjs/swagger");
var AppController = /** @class */ (function () {
    function AppController(appService) {
        this.appService = appService;
    }
    AppController.prototype.getHello = function () {
        return this.appService.getHello();
    };
    AppController.prototype.health = function () {
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        };
    };
    __decorate([
        (0, common_1.Get)(),
        (0, swagger_1.ApiOperation)({
            summary: 'Root endpoint',
            description: 'Returns a welcome message'
        }),
        (0, swagger_1.ApiResponse)({
            status: 200,
            description: 'Welcome message',
            schema: { type: 'string', example: 'Hello World!' }
        })
    ], AppController.prototype, "getHello");
    __decorate([
        (0, common_1.Get)('health'),
        (0, swagger_1.ApiOperation)({
            summary: 'API health check',
            description: 'Returns the health status of the API'
        }),
        (0, swagger_1.ApiResponse)({
            status: 200,
            description: 'API is healthy',
            schema: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'healthy' },
                    timestamp: { type: 'string', example: '2025-11-23T21:00:00.000Z' },
                    uptime: { type: 'number', example: 123.456 }
                }
            }
        })
    ], AppController.prototype, "health");
    AppController = __decorate([
        (0, swagger_1.ApiTags)('health'),
        (0, common_1.Controller)()
    ], AppController);
    return AppController;
}());
exports.AppController = AppController;
