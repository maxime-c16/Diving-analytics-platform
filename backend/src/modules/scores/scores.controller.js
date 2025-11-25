"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
exports.__esModule = true;
exports.ScoresController = void 0;
var common_1 = require("@nestjs/common");
var swagger_1 = require("@nestjs/swagger");
var calculate_score_dto_1 = require("./dto/calculate-score.dto");
var batch_score_dto_1 = require("./dto/batch-score.dto");
var ScoresController = /** @class */ (function () {
    function ScoresController(scoresService) {
        this.scoresService = scoresService;
    }
    ScoresController.prototype.health = function () {
        return {
            status: 'ok',
            service: 'scores',
            timestamp: new Date().toISOString(),
            features: ['5-judge', '7-judge', 'fina-rules']
        };
    };
    ScoresController.prototype.calculate = function (dto) {
        return this.scoresService.calculateScore(dto.diveCode, dto.judgeScores);
    };
    ScoresController.prototype.calculateTotal = function (dives) {
        return this.scoresService.calculateTotalScore(dives);
    };
    ScoresController.prototype.batch = function (batchDto) {
        var _this = this;
        var results = batchDto.dives.map(function (dive) {
            return _this.scoresService.calculateScore(dive.diveCode, dive.judgeScores);
        });
        return {
            results: results,
            total: results.length
        };
    };
    __decorate([
        (0, common_1.Get)('health'),
        (0, swagger_1.ApiOperation)({
            summary: 'Health check for scores service',
            description: 'Returns the health status and available features of the scores calculation service'
        }),
        (0, swagger_1.ApiResponse)({
            status: 200,
            description: 'Service is healthy',
            schema: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'ok' },
                    service: { type: 'string', example: 'scores' },
                    timestamp: { type: 'string', example: '2025-11-23T21:00:00.000Z' },
                    features: { type: 'array', items: { type: 'string' }, example: ['5-judge', '7-judge', 'fina-rules'] }
                }
            }
        })
    ], ScoresController.prototype, "health");
    __decorate([
        (0, common_1.Post)('calculate'),
        (0, common_1.HttpCode)(common_1.HttpStatus.OK),
        (0, swagger_1.ApiOperation)({
            summary: 'Calculate score for a single dive',
            description: 'Calculates the final score for a dive using FINA scoring rules. Supports 5-judge (drop 1 high, 1 low) and 7-judge (drop 2 high, 2 low) panels.'
        }),
        (0, swagger_1.ApiBody)({ type: calculate_score_dto_1.CalculateScoreDto }),
        (0, swagger_1.ApiResponse)({
            status: 200,
            description: 'Score calculated successfully',
            type: calculate_score_dto_1.ScoreResultDto
        }),
        (0, swagger_1.ApiResponse)({
            status: 400,
            description: 'Invalid input (bad dive code or judge count)',
            schema: {
                type: 'object',
                properties: {
                    statusCode: { type: 'number', example: 400 },
                    message: { type: 'string', example: 'Invalid dive code or must have exactly 5 or 7 judges' },
                    error: { type: 'string', example: 'Bad Request' }
                }
            }
        }),
        __param(0, (0, common_1.Body)())
    ], ScoresController.prototype, "calculate");
    __decorate([
        (0, common_1.Post)('calculate-total'),
        (0, common_1.HttpCode)(common_1.HttpStatus.OK),
        (0, swagger_1.ApiOperation)({
            summary: 'Calculate total score for multiple dives',
            description: 'Calculates individual scores and returns the total competition score across all dives.'
        }),
        (0, swagger_1.ApiBody)({ type: [calculate_score_dto_1.CalculateScoreDto] }),
        (0, swagger_1.ApiResponse)({
            status: 200,
            description: 'Total score calculated successfully',
            type: calculate_score_dto_1.TotalScoreResultDto
        }),
        (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input' }),
        __param(0, (0, common_1.Body)())
    ], ScoresController.prototype, "calculateTotal");
    __decorate([
        (0, common_1.Post)('batch'),
        (0, common_1.HttpCode)(common_1.HttpStatus.OK),
        (0, swagger_1.ApiOperation)({
            summary: 'Batch process multiple dives',
            description: 'Process multiple dive calculations in a single request. Returns an array of results.'
        }),
        (0, swagger_1.ApiBody)({ type: batch_score_dto_1.BatchScoreDto }),
        (0, swagger_1.ApiResponse)({
            status: 200,
            description: 'Batch processing completed successfully',
            type: batch_score_dto_1.BatchScoreResultDto
        }),
        (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input' }),
        __param(0, (0, common_1.Body)())
    ], ScoresController.prototype, "batch");
    ScoresController = __decorate([
        (0, swagger_1.ApiTags)('scores'),
        (0, common_1.Controller)('scores')
    ], ScoresController);
    return ScoresController;
}());
exports.ScoresController = ScoresController;
