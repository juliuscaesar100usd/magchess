export const COIN_PACKAGES = {
  coins_100: { coins: 100, amount: 99, label: '100 Coins' },
  coins_500: { coins: 500, amount: 399, label: '500 Coins' },
  coins_1200: { coins: 1200, amount: 799, label: '1,200 Coins' },
  coins_3000: { coins: 3000, amount: 1799, label: '3,000 Coins' },
} as const;

export type CoinPackageId = keyof typeof COIN_PACKAGES;
