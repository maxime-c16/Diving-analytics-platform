import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { ScoresService } from "../scores.service";
import {
  IsDiveCode,
  parseDiveCode,
} from "../../../common/validators/dive-code.validator";

describe("ScoresService", () => {
  let service: ScoresService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScoresService],
    }).compile();

    service = module.get<ScoresService>(ScoresService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("calculateScore", () => {
    describe("valid dive codes", () => {
      it("should calculate score for a basic forward dive (103B)", () => {
        const result = service.calculateScore(
          "103B",
          [7.0, 7.5, 8.0, 7.5, 8.5]
        );

        expect(result.diveCode).toBe("103B");
        expect(result.difficulty).toBe(1.7);
        expect(result.judgeScores).toEqual([7.0, 7.5, 8.0, 7.5, 8.5]);
        expect(result.droppedScores).toEqual([7.0, 8.5]);
        expect(result.effectiveScores).toEqual([7.5, 7.5, 8.0]);
        expect(result.rawScore).toBe(23.0);
        expect(result.finalScore).toBe(39.1);
      });

      it("should calculate score with 7 judges", () => {
        const result = service.calculateScore(
          "103B",
          [6.5, 7.0, 7.5, 8.0, 7.5, 8.0, 6.0]
        );

        expect(result.droppedScores).toEqual([6.0, 6.5, 8.0, 8.0]);
        expect(result.effectiveScores).toEqual([7.0, 7.5, 7.5]);
        expect(result.rawScore).toBe(22.0);
      });

      it("should calculate score for a flying dive (113C)", () => {
        const result = service.calculateScore(
          "113C",
          [7.0, 7.5, 8.0, 7.5, 8.5]
        );

        expect(result.diveCode).toBe("113C");
        expect(result.difficulty).toBe(1.7);
      });

      it("should calculate score for a back dive (201A)", () => {
        const result = service.calculateScore(
          "201A",
          [8.0, 8.5, 9.0, 8.5, 8.0]
        );

        expect(result.diveCode).toBe("201A");
        expect(result.difficulty).toBe(1.7);
      });

      it("should calculate score for a reverse dive (301B)", () => {
        const result = service.calculateScore(
          "301B",
          [7.5, 8.0, 8.0, 7.5, 8.5]
        );

        expect(result.diveCode).toBe("301B");
        expect(result.difficulty).toBe(1.7);
      });

      it("should calculate score for a twisting dive (5132D)", () => {
        const result = service.calculateScore(
          "5132D",
          [7.0, 7.5, 8.0, 7.5, 8.5]
        );

        expect(result.diveCode).toBe("5132D");
        expect(result.difficulty).toBe(2.2);
      });

      it("should calculate score for an armstand dive (612B)", () => {
        const result = service.calculateScore(
          "612B",
          [7.0, 7.5, 8.0, 7.5, 8.5]
        );

        expect(result.diveCode).toBe("612B");
        expect(result.difficulty).toBe(2.0);
      });

      it("should calculate score for an armstand dive with twist (6122B)", () => {
        const result = service.calculateScore(
          "6122B",
          [7.0, 7.5, 8.0, 7.5, 8.5]
        );

        expect(result.diveCode).toBe("6122B");
        expect(result.difficulty).toBe(2.3);
      });

      it("should handle lowercase position letter", () => {
        const result = service.calculateScore(
          "103b",
          [7.0, 7.5, 8.0, 7.5, 8.5]
        );

        expect(result.diveCode).toBe("103b");
        expect(result.difficulty).toBe(1.7);
      });

      it("should calculate score for extended somersault dive (1011B)", () => {
        // Extended dive with 11 half-somersaults (5.5 somersaults)
        const result = service.calculateScore(
          "1011B",
          [7.0, 7.5, 8.0, 7.5, 8.5]
        );

        expect(result.diveCode).toBe("1011B");
        // This will use calculated difficulty since it's not in the table
        expect(result.difficulty).toBeGreaterThan(0);
      });
    });

    describe("invalid dive codes", () => {
      it("should reject invalid group number", () => {
        expect(() =>
          service.calculateScore("703B", [7.0, 7.5, 8.0, 7.5, 8.5])
        ).toThrow(BadRequestException);
      });

      it("should reject invalid position letter", () => {
        expect(() =>
          service.calculateScore("103E", [7.0, 7.5, 8.0, 7.5, 8.5])
        ).toThrow(BadRequestException);
      });

      it("should reject empty dive code", () => {
        expect(() =>
          service.calculateScore("", [7.0, 7.5, 8.0, 7.5, 8.5])
        ).toThrow(BadRequestException);
      });

      it("should reject too short dive code", () => {
        expect(() =>
          service.calculateScore("1B", [7.0, 7.5, 8.0, 7.5, 8.5])
        ).toThrow(BadRequestException);
      });

      it("should reject invalid second digit for groups 1-4 (must be 0 or 1)", () => {
        expect(() =>
          service.calculateScore("123B", [7.0, 7.5, 8.0, 7.5, 8.5])
        ).toThrow(BadRequestException);
      });

      it("should reject invalid direction for group 5 (must be 1-4)", () => {
        expect(() =>
          service.calculateScore("5532D", [7.0, 7.5, 8.0, 7.5, 8.5])
        ).toThrow(BadRequestException);
      });

      it("should reject invalid direction for group 6 (must be 1-4)", () => {
        expect(() =>
          service.calculateScore("652B", [7.0, 7.5, 8.0, 7.5, 8.5])
        ).toThrow(BadRequestException);
      });
    });

    describe("judge score validation", () => {
      it("should reject invalid judge count (not 5 or 7)", () => {
        expect(() => service.calculateScore("103B", [7.0, 7.5, 8.0])).toThrow(
          BadRequestException
        );
        expect(() =>
          service.calculateScore("103B", [7.0, 7.5, 8.0, 7.5, 8.5, 7.0])
        ).toThrow(BadRequestException);
      });

      it("should reject scores below 0", () => {
        expect(() =>
          service.calculateScore("103B", [-1, 7.5, 8.0, 7.5, 8.5])
        ).toThrow(BadRequestException);
      });

      it("should reject scores above 10", () => {
        expect(() =>
          service.calculateScore("103B", [7.0, 7.5, 8.0, 7.5, 11])
        ).toThrow(BadRequestException);
      });
    });
  });

  describe("calculateTotalScore", () => {
    it("should calculate total score across multiple dives", () => {
      const result = service.calculateTotalScore([
        { diveCode: "103B", judgeScores: [7.0, 7.5, 8.0, 7.5, 8.5] },
        { diveCode: "201A", judgeScores: [8.0, 8.5, 9.0, 8.5, 8.0] },
      ]);

      expect(result.numDives).toBe(2);
      expect(result.dives).toHaveLength(2);
      expect(result.totalScore).toBeGreaterThan(0);
    });

    it("should handle empty dive array", () => {
      const result = service.calculateTotalScore([]);

      expect(result.numDives).toBe(0);
      expect(result.dives).toHaveLength(0);
      expect(result.totalScore).toBe(0);
    });
  });
});

describe("IsDiveCode Validator", () => {
  const validator = new IsDiveCode();

  describe("valid dive codes", () => {
    const validCodes = [
      // Groups 1-4 (no flying)
      "101A",
      "103B",
      "105C",
      "107D",
      "201A",
      "203B",
      "205C",
      "301A",
      "303B",
      "305C",
      "401A",
      "403B",
      "405C",
      // Groups 1-4 (with flying)
      "111A",
      "113B",
      "115C",
      // Extended somersaults (4 digits for groups 1-4)
      "1011B",
      "1013C",
      // Group 5 (Twisting)
      "5111A",
      "5132D",
      "5152B",
      "5231D",
      "5311A",
      "5411A",
      // Extended twisting (5 digits)
      "51112D",
      // Group 6 (Armstand)
      "612B",
      "622C",
      "632A",
      "642B",
      // Armstand with twist
      "6122B",
      "6222D",
      "6243D",
    ];

    validCodes.forEach((code) => {
      it(`should accept valid dive code: ${code}`, () => {
        expect(validator.validate(code)).toBe(true);
      });
    });
  });

  describe("invalid dive codes", () => {
    const invalidCodes = [
      "", // empty
      "B", // too short
      "1B", // too short
      "703B", // invalid group
      "103E", // invalid position
      "123B", // invalid second digit for group 1 (must be 0 or 1)
      "5532D", // invalid direction for group 5 (must be 1-4)
      "652B", // invalid direction for group 6 (must be 1-4)
      "ABCD", // all letters
      "1234", // no position letter
    ];

    invalidCodes.forEach((code) => {
      it(`should reject invalid dive code: ${code}`, () => {
        expect(validator.validate(code)).toBe(false);
      });
    });
  });
});

describe("parseDiveCode", () => {
  it("should correctly parse a forward dive without flying (103B)", () => {
    const parsed = parseDiveCode("103B");

    expect(parsed.group).toBe(1);
    expect(parsed.groupName).toBe("Forward");
    expect(parsed.secondDigit).toBe(0);
    expect(parsed.secondDigitMeaning).toBe("No flying");
    expect(parsed.halfSomersaults).toBe(3);
    expect(parsed.somersaults).toBe(1.5);
    expect(parsed.position).toBe("B");
    expect(parsed.positionName).toBe("Pike");
    expect(parsed.halfTwists).toBeUndefined();
  });

  it("should correctly parse a forward dive with flying (113B)", () => {
    const parsed = parseDiveCode("113B");

    expect(parsed.group).toBe(1);
    expect(parsed.groupName).toBe("Forward");
    expect(parsed.secondDigit).toBe(1);
    expect(parsed.secondDigitMeaning).toBe("Flying");
    expect(parsed.halfSomersaults).toBe(3);
    expect(parsed.somersaults).toBe(1.5);
  });

  it("should correctly parse a twisting dive (5132D)", () => {
    const parsed = parseDiveCode("5132D");

    expect(parsed.group).toBe(5);
    expect(parsed.groupName).toBe("Twisting");
    expect(parsed.secondDigit).toBe(1);
    expect(parsed.secondDigitMeaning).toBe("Forward direction");
    expect(parsed.halfSomersaults).toBe(3);
    expect(parsed.somersaults).toBe(1.5);
    expect(parsed.halfTwists).toBe(2);
    expect(parsed.twists).toBe(1);
    expect(parsed.position).toBe("D");
    expect(parsed.positionName).toBe("Free");
  });

  it("should correctly parse an armstand dive without twist (612B)", () => {
    const parsed = parseDiveCode("612B");

    expect(parsed.group).toBe(6);
    expect(parsed.groupName).toBe("Armstand");
    expect(parsed.secondDigit).toBe(1);
    expect(parsed.secondDigitMeaning).toBe("Forward direction");
    expect(parsed.halfSomersaults).toBe(2);
    expect(parsed.somersaults).toBe(1);
    expect(parsed.halfTwists).toBeUndefined();
  });

  it("should correctly parse an armstand dive with twist (6122B)", () => {
    const parsed = parseDiveCode("6122B");

    expect(parsed.group).toBe(6);
    expect(parsed.groupName).toBe("Armstand");
    expect(parsed.secondDigit).toBe(1);
    expect(parsed.secondDigitMeaning).toBe("Forward direction");
    expect(parsed.halfSomersaults).toBe(2);
    expect(parsed.somersaults).toBe(1);
    expect(parsed.halfTwists).toBe(2);
    expect(parsed.twists).toBe(1);
  });
});
