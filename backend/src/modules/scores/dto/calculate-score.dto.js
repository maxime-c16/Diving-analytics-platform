"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.TotalScoreResultDto = exports.ScoreResultDto = exports.CalculateScoreDto = void 0;
var class_validator_1 = require("class-validator");
var swagger_1 = require("@nestjs/swagger");
var dive_code_validator_1 = require("../../common/validators/dive-code.validator");
var CalculateScoreDto = /** @class */ (function () {
    function CalculateScoreDto() {
    }
    __decorate([
        (0, swagger_1.ApiProperty)({
            description: 'FINA dive code (e.g., 103B, 5132D)',
            example: '103B',
            pattern: '^[1-6][0-9]{2,3}[ABCD]$'
        }),
        (0, class_validator_1.IsString)(),
        (0, class_validator_1.IsNotEmpty)(),
        (0, class_validator_1.Validate)(dive_code_validator_1.IsDiveCode)
    ], CalculateScoreDto.prototype, "diveCode");
    __decorate([
        (0, swagger_1.ApiProperty)({
            description: 'Array of judge scores (5 or 7 judges)',
            example: [7.0, 7.5, 8.0, 7.5, 8.5],
            type: [Number],
            minItems: 5,
            maxItems: 7,
            minimum: 0,
            maximum: 10
        }),
        (0, class_validator_1.IsArray)(),
        (0, class_validator_1.ArrayMinSize)(5),
        (0, class_validator_1.ArrayMaxSize)(7),
        (0, class_validator_1.IsNumber)({}, { each: true }),
        (0, class_validator_1.Min)(0, { each: true }),
        (0, class_validator_1.Max)(10, { each: true })
    ], CalculateScoreDto.prototype, "judgeScores");
    return CalculateScoreDto;
}());
exports.CalculateScoreDto = CalculateScoreDto;
var ScoreResultDto = /** @class */ (function () {
    function ScoreResultDto() {
    }
    __decorate([
        (0, swagger_1.ApiProperty)({ description: 'FINA dive code', example: '103B' })
    ], ScoreResultDto.prototype, "diveCode");
    __decorate([
        (0, swagger_1.ApiProperty)({ description: 'Degree of difficulty', example: 1.7 })
    ], ScoreResultDto.prototype, "difficulty");
    __decorate([
        (0, swagger_1.ApiProperty)({ description: 'Original judge scores', example: [7.0, 7.5, 8.0, 7.5, 8.5] })
    ], ScoreResultDto.prototype, "judgeScores");
    __decorate([
        (0, swagger_1.ApiProperty)({ description: 'Scores dropped per FINA rules', example: [7.0, 8.5] })
    ], ScoreResultDto.prototype, "droppedScores");
    __decorate([
        (0, swagger_1.ApiProperty)({ description: 'Scores used in calculation', example: [7.5, 8.0, 7.5] })
    ], ScoreResultDto.prototype, "effectiveScores");
    __decorate([
        (0, swagger_1.ApiProperty)({ description: 'Sum of effective scores', example: 23.0 })
    ], ScoreResultDto.prototype, "rawScore");
    __decorate([
        (0, swagger_1.ApiProperty)({ description: 'Final score (rawScore × difficulty)', example: 39.1 })
    ], ScoreResultDto.prototype, "finalScore");
    return ScoreResultDto;
}());
exports.ScoreResultDto = ScoreResultDto;
var TotalScoreResultDto = /** @class */ (function () {
    function TotalScoreResultDto() {
    }
    __decorate([
        (0, swagger_1.ApiProperty)({ description: 'Array of individual dive results', type: [ScoreResultDto] })
    ], TotalScoreResultDto.prototype, "dives");
    __decorate([
        (0, swagger_1.ApiProperty)({ description: 'Total competition score', example: 125.6 })
    ], TotalScoreResultDto.prototype, "totalScore");
    __decorate([
        (0, swagger_1.ApiProperty)({ description: 'Number of dives', example: 5 })
    ], TotalScoreResultDto.prototype, "numDives");
    return TotalScoreResultDto;
}());
exports.TotalScoreResultDto = TotalScoreResultDto;
