import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";

/**
 * FINA Dive Code Validator
 *
 * FINA Rules for Dive Code Designations:
 *
 * 1.5.1 - All dives are designated by 3 or 4 numerals followed by a single letter
 *
 * 1.5.2 - First digit indicates the group:
 *   1 = Front, 2 = Back, 3 = Reverse, 4 = Inward, 5 = Twisting, 6 = Armstand
 *
 * 1.5.3 - For Groups 1-4: Second digit indicates flying action (0 = no flying, 1 = flying)
 *
 * 1.5.4 - Third digit indicates number of half-somersaults (1-9, or 10-11 for 5+ somersaults)
 *
 * 1.5.5 - For Armstand (6): Second digit indicates direction (1-4)
 *
 * 1.5.6 - For Twisting (5): Second digit indicates direction (1-4)
 *
 * 1.5.7 - For Twisting and Armstand: Additional digit(s) indicate half-twists
 *
 * 1.5.8 - Letter indicates position: A = Straight, B = Pike, C = Tuck, D = Free
 */
@ValidatorConstraint({ name: "isDiveCode", async: false })
export class IsDiveCode implements ValidatorConstraintInterface {
  /**
   * Validates a FINA dive code
   * @param value - The dive code string to validate
   * @returns true if valid, false otherwise
   */
  validate(value: string): boolean {
    if (typeof value !== "string" || value.length < 3) {
      return false;
    }

    // Extract position letter (last character)
    const position = value.slice(-1).toUpperCase();
    if (!["A", "B", "C", "D"].includes(position)) {
      return false;
    }

    // Extract numeric part
    const numericPart = value.slice(0, -1);
    if (!/^\d+$/.test(numericPart)) {
      return false;
    }

    const group = parseInt(numericPart[0], 10);

    // Validate based on group
    switch (group) {
      case 1:
      case 2:
      case 3:
      case 4:
        return this.validateGroup1to4(numericPart);
      case 5:
        return this.validateGroup5(numericPart);
      case 6:
        return this.validateGroup6(numericPart);
      default:
        return false;
    }
  }

  /**
   * Validates dive codes for Groups 1-4 (Front, Back, Reverse, Inward)
   * Format: [Group][Flying][Half-Somersaults]
   * - Group: 1-4
   * - Flying: 0 or 1
   * - Half-Somersaults: 1-9, or 10-11 for extended somersaults
   */
  private validateGroup1to4(numericPart: string): boolean {
    // Length must be 3 or 4 digits
    if (numericPart.length < 3 || numericPart.length > 4) {
      return false;
    }

    const secondDigit = parseInt(numericPart[1], 10);
    // Second digit must be 0 (no flying) or 1 (flying)
    if (secondDigit !== 0 && secondDigit !== 1) {
      return false;
    }

    // Extract half-somersaults (remaining digits after first two)
    const halfSomersaults = parseInt(numericPart.slice(2), 10);
    // Must be at least 1 half-somersault
    if (halfSomersaults < 1) {
      return false;
    }

    // For 4-digit codes, validate the extended somersault count (e.g., 1011 for 5.5 somersaults)
    if (numericPart.length === 4) {
      // Extended codes like 1011 (11 half-somersaults = 5.5 somersaults)
      if (halfSomersaults < 10 || halfSomersaults > 14) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validates dive codes for Group 5 (Twisting)
   * Format: [5][Direction][Half-Somersaults][Half-Twists]
   * - Direction: 1-4 (Front, Back, Reverse, Inward)
   * - Half-Somersaults: 1-9, or 10-11 for extended
   * - Half-Twists: 1-8 (typically)
   */
  private validateGroup5(numericPart: string): boolean {
    // Length must be 4 or 5 digits for twisting dives
    if (numericPart.length < 4 || numericPart.length > 5) {
      return false;
    }

    const direction = parseInt(numericPart[1], 10);
    // Direction must be 1-4
    if (direction < 1 || direction > 4) {
      return false;
    }

    // Parse half-somersaults and half-twists
    // For 4-digit code: X Y Z T where Z = half-somersaults, T = half-twists
    // For 5-digit code: X Y ZZ T or X Y Z TT (extended somersaults or twists)
    if (numericPart.length === 4) {
      const halfSomersaults = parseInt(numericPart[2], 10);
      const halfTwists = parseInt(numericPart[3], 10);

      if (halfSomersaults < 1 || halfSomersaults > 9) {
        return false;
      }
      if (halfTwists < 1 || halfTwists > 9) {
        return false;
      }
    } else {
      // 5-digit twisting dive
      // Could be extended somersaults (e.g., 51112) or extended twists
      const halfSomersaults = parseInt(numericPart.slice(2, 4), 10);
      const halfTwists = parseInt(numericPart[4], 10);

      if (halfSomersaults < 1) {
        return false;
      }
      if (halfTwists < 1 || halfTwists > 9) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validates dive codes for Group 6 (Armstand)
   * Format: [6][Direction][Half-Somersaults][Half-Twists]?
   * - Direction: 1-4 (Front, Back, Reverse, Inward)
   * - Half-Somersaults: 1-9
   * - Half-Twists: optional, 1-8 (typically)
   */
  private validateGroup6(numericPart: string): boolean {
    // Length must be 3, 4, or 5 digits for armstand dives
    if (numericPart.length < 3 || numericPart.length > 5) {
      return false;
    }

    const direction = parseInt(numericPart[1], 10);
    // Direction must be 1-4
    if (direction < 1 || direction > 4) {
      return false;
    }

    if (numericPart.length === 3) {
      // No twist: 6XY where Y = half-somersaults
      const halfSomersaults = parseInt(numericPart[2], 10);
      if (halfSomersaults < 1 || halfSomersaults > 9) {
        return false;
      }
    } else if (numericPart.length === 4) {
      // With twist: 6XYZ where Y = half-somersaults, Z = half-twists
      const halfSomersaults = parseInt(numericPart[2], 10);
      const halfTwists = parseInt(numericPart[3], 10);

      if (halfSomersaults < 1 || halfSomersaults > 9) {
        return false;
      }
      if (halfTwists < 1 || halfTwists > 9) {
        return false;
      }
    } else {
      // 5-digit armstand dive with extended somersaults or twists
      const halfSomersaults = parseInt(numericPart.slice(2, 4), 10);
      const halfTwists = parseInt(numericPart[4], 10);

      if (halfSomersaults < 1) {
        return false;
      }
      if (halfTwists < 1 || halfTwists > 9) {
        return false;
      }
    }

    return true;
  }

  /**
   * Returns error message for invalid dive codes
   */
  defaultMessage(args: ValidationArguments): string {
    return (
      `Invalid FINA dive code: ${args.value}. ` +
      "Format: Groups 1-4: [Group][Flying][Half-Somersaults][Position], " +
      "Group 5: [5][Direction][Half-Somersaults][Half-Twists][Position], " +
      "Group 6: [6][Direction][Half-Somersaults][Half-Twists]?[Position]"
    );
  }
}

/**
 * Parses a FINA dive code and returns its components
 */
export interface ParsedDiveCode {
  group: number;
  groupName: string;
  secondDigit: number;
  secondDigitMeaning: string;
  halfSomersaults: number;
  somersaults: number;
  halfTwists?: number;
  twists?: number;
  position: string;
  positionName: string;
}

/**
 * Parses a valid FINA dive code into its components
 * @param diveCode - A valid FINA dive code string
 * @returns ParsedDiveCode object with all components
 */
export function parseDiveCode(diveCode: string): ParsedDiveCode {
  const position = diveCode.slice(-1).toUpperCase();
  const numericPart = diveCode.slice(0, -1);
  const group = parseInt(numericPart[0], 10);
  const secondDigit = parseInt(numericPart[1], 10);

  const groupNames: Record<number, string> = {
    1: "Forward",
    2: "Back",
    3: "Reverse",
    4: "Inward",
    5: "Twisting",
    6: "Armstand",
  };

  const positionNames: Record<string, string> = {
    A: "Straight",
    B: "Pike",
    C: "Tuck",
    D: "Free",
  };

  const directionNames: Record<number, string> = {
    1: "Forward",
    2: "Back",
    3: "Reverse",
    4: "Inward",
  };

  let secondDigitMeaning: string;
  let halfSomersaults: number;
  let halfTwists: number | undefined;

  if (group >= 1 && group <= 4) {
    // Groups 1-4: second digit is flying indicator
    secondDigitMeaning = secondDigit === 1 ? "Flying" : "No flying";
    halfSomersaults = parseInt(numericPart.slice(2), 10);
  } else if (group === 5) {
    // Group 5: second digit is direction
    secondDigitMeaning = `${directionNames[secondDigit]} direction`;
    if (numericPart.length === 4) {
      halfSomersaults = parseInt(numericPart[2], 10);
      halfTwists = parseInt(numericPart[3], 10);
    } else {
      halfSomersaults = parseInt(numericPart.slice(2, 4), 10);
      halfTwists = parseInt(numericPart[4], 10);
    }
  } else {
    // Group 6: second digit is direction
    secondDigitMeaning = `${directionNames[secondDigit]} direction`;
    if (numericPart.length === 3) {
      halfSomersaults = parseInt(numericPart[2], 10);
    } else if (numericPart.length === 4) {
      halfSomersaults = parseInt(numericPart[2], 10);
      halfTwists = parseInt(numericPart[3], 10);
    } else {
      halfSomersaults = parseInt(numericPart.slice(2, 4), 10);
      halfTwists = parseInt(numericPart[4], 10);
    }
  }

  return {
    group,
    groupName: groupNames[group],
    secondDigit,
    secondDigitMeaning,
    halfSomersaults,
    somersaults: halfSomersaults / 2,
    halfTwists,
    twists: halfTwists ? halfTwists / 2 : undefined,
    position,
    positionName: positionNames[position],
  };
}
