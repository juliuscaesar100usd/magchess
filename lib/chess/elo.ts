export function getKFactor(rating: number, gamesPlayed: number): number {
  if (gamesPlayed < 30) return 40;
  if (rating < 2400) return 20;
  return 10;
}

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function calculateNewRating(
  rating: number,
  opponentRating: number,
  score: number,
  gamesPlayed: number
): number {
  const k = getKFactor(rating, gamesPlayed);
  const expected = expectedScore(rating, opponentRating);
  return Math.round(rating + k * (score - expected));
}
