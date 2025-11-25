"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.BatchScoreResultDto = exports.BatchScoreDto = void 0;
var class_validator_1 = require("class-validator");
var class_transformer_1 = require("class-transformer");
var swagger_1 = require("@nestjs/swagger");
var calculate_score_dto_1 = require("./calculate-score.dto");
var BatchScoreDto = /** @class */ (function () {
    function BatchScoreDto() {
    }
    __decorate([
        (0, swagger_1.ApiProperty)({
            description: 'Array of dives to calculate',
            type: [calculate_score_dto_1.CalculateScoreDto],
            minItems: 1
        }),
        (0, class_validator_1.IsArray)(),
        (0, class_validator_1.ArrayMinSize)(1),
        (0, class_validator_1.ValidateNested)({ each: true }),
        (0, class_transformer_1.Type)(function () { return calculate_score_dto_1.CalculateScoreDto; })
    ], BatchScoreDto.prototype, "dives");
    return BatchScoreDto;
}());
exports.BatchScoreDto = BatchScoreDto;
var BatchScoreResultDto = /** @class */ (function () {
    function BatchScoreResultDto() {
    }
    __decorate([
        (0, swagger_1.ApiProperty)({ description: 'Array of calculated scores', type: [calculate_score_dto_1.ScoreResultDto] })
    ], BatchScoreResultDto.prototype, "results");
    __decorate([
        (0, swagger_1.ApiProperty)({ description: 'Number of dives processed', example: 3 })
    ], BatchScoreResultDto.prototype, "total");
    return BatchScoreResultDto;
}());
exports.BatchScoreResultDto = BatchScoreResultDto;
