export interface SkillConfig {
  uciElo: number;
  limitStrength: boolean;
}

const ELO_STEPS: [number, SkillConfig][] = [
  [1000, { uciElo: 1000, limitStrength: true }],
  [1100, { uciElo: 1100, limitStrength: true }],
  [1200, { uciElo: 1200, limitStrength: true }],
  [1300, { uciElo: 1300, limitStrength: true }],
  [1400, { uciElo: 1400, limitStrength: true }],
  [1500, { uciElo: 1500, limitStrength: true }],
  [1600, { uciElo: 1600, limitStrength: true }],
  [1700, { uciElo: 1700, limitStrength: true }],
  [1800, { uciElo: 1800, limitStrength: true }],
  [1900, { uciElo: 1900, limitStrength: true }],
  [2000, { uciElo: 2000, limitStrength: true }],
  [2100, { uciElo: 2100, limitStrength: true }],
  [2200, { uciElo: 2200, limitStrength: true }],
  [2300, { uciElo: 2300, limitStrength: true }],
  [2400, { uciElo: 2400, limitStrength: true }],
  [2500, { uciElo: 2500, limitStrength: false }],
];

export const AI_LEVEL_OPTIONS = ELO_STEPS.map(([elo]) => elo);

export function getSkillConfig(targetElo: number): SkillConfig {
  const closest = ELO_STEPS.reduce((prev, curr) =>
    Math.abs(curr[0] - targetElo) < Math.abs(prev[0] - targetElo) ? curr : prev
  );
  return closest[1];
}
