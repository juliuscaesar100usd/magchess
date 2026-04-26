import type { MoveQuality } from '@/types/game';

const TEMPLATES: Record<MoveQuality, string[]> = {
  brilliant: [
    '{player} finds a brilliant move — {san}! The engine is absolutely delighted.',
    'What a find! {san} is a computer-level idea that most players would miss.',
    'Spectacular chess! {san} significantly improves {player}\'s position.',
    'Genius move! {san} shows real depth of calculation by {player}.',
    'The crowd goes wild — {san} is a truly brilliant shot!',
    'An exceptional move! {san} changes the entire character of the position.',
    'Computers would be proud of {san} — {player} has found the ideal square.',
    'That\'s the move! {san} is a stunning choice that tips the balance dramatically.',
  ],
  good: [
    '{player} plays {san} — a solid, accurate continuation.',
    'Nice move! {san} keeps the position ticking along nicely for {player}.',
    '{san} is a good practical choice by {player}.',
    'Well played! {san} maintains the advantage for {player}.',
    '{player} finds {san} — clean and effective.',
    'A precise response: {san} keeps {player} on the right track.',
    'Good technique from {player} with {san}.',
    '{san} — accurate and purposeful from {player}.',
  ],
  neutral: [
    '{player} plays {san}, keeping the tension in the position.',
    'The position remains balanced after {san}.',
    '{san} — a natural developing move by {player}.',
    '{player} opts for {san}, a reasonable choice.',
    'The game continues with {san} from {player}.',
    '{san} — steady play from {player}.',
    'Nothing spectacular, but {san} does the job for {player}.',
    '{player} keeps things solid with {san}.',
  ],
  inaccuracy: [
    '{player} plays {san} — not the best, but not terrible.',
    'A slight inaccuracy: {san} gives up a small edge.',
    '{san} is a slightly imprecise move from {player}.',
    'The engine prefers a different approach, but {san} keeps the game playable.',
    '{player} could do better than {san} here.',
    'A minor slip with {san} — {player} had more accurate options.',
    '{san} is a touch imprecise from {player}, though the game goes on.',
    'Hmm, {san} wasn\'t ideal for {player}, but it\'s far from fatal.',
  ],
  mistake: [
    'Oh, {san} is a mistake! {player} had better options here.',
    'That doesn\'t look right — {san} drops some of {player}\'s advantage.',
    '{player} goes wrong with {san}. The opponent will be pleased.',
    'A significant error from {player}: {san} changes the evaluation considerably.',
    '{san} — that\'s a mistake by {player}. The position has swung.',
    'Things have gone astray for {player} with {san}.',
    'Not ideal! {san} from {player} allows the opponent to seize the initiative.',
    'A costly mistake: {san} lets {player}\'s opponent back into the game.',
  ],
  blunder: [
    'Oh no — {san} is a serious blunder from {player}!',
    'That\'s a devastating error! {san} throws away the advantage completely.',
    'Heartbreak for {player} — {san} is a catastrophic mistake.',
    '{san} — {player} will regret that one. A major blunder!',
    'What a shock! {san} changes everything — this is a clear blunder.',
    '{player} blunders with {san}. The position has completely turned around.',
    'An incredible collapse! {san} from {player} is a decisive error.',
    'The crowd falls silent — {san} is a brutal blunder by {player}.',
  ],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateCommentary(
  quality: MoveQuality,
  san: string,
  player: 'White' | 'Black'
): string {
  const template = pick(TEMPLATES[quality]);
  return template.replace(/\{player\}/g, player).replace(/\{san\}/g, san);
}
