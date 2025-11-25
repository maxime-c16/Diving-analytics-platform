/**
 * FINA Diving Degree of Difficulty (DD) Tables
 * 
 * Based on FINA Diving Rules 2021-2025
 * DD values vary by diving height (apparatus):
 * - 1m Springboard
 * - 3m Springboard  
 * - 5m Platform
 * - 7.5m Platform
 * - 10m Platform
 * 
 * Dive Code Structure:
 * Groups 1-4: [Group][Flying][Somersaults][Position]
 * Group 5 (Twisting): [5][Direction][Somersaults][Twists][Position]
 * Group 6 (Armstand): [6][Direction][Somersaults][Twists]?[Position]
 * 
 * Position codes: A=Straight, B=Pike, C=Tuck, D=Free
 */

export type DivingHeight = '1m' | '3m' | '5m' | '7.5m' | '10m';

export interface DifficultyByHeight {
  '1m'?: number;
  '3m'?: number;
  '5m'?: number;
  '7.5m'?: number;
  '10m'?: number;
}

/**
 * Comprehensive FINA DD Table
 * Keys are dive codes, values are DD by height
 * Some dives are only performed from certain heights (e.g., armstands only from platform)
 */
export const FINA_DD_TABLE: Record<string, DifficultyByHeight> = {
  // ============================================
  // GROUP 1: FORWARD DIVES
  // ============================================
  // Based on FINA DD Table 2022-2025
  // Note: DD increases for higher springboard, decreases for higher platform
  
  // Forward Dive (101)
  '101A': { '1m': 1.4, '3m': 1.6, '5m': 1.6, '7.5m': 1.5, '10m': 1.4 },
  '101B': { '1m': 1.3, '3m': 1.5, '5m': 1.5, '7.5m': 1.4, '10m': 1.3 },
  '101C': { '1m': 1.2, '3m': 1.4, '5m': 1.4, '7.5m': 1.3, '10m': 1.2 },
  
  // Forward 1 Somersault (102)
  '102A': { '1m': 1.6, '3m': 1.7, '5m': 1.6, '7.5m': 1.5, '10m': 1.4 },
  '102B': { '1m': 1.5, '3m': 1.6, '5m': 1.5, '7.5m': 1.4, '10m': 1.3 },
  '102C': { '1m': 1.4, '3m': 1.5, '5m': 1.4, '7.5m': 1.3, '10m': 1.2 },
  
  // Forward 1.5 Somersaults (103)
  '103A': { '1m': 2.0, '3m': 2.1, '5m': 2.0, '7.5m': 1.9, '10m': 1.8 },
  '103B': { '1m': 1.7, '3m': 1.8, '5m': 1.7, '7.5m': 1.6, '10m': 1.5 },
  '103C': { '1m': 1.6, '3m': 1.5, '5m': 1.6, '7.5m': 1.5, '10m': 1.4 },
  
  // Forward 2 Somersaults (104)
  '104A': { '1m': 2.6, '3m': 2.7, '5m': 2.5, '7.5m': 2.4, '10m': 2.3 },
  '104B': { '1m': 2.3, '3m': 2.4, '5m': 2.2, '7.5m': 2.1, '10m': 2.0 },
  '104C': { '1m': 2.2, '3m': 2.3, '5m': 2.1, '7.5m': 2.0, '10m': 1.9 },
  
  // Forward 2.5 Somersaults (105)
  '105A': { '3m': 3.3, '5m': 3.1, '7.5m': 3.0, '10m': 2.8 },
  '105B': { '1m': 2.6, '3m': 2.8, '5m': 2.5, '7.5m': 2.4, '10m': 2.2 },
  '105C': { '1m': 2.4, '3m': 2.6, '5m': 2.3, '7.5m': 2.2, '10m': 2.0 },
  
  // Forward 3 Somersaults (106)
  '106A': { '5m': 3.6, '7.5m': 3.4, '10m': 3.2 },
  '106B': { '3m': 3.3, '5m': 3.1, '7.5m': 2.9, '10m': 2.7 },
  '106C': { '3m': 3.0, '5m': 2.8, '7.5m': 2.6, '10m': 2.4 },
  
  // Forward 3.5 Somersaults (107)
  '107A': { '10m': 3.6 },
  '107B': { '3m': 3.5, '5m': 3.3, '7.5m': 3.1, '10m': 2.9 },
  '107C': { '3m': 3.2, '5m': 3.0, '7.5m': 2.8, '10m': 2.6 },
  
  // Forward 4 Somersaults (108)
  '108B': { '10m': 3.3 },
  '108C': { '10m': 3.0 },
  
  // Forward 4.5 Somersaults (109)
  '109B': { '10m': 3.7 },
  '109C': { '10m': 3.5 },
  
  // ============================================
  // GROUP 1: FORWARD FLYING DIVES
  // ============================================
  
  // Forward Flying 1 Somersault (112)
  '112A': { '1m': 1.7, '3m': 1.7, '5m': 1.6, '7.5m': 1.6, '10m': 1.5 },
  '112B': { '1m': 1.6, '3m': 1.6, '5m': 1.5, '7.5m': 1.5, '10m': 1.4 },
  '112C': { '1m': 1.5, '3m': 1.5, '5m': 1.4, '7.5m': 1.4, '10m': 1.3 },
  
  // Forward Flying 1.5 Somersaults (113)
  '113A': { '1m': 2.1, '3m': 2.1, '5m': 2.0, '7.5m': 2.0, '10m': 1.9 },
  '113B': { '1m': 1.8, '3m': 1.8, '5m': 1.7, '7.5m': 1.7, '10m': 1.6 },
  '113C': { '1m': 1.7, '3m': 1.7, '5m': 1.6, '7.5m': 1.6, '10m': 1.5 },
  
  // Forward Flying 2 Somersaults (114)
  '114A': { '1m': 2.7, '3m': 2.7, '5m': 2.6, '7.5m': 2.5, '10m': 2.4 },
  '114B': { '1m': 2.4, '3m': 2.4, '5m': 2.3, '7.5m': 2.2, '10m': 2.1 },
  '114C': { '1m': 2.3, '3m': 2.3, '5m': 2.2, '7.5m': 2.1, '10m': 2.0 },
  
  // Forward Flying 2.5 Somersaults (115)
  '115A': { '3m': 3.3, '5m': 3.2, '7.5m': 3.1, '10m': 2.9 },
  '115B': { '1m': 3.0, '3m': 3.0, '5m': 2.9, '7.5m': 2.8, '10m': 2.6 },
  '115C': { '1m': 2.8, '3m': 2.8, '5m': 2.7, '7.5m': 2.6, '10m': 2.4 },
  
  // ============================================
  // GROUP 2: BACK DIVES
  // ============================================
  
  // Back Dive (201)
  '201A': { '1m': 1.7, '3m': 1.9, '5m': 1.8, '7.5m': 1.7, '10m': 1.6 },
  '201B': { '1m': 1.6, '3m': 1.8, '5m': 1.7, '7.5m': 1.6, '10m': 1.5 },
  '201C': { '1m': 1.5, '3m': 1.7, '5m': 1.6, '7.5m': 1.5, '10m': 1.4 },
  
  // Back 1 Somersault (202)
  '202A': { '1m': 1.7, '3m': 1.8, '5m': 1.7, '7.5m': 1.6, '10m': 1.5 },
  '202B': { '1m': 1.5, '3m': 1.6, '5m': 1.5, '7.5m': 1.4, '10m': 1.3 },
  '202C': { '1m': 1.5, '3m': 1.6, '5m': 1.5, '7.5m': 1.4, '10m': 1.3 },
  
  // Back 1.5 Somersaults (203)
  '203A': { '1m': 2.3, '3m': 2.5, '5m': 2.3, '7.5m': 2.2, '10m': 2.0 },
  '203B': { '1m': 2.0, '3m': 2.2, '5m': 2.0, '7.5m': 1.9, '10m': 1.7 },
  '203C': { '1m': 1.9, '3m': 2.1, '5m': 1.9, '7.5m': 1.8, '10m': 1.6 },
  
  // Back 2 Somersaults (204)
  '204A': { '1m': 2.6, '3m': 2.8, '5m': 2.6, '7.5m': 2.4, '10m': 2.3 },
  '204B': { '1m': 2.4, '3m': 2.5, '5m': 2.3, '7.5m': 2.2, '10m': 2.1 },
  '204C': { '1m': 2.2, '3m': 2.3, '5m': 2.1, '7.5m': 2.0, '10m': 1.9 },
  
  // Back 2.5 Somersaults (205)
  '205A': { '3m': 3.4, '5m': 3.1, '7.5m': 3.0, '10m': 2.8 },
  '205B': { '1m': 2.9, '3m': 3.0, '5m': 2.8, '7.5m': 2.7, '10m': 2.5 },
  '205C': { '1m': 2.7, '3m': 2.8, '5m': 2.6, '7.5m': 2.5, '10m': 2.3 },
  
  // Back 3 Somersaults (206)
  '206A': { '5m': 3.6, '7.5m': 3.4, '10m': 3.2 },
  '206B': { '3m': 3.4, '5m': 3.1, '7.5m': 2.9, '10m': 2.7 },
  '206C': { '3m': 3.1, '5m': 2.8, '7.5m': 2.6, '10m': 2.4 },
  
  // Back 3.5 Somersaults (207)
  '207A': { '10m': 3.6 },
  '207B': { '3m': 3.8, '5m': 3.4, '7.5m': 3.2, '10m': 3.0 },
  '207C': { '3m': 3.5, '5m': 3.1, '7.5m': 2.9, '10m': 2.7 },
  
  // ============================================
  // GROUP 3: REVERSE DIVES
  // ============================================
  
  // Reverse Dive (301)
  '301A': { '1m': 1.8, '3m': 2.0, '5m': 1.9, '7.5m': 1.8, '10m': 1.7 },
  '301B': { '1m': 1.7, '3m': 1.9, '5m': 1.8, '7.5m': 1.7, '10m': 1.6 },
  '301C': { '1m': 1.6, '3m': 1.8, '5m': 1.7, '7.5m': 1.6, '10m': 1.5 },
  
  // Reverse 1 Somersault (302)
  '302A': { '1m': 1.8, '3m': 1.9, '5m': 1.8, '7.5m': 1.7, '10m': 1.6 },
  '302B': { '1m': 1.6, '3m': 1.7, '5m': 1.6, '7.5m': 1.5, '10m': 1.4 },
  '302C': { '1m': 1.6, '3m': 1.7, '5m': 1.6, '7.5m': 1.5, '10m': 1.4 },
  
  // Reverse 1.5 Somersaults (303)
  '303A': { '1m': 2.4, '3m': 2.6, '5m': 2.4, '7.5m': 2.3, '10m': 2.1 },
  '303B': { '1m': 2.1, '3m': 2.3, '5m': 2.1, '7.5m': 2.0, '10m': 1.8 },
  '303C': { '1m': 2.0, '3m': 2.2, '5m': 2.0, '7.5m': 1.9, '10m': 1.7 },
  
  // Reverse 2 Somersaults (304)
  '304A': { '1m': 2.6, '3m': 2.8, '5m': 2.6, '7.5m': 2.5, '10m': 2.3 },
  '304B': { '1m': 2.4, '3m': 2.6, '5m': 2.4, '7.5m': 2.3, '10m': 2.1 },
  '304C': { '1m': 2.3, '3m': 2.5, '5m': 2.3, '7.5m': 2.2, '10m': 2.0 },
  
  // Reverse 2.5 Somersaults (305)
  '305A': { '3m': 3.4, '5m': 3.2, '7.5m': 3.0, '10m': 2.8 },
  '305B': { '1m': 2.9, '3m': 3.1, '5m': 2.9, '7.5m': 2.7, '10m': 2.5 },
  '305C': { '1m': 2.8, '3m': 3.0, '5m': 2.8, '7.5m': 2.6, '10m': 2.4 },
  
  // Reverse 3 Somersaults (306)
  '306A': { '5m': 3.8, '7.5m': 3.5, '10m': 3.2 },
  '306B': { '3m': 3.5, '5m': 3.2, '7.5m': 3.0, '10m': 2.8 },
  '306C': { '3m': 3.2, '5m': 2.9, '7.5m': 2.7, '10m': 2.5 },
  
  // Reverse 3.5 Somersaults (307)
  '307A': { '10m': 3.7 },
  '307B': { '3m': 3.8, '5m': 3.5, '7.5m': 3.2, '10m': 3.0 },
  '307C': { '3m': 3.5, '5m': 3.2, '7.5m': 3.0, '10m': 2.8 },
  
  // ============================================
  // GROUP 4: INWARD DIVES
  // ============================================
  
  // Inward Dive (401)
  '401A': { '1m': 1.5, '3m': 1.7, '5m': 1.6, '7.5m': 1.5, '10m': 1.4 },
  '401B': { '1m': 1.4, '3m': 1.4, '5m': 1.5, '7.5m': 1.4, '10m': 1.3 },
  '401C': { '1m': 1.3, '3m': 1.5, '5m': 1.4, '7.5m': 1.3, '10m': 1.2 },
  
  // Inward 1 Somersault (402)
  '402A': { '1m': 1.7, '3m': 1.9, '5m': 1.8, '7.5m': 1.7, '10m': 1.6 },
  '402B': { '1m': 1.5, '3m': 1.7, '5m': 1.6, '7.5m': 1.5, '10m': 1.4 },
  '402C': { '1m': 1.4, '3m': 1.6, '5m': 1.5, '7.5m': 1.4, '10m': 1.3 },
  
  // Inward 1.5 Somersaults (403)
  '403A': { '1m': 2.4, '3m': 2.6, '5m': 2.4, '7.5m': 2.3, '10m': 2.1 },
  '403B': { '1m': 2.2, '3m': 2.4, '5m': 2.2, '7.5m': 2.1, '10m': 1.9 },
  '403C': { '1m': 2.1, '3m': 2.3, '5m': 2.1, '7.5m': 2.0, '10m': 1.8 },
  
  // Inward 2 Somersaults (404)
  '404A': { '1m': 3.0, '3m': 3.2, '5m': 3.0, '7.5m': 2.9, '10m': 2.7 },
  '404B': { '1m': 2.8, '3m': 3.0, '5m': 2.8, '7.5m': 2.7, '10m': 2.5 },
  '404C': { '1m': 2.6, '3m': 2.8, '5m': 2.6, '7.5m': 2.5, '10m': 2.3 },
  
  // Inward 2.5 Somersaults (405)
  '405A': { '3m': 3.7, '5m': 3.5, '7.5m': 3.3, '10m': 3.1 },
  '405B': { '1m': 3.0, '3m': 3.2, '5m': 3.0, '7.5m': 2.8, '10m': 2.6 },
  '405C': { '1m': 2.9, '3m': 3.1, '5m': 2.9, '7.5m': 2.7, '10m': 2.5 },
  
  // Inward 3 Somersaults (406)
  '406A': { '5m': 4.0, '7.5m': 3.7, '10m': 3.4 },
  '406B': { '3m': 3.6, '5m': 3.4, '7.5m': 3.2, '10m': 2.9 },
  '406C': { '3m': 3.4, '5m': 3.2, '7.5m': 3.0, '10m': 2.7 },
  
  // Inward 3.5 Somersaults (407)
  '407A': { '10m': 3.9 },
  '407B': { '3m': 3.9, '5m': 3.6, '7.5m': 3.4, '10m': 3.1 },
  '407C': { '3m': 3.6, '5m': 3.3, '7.5m': 3.1, '10m': 2.8 },
  
  // ============================================
  // GROUP 5: TWISTING DIVES - FORWARD
  // ============================================
  
  // Forward Dive with Twist (5111)
  '5111A': { '1m': 1.8, '3m': 2.0, '5m': 1.8, '7.5m': 1.7, '10m': 1.6 },
  '5111B': { '1m': 1.6, '3m': 1.8, '5m': 1.6, '7.5m': 1.5, '10m': 1.4 },
  
  // Forward 1 Somersault with 1/2 Twist (5121)
  '5121D': { '1m': 1.7, '3m': 1.9, '5m': 1.7, '7.5m': 1.6, '10m': 1.5 },
  
  // Forward 1 Somersault with 1 Twist (5122)
  '5122D': { '1m': 1.9, '3m': 2.1, '5m': 1.9, '7.5m': 1.8, '10m': 1.7 },
  
  // Forward 1 Somersault with 2 Twists (5124)
  '5124D': { '1m': 2.3, '3m': 2.5, '5m': 2.3, '7.5m': 2.2, '10m': 2.1 },
  
  // Forward 1 Somersault with 3 Twists (5126)
  '5126D': { '1m': 2.9, '3m': 3.1, '5m': 2.9, '7.5m': 2.8, '10m': 2.7 },
  
  // Forward 1.5 Somersaults with 1/2 Twist (5131)
  '5131D': { '1m': 2.0, '3m': 2.2, '5m': 2.0, '7.5m': 1.9, '10m': 1.8 },
  
  // Forward 1.5 Somersaults with 1 Twist (5132)
  '5132D': { '1m': 2.2, '3m': 2.4, '5m': 2.2, '7.5m': 2.1, '10m': 2.0 },
  
  // Forward 1.5 Somersaults with 2 Twists (5134)
  '5134D': { '1m': 2.6, '3m': 2.8, '5m': 2.6, '7.5m': 2.5, '10m': 2.4 },
  
  // Forward 1.5 Somersaults with 3 Twists (5136)
  '5136D': { '1m': 3.2, '3m': 3.4, '5m': 3.2, '7.5m': 3.1, '10m': 3.0 },
  
  // Forward 2.5 Somersaults with 1 Twist (5152)
  '5152B': { '1m': 3.0, '3m': 3.2, '5m': 3.0, '7.5m': 2.8, '10m': 2.6 },
  '5152D': { '1m': 2.8, '3m': 3.0, '5m': 2.8, '7.5m': 2.6, '10m': 2.4 },
  
  // Forward 2.5 Somersaults with 2 Twists (5154)
  '5154B': { '3m': 3.6, '5m': 3.4, '7.5m': 3.1, '10m': 2.9 },
  '5154D': { '3m': 3.4, '5m': 3.2, '7.5m': 2.9, '10m': 2.7 },
  
  // Forward 2.5 Somersaults with 3 Twists (5156)
  '5156B': { '3m': 3.8, '5m': 3.6, '7.5m': 3.3, '10m': 3.1 },
  '5156D': { '3m': 3.7, '5m': 3.5, '7.5m': 3.2, '10m': 3.0 },
  
  // Forward 3.5 Somersaults with 1 Twist (5172)
  '5172B': { '10m': 3.4 },
  
  // Forward 4.5 Somersaults with 1/2 Twist (5191)
  '5191B': { '10m': 3.8 },
  
  // ============================================
  // GROUP 5: TWISTING DIVES - BACK
  // ============================================
  
  // Back Dive with Twist (5211)
  '5211A': { '1m': 1.8, '3m': 2.0, '5m': 1.8, '7.5m': 1.7, '10m': 1.6 },
  '5211B': { '1m': 1.6, '3m': 1.8, '5m': 1.6, '7.5m': 1.5, '10m': 1.4 },
  
  // Back 1 Somersault with 1/2 Twist (5221)
  '5221D': { '1m': 1.7, '3m': 1.9, '5m': 1.7, '7.5m': 1.6, '10m': 1.5 },
  
  // Back 1 Somersault with 1 Twist (5222)
  '5222D': { '1m': 1.9, '3m': 2.1, '5m': 1.9, '7.5m': 1.8, '10m': 1.7 },
  
  // Back 1 Somersault with 1.5 Twists (5223)
  '5223D': { '1m': 2.3, '3m': 2.5, '5m': 2.3, '7.5m': 2.2, '10m': 2.1 },
  
  // Back 1 Somersault with 2.5 Twists (5225)
  '5225D': { '1m': 2.9, '3m': 3.1, '5m': 2.9, '7.5m': 2.8, '10m': 2.7 },
  
  // Back 1.5 Somersaults with 1/2 Twist (5231)
  '5231D': { '1m': 2.0, '3m': 2.2, '5m': 2.0, '7.5m': 1.9, '10m': 1.8 },
  
  // Back 1.5 Somersaults with 1.5 Twists (5233)
  '5233D': { '1m': 2.4, '3m': 2.6, '5m': 2.4, '7.5m': 2.3, '10m': 2.2 },
  
  // Back 1.5 Somersaults with 2.5 Twists (5235)
  '5235D': { '1m': 3.0, '3m': 3.2, '5m': 3.0, '7.5m': 2.9, '10m': 2.8 },
  
  // Back 2.5 Somersaults with 1/2 Twist (5251)
  '5251B': { '1m': 2.8, '3m': 3.0, '5m': 2.8, '7.5m': 2.6, '10m': 2.4 },
  '5251D': { '1m': 2.6, '3m': 2.8, '5m': 2.6, '7.5m': 2.4, '10m': 2.2 },
  
  // Back 2.5 Somersaults with 1.5 Twists (5253)
  '5253B': { '3m': 3.4, '5m': 3.2, '7.5m': 2.9, '10m': 2.7 },
  '5253D': { '3m': 3.2, '5m': 3.0, '7.5m': 2.7, '10m': 2.5 },
  
  // Back 2.5 Somersaults with 2.5 Twists (5255)
  '5255B': { '3m': 3.8, '5m': 3.6, '7.5m': 3.3, '10m': 3.1 },
  '5255D': { '3m': 3.6, '5m': 3.4, '7.5m': 3.1, '10m': 2.9 },
  
  // ============================================
  // GROUP 5: TWISTING DIVES - REVERSE
  // ============================================
  
  // Reverse Dive with Twist (5311)
  '5311A': { '1m': 1.9, '3m': 2.1, '5m': 1.9, '7.5m': 1.8, '10m': 1.7 },
  '5311B': { '1m': 1.7, '3m': 1.9, '5m': 1.7, '7.5m': 1.6, '10m': 1.5 },
  
  // Reverse 1 Somersault with 1/2 Twist (5321)
  '5321D': { '1m': 1.8, '3m': 2.0, '5m': 1.8, '7.5m': 1.7, '10m': 1.6 },
  
  // Reverse 1 Somersault with 1 Twist (5322)
  '5322D': { '1m': 2.0, '3m': 2.2, '5m': 2.0, '7.5m': 1.9, '10m': 1.8 },
  
  // Reverse 1 Somersault with 1.5 Twists (5323)
  '5323D': { '1m': 2.4, '3m': 2.6, '5m': 2.4, '7.5m': 2.3, '10m': 2.2 },
  
  // Reverse 1 Somersault with 2.5 Twists (5325)
  '5325D': { '1m': 3.0, '3m': 3.2, '5m': 3.0, '7.5m': 2.9, '10m': 2.8 },
  
  // Reverse 1.5 Somersaults with 1/2 Twist (5331)
  '5331D': { '1m': 2.1, '3m': 2.3, '5m': 2.1, '7.5m': 2.0, '10m': 1.9 },
  
  // Reverse 1.5 Somersaults with 1.5 Twists (5333)
  '5333D': { '1m': 2.5, '3m': 2.7, '5m': 2.5, '7.5m': 2.4, '10m': 2.3 },
  
  // Reverse 1.5 Somersaults with 2.5 Twists (5335)
  '5335D': { '1m': 3.1, '3m': 3.3, '5m': 3.1, '7.5m': 3.0, '10m': 2.9 },
  
  // Reverse 2.5 Somersaults with 1/2 Twist (5351)
  '5351B': { '1m': 2.9, '3m': 3.1, '5m': 2.9, '7.5m': 2.7, '10m': 2.5 },
  '5351D': { '1m': 2.7, '3m': 2.9, '5m': 2.7, '7.5m': 2.5, '10m': 2.3 },
  
  // Reverse 2.5 Somersaults with 1.5 Twists (5353)
  '5353B': { '3m': 3.5, '5m': 3.3, '7.5m': 3.0, '10m': 2.8 },
  '5353D': { '3m': 3.3, '5m': 3.1, '7.5m': 2.8, '10m': 2.6 },
  
  // Reverse 2.5 Somersaults with 2.5 Twists (5355)
  '5355B': { '3m': 3.9, '5m': 3.7, '7.5m': 3.4, '10m': 3.2 },
  '5355D': { '3m': 3.7, '5m': 3.5, '7.5m': 3.2, '10m': 3.0 },
  
  // ============================================
  // GROUP 5: TWISTING DIVES - INWARD
  // ============================================
  
  // Inward Dive with Twist (5411)
  '5411A': { '1m': 1.6, '3m': 1.8, '5m': 1.6, '7.5m': 1.5, '10m': 1.4 },
  '5411B': { '1m': 1.5, '3m': 1.7, '5m': 1.5, '7.5m': 1.4, '10m': 1.3 },
  
  // Inward 1 Somersault with 1/2 Twist (5421)
  '5421D': { '1m': 1.7, '3m': 1.9, '5m': 1.7, '7.5m': 1.6, '10m': 1.5 },
  
  // Inward 1 Somersault with 1 Twist (5422)
  '5422D': { '1m': 1.9, '3m': 2.1, '5m': 1.9, '7.5m': 1.8, '10m': 1.7 },
  
  // Inward 1 Somersault with 1.5 Twists (5423)
  '5423D': { '1m': 2.3, '3m': 2.5, '5m': 2.3, '7.5m': 2.2, '10m': 2.1 },
  
  // Inward 1 Somersault with 2.5 Twists (5425)
  '5425D': { '1m': 2.9, '3m': 3.1, '5m': 2.9, '7.5m': 2.8, '10m': 2.7 },
  
  // Inward 1.5 Somersaults with 1/2 Twist (5431)
  '5431D': { '1m': 2.2, '3m': 2.4, '5m': 2.2, '7.5m': 2.1, '10m': 2.0 },
  
  // Inward 1.5 Somersaults with 1.5 Twists (5433)
  '5433D': { '1m': 2.6, '3m': 2.8, '5m': 2.6, '7.5m': 2.5, '10m': 2.4 },
  
  // Inward 1.5 Somersaults with 2.5 Twists (5435)
  '5435D': { '1m': 3.2, '3m': 3.4, '5m': 3.2, '7.5m': 3.1, '10m': 3.0 },
  
  // Inward 2.5 Somersaults with 1/2 Twist (5451)
  '5451B': { '3m': 3.4, '5m': 3.2, '7.5m': 2.9, '10m': 2.7 },
  '5451D': { '3m': 3.2, '5m': 3.0, '7.5m': 2.7, '10m': 2.5 },
  
  // Inward 2.5 Somersaults with 1.5 Twists (5453)
  '5453B': { '3m': 3.7, '5m': 3.5, '7.5m': 3.2, '10m': 3.0 },
  '5453D': { '3m': 3.5, '5m': 3.3, '7.5m': 3.0, '10m': 2.8 },
  
  // ============================================
  // GROUP 6: ARMSTAND DIVES (Platform Only)
  // ============================================
  
  // Armstand Back Dive (612)
  '612A': { '5m': 1.9, '7.5m': 1.8, '10m': 1.7 },
  '612B': { '5m': 1.8, '7.5m': 1.7, '10m': 1.6 },
  '612C': { '5m': 1.7, '7.5m': 1.6, '10m': 1.5 },
  
  // Armstand Back 1 Somersault (614)
  '614A': { '5m': 2.2, '7.5m': 2.1, '10m': 2.0 },
  '614B': { '5m': 2.1, '7.5m': 2.0, '10m': 1.9 },
  '614C': { '5m': 2.0, '7.5m': 1.9, '10m': 1.8 },
  
  // Armstand Back 1.5 Somersaults (616)
  '616A': { '5m': 2.8, '7.5m': 2.7, '10m': 2.5 },
  '616B': { '5m': 2.7, '7.5m': 2.6, '10m': 2.4 },
  '616C': { '5m': 2.6, '7.5m': 2.5, '10m': 2.3 },
  
  // Armstand Back 2 Somersaults (618)
  '618A': { '5m': 3.3, '7.5m': 3.1, '10m': 2.9 },
  '618B': { '5m': 3.2, '7.5m': 3.0, '10m': 2.8 },
  '618C': { '5m': 3.0, '7.5m': 2.8, '10m': 2.6 },
  
  // Armstand Back 2.5 Somersaults (620)
  '620A': { '10m': 3.3 },
  '620B': { '7.5m': 3.4, '10m': 3.2 },
  '620C': { '7.5m': 3.2, '10m': 3.0 },
  
  // Armstand Back 3 Somersaults (622)
  '622B': { '10m': 3.6 },
  '622C': { '10m': 3.4 },
  
  // Armstand Forward Dive (612 - forward direction)
  '6112A': { '5m': 1.9, '7.5m': 1.8, '10m': 1.7 },
  '6112B': { '5m': 1.8, '7.5m': 1.7, '10m': 1.6 },
  '6112C': { '5m': 1.7, '7.5m': 1.6, '10m': 1.5 },
  
  // Armstand Forward 1 Somersault (6114)
  '6114A': { '5m': 2.2, '7.5m': 2.1, '10m': 2.0 },
  '6114B': { '5m': 2.1, '7.5m': 2.0, '10m': 1.9 },
  '6114C': { '5m': 2.0, '7.5m': 1.9, '10m': 1.8 },
  
  // Armstand Forward 1.5 Somersaults (6116)
  '6116A': { '5m': 2.8, '7.5m': 2.7, '10m': 2.5 },
  '6116B': { '5m': 2.7, '7.5m': 2.6, '10m': 2.4 },
  '6116C': { '5m': 2.6, '7.5m': 2.5, '10m': 2.3 },
  
  // Armstand Forward 2 Somersaults (6118)
  '6118A': { '5m': 3.3, '7.5m': 3.1, '10m': 2.9 },
  '6118B': { '5m': 3.2, '7.5m': 3.0, '10m': 2.8 },
  '6118C': { '5m': 3.0, '7.5m': 2.8, '10m': 2.6 },
  
  // Armstand Forward 2.5 Somersaults (6120)
  '6120A': { '10m': 3.3 },
  '6120B': { '7.5m': 3.4, '10m': 3.2 },
  '6120C': { '7.5m': 3.2, '10m': 3.0 },
  
  // Armstand Forward 3 Somersaults (6122)
  '6122B': { '10m': 3.6 },
  '6122C': { '10m': 3.4 },
  
  // Armstand Twisting Dives
  '6121B': { '5m': 2.3, '7.5m': 2.2, '10m': 2.0 },
  '6121D': { '5m': 2.1, '7.5m': 2.0, '10m': 1.8 },
  '6122D': { '5m': 2.3, '7.5m': 2.2, '10m': 2.0 },
  '6124D': { '5m': 2.9, '7.5m': 2.8, '10m': 2.6 },
  '6142D': { '5m': 2.8, '7.5m': 2.7, '10m': 2.5 },
  '6143D': { '5m': 3.0, '7.5m': 2.9, '10m': 2.7 },
  '6162D': { '7.5m': 3.2, '10m': 3.0 },
  '6243D': { '10m': 3.2 },
};

/**
 * Get the Degree of Difficulty for a dive at a specific height
 * @param diveCode - The FINA dive code
 * @param height - The diving height (apparatus)
 * @returns The DD value or null if not found
 */
export function getDifficultyForHeight(diveCode: string, height: DivingHeight): number | null {
  const upperCode = diveCode.toUpperCase();
  const diveDD = FINA_DD_TABLE[upperCode];
  
  if (!diveDD) {
    return null;
  }
  
  return diveDD[height] ?? null;
}

/**
 * Get all available heights for a dive code
 * @param diveCode - The FINA dive code
 * @returns Array of available heights
 */
export function getAvailableHeightsForDive(diveCode: string): DivingHeight[] {
  const upperCode = diveCode.toUpperCase();
  const diveDD = FINA_DD_TABLE[upperCode];
  
  if (!diveDD) {
    return [];
  }
  
  return Object.keys(diveDD).filter(h => diveDD[h as DivingHeight] !== undefined) as DivingHeight[];
}

/**
 * Check if a dive is valid for a specific height
 * @param diveCode - The FINA dive code
 * @param height - The diving height
 * @returns true if the dive can be performed at that height
 */
export function isDiveValidForHeight(diveCode: string, height: DivingHeight): boolean {
  return getDifficultyForHeight(diveCode, height) !== null;
}

/**
 * Classify height into apparatus type
 */
export function getApparatusType(height: DivingHeight): 'springboard' | 'platform' {
  return height === '1m' || height === '3m' ? 'springboard' : 'platform';
}
