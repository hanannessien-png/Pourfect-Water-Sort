import { BOOSTER_PACKS, REWARDS, cosmetic, type BoosterKind } from '@/src/config/cosmetics';
import type { SaveData } from './saveData';

/** Pure save transitions for the shop, daily gift and rewarded videos (unit-tested). */

export type ShopError = 'unknown' | 'owned' | 'notOwned' | 'coins' | 'limit' | 'claimed';
export type ShopResult = { ok: true; save: SaveData } | { ok: false; error: ShopError };

const fail = (error: ShopError): ShopResult => ({ ok: false, error });

/** Local calendar day key, e.g. "2026-10-14". */
export function dayKey(now: Date): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

export function owns(save: SaveData, id: string): boolean {
  return save.cosmetics.owned.includes(id);
}

export function isEquipped(save: SaveData, id: string): boolean {
  const it = cosmetic(id);
  return !!it && save.cosmetics.equipped[it.kind] === id;
}

/** Buy a cosmetic with coins and equip it straight away. */
export function buyCosmetic(save: SaveData, id: string): ShopResult {
  const it = cosmetic(id);
  if (!it) return fail('unknown');
  if (owns(save, id)) return fail('owned');
  if (save.wallet.coins < it.price) return fail('coins');
  return {
    ok: true,
    save: {
      ...save,
      wallet: { ...save.wallet, coins: save.wallet.coins - it.price },
      cosmetics: {
        owned: [...save.cosmetics.owned, id],
        equipped: { ...save.cosmetics.equipped, [it.kind]: id },
      },
    },
  };
}

export function equipCosmetic(save: SaveData, id: string): ShopResult {
  const it = cosmetic(id);
  if (!it) return fail('unknown');
  if (!owns(save, id)) return fail('notOwned');
  return { ok: true, save: { ...save, cosmetics: { ...save.cosmetics, equipped: { ...save.cosmetics.equipped, [it.kind]: id } } } };
}

export function buyBoosterPack(save: SaveData, packId: string): ShopResult {
  const pack = BOOSTER_PACKS.find((p) => p.id === packId);
  if (!pack) return fail('unknown');
  if (save.wallet.coins < pack.price) return fail('coins');
  return {
    ok: true,
    save: {
      ...save,
      wallet: { ...save.wallet, coins: save.wallet.coins - pack.price },
      tokens: { ...save.tokens, [pack.booster]: save.tokens[pack.booster] + pack.amount },
    },
  };
}

// ---- Daily gift ----------------------------------------------------------------------------

export function canClaimGift(save: SaveData, today: string): boolean {
  return save.daily.giftDay !== today;
}

export function claimGift(save: SaveData, today: string): ShopResult {
  if (!canClaimGift(save, today)) return fail('claimed');
  return {
    ok: true,
    save: {
      ...save,
      wallet: { ...save.wallet, coins: save.wallet.coins + REWARDS.dailyGift },
      daily: { ...save.daily, giftDay: today },
      stats: { ...save.stats, coinsEarned: save.stats.coinsEarned + REWARDS.dailyGift },
    },
  };
}

// ---- Rewarded videos -----------------------------------------------------------------------

export function videosLeft(save: SaveData, today: string): number {
  const watched = save.daily.videoDay === today ? save.daily.videosWatched : 0;
  return Math.max(0, REWARDS.videosPerDay - watched);
}

export type VideoReward =
  | { kind: 'coins'; amount: number }
  | { kind: 'booster'; booster: BoosterKind; amount: number }
  /** Doubles the coins of the level just won (adds `amount` again). */
  | { kind: 'double'; amount: number };

export function grantVideoReward(save: SaveData, reward: VideoReward, today: string): ShopResult {
  if (videosLeft(save, today) <= 0) return fail('limit');
  const watched = save.daily.videoDay === today ? save.daily.videosWatched : 0;
  const daily = { ...save.daily, videoDay: today, videosWatched: watched + 1 };
  if (reward.kind === 'booster') {
    return {
      ok: true,
      save: { ...save, daily, tokens: { ...save.tokens, [reward.booster]: save.tokens[reward.booster] + reward.amount } },
    };
  }
  const coins = Math.max(0, Math.floor(reward.amount));
  return {
    ok: true,
    save: {
      ...save,
      daily,
      wallet: { ...save.wallet, coins: save.wallet.coins + coins },
      stats: { ...save.stats, coinsEarned: save.stats.coinsEarned + coins },
    },
  };
}
