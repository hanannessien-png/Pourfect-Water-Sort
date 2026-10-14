import { BACKGROUNDS, DEFAULT_EQUIPPED, REWARDS, TUBE_SKINS } from '@/src/config/cosmetics';
import { defaultSave, parseSave, sanitizeSave, type SaveData } from '../saveData';
import {
  buyBoosterPack,
  buyCosmetic,
  canClaimGift,
  claimGift,
  dayKey,
  equipCosmetic,
  grantVideoReward,
  isEquipped,
  owns,
  videosLeft,
} from '../shop';

const NOW = 1_800_000_000_000;
const rich = (coins: number): SaveData => {
  const s = defaultSave(NOW);
  return { ...s, wallet: { ...s.wallet, coins } };
};
const paidSkin = TUBE_SKINS.find((t) => t.price > 0)!;
const paidBg = BACKGROUNDS.find((b) => b.price > 0)!;

describe('catalogue', () => {
  it('has unique ids and the defaults are free', () => {
    const ids = [...TUBE_SKINS, ...BACKGROUNDS].map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    const s = defaultSave(NOW);
    for (const id of Object.values(DEFAULT_EQUIPPED)) expect(owns(s, id)).toBe(true);
  });
  it('offers at least 10 backgrounds and 8 tube skins', () => {
    expect(BACKGROUNDS.length).toBeGreaterThanOrEqual(10);
    expect(TUBE_SKINS.length).toBeGreaterThanOrEqual(8);
  });
});

describe('buying and equipping', () => {
  it('buys, pays and equips', () => {
    const r = buyCosmetic(rich(paidSkin.price + 5), paidSkin.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.wallet.coins).toBe(5);
    expect(owns(r.save, paidSkin.id)).toBe(true);
    expect(isEquipped(r.save, paidSkin.id)).toBe(true);
  });
  it('refuses without enough coins, twice, or for unknown items', () => {
    expect(buyCosmetic(rich(paidSkin.price - 1), paidSkin.id)).toEqual({ ok: false, error: 'coins' });
    const r = buyCosmetic(rich(10_000), paidBg.id);
    expect(r.ok && buyCosmetic(r.save, paidBg.id)).toEqual({ ok: false, error: 'owned' });
    expect(buyCosmetic(rich(10_000), 'tube.nope')).toEqual({ ok: false, error: 'unknown' });
  });
  it('equips only owned items', () => {
    expect(equipCosmetic(rich(0), paidBg.id)).toEqual({ ok: false, error: 'notOwned' });
    const r = equipCosmetic(rich(0), 'tube.classic');
    expect(r.ok && r.save.cosmetics.equipped.tube).toBe('tube.classic');
  });
  it('booster packs add tokens', () => {
    const s = rich(1000);
    const r = buyBoosterPack(s, 'pack.hint3');
    expect(r.ok && r.save.tokens.hint).toBe(s.tokens.hint + 3);
    expect(buyBoosterPack(rich(0), 'pack.hint3')).toEqual({ ok: false, error: 'coins' });
  });
});

describe('daily gift and videos', () => {
  it('gift once per day', () => {
    const r = claimGift(rich(0), '2026-10-14');
    expect(r.ok && r.save.wallet.coins).toBe(REWARDS.dailyGift);
    if (!r.ok) return;
    expect(canClaimGift(r.save, '2026-10-14')).toBe(false);
    expect(claimGift(r.save, '2026-10-14')).toEqual({ ok: false, error: 'claimed' });
    expect(canClaimGift(r.save, '2026-10-15')).toBe(true);
  });
  it('caps videos per day and resets the next day', () => {
    let s = rich(0);
    for (let i = 0; i < REWARDS.videosPerDay; i++) {
      const r = grantVideoReward(s, { kind: 'coins', amount: REWARDS.videoCoins }, '2026-10-14');
      expect(r.ok).toBe(true);
      if (r.ok) s = r.save;
    }
    expect(s.wallet.coins).toBe(REWARDS.videosPerDay * REWARDS.videoCoins);
    expect(videosLeft(s, '2026-10-14')).toBe(0);
    expect(grantVideoReward(s, { kind: 'coins', amount: 1 }, '2026-10-14')).toEqual({ ok: false, error: 'limit' });
    expect(videosLeft(s, '2026-10-15')).toBe(REWARDS.videosPerDay);
  });
  it('booster and double rewards', () => {
    const s = rich(0);
    const b = grantVideoReward(s, { kind: 'booster', booster: 'tube', amount: 1 }, 'd');
    expect(b.ok && b.save.tokens.tube).toBe(s.tokens.tube + 1);
    const d = grantVideoReward(s, { kind: 'double', amount: 25 }, 'd');
    expect(d.ok && d.save.wallet.coins).toBe(25);
  });
  it('dayKey is local YYYY-MM-DD', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('save migration', () => {
  it('v1 saves keep progress and get the new default cosmetics', () => {
    const v1 = { version: 1, wallet: { coins: 77 }, progress: { current: 9 }, cosmetics: { equipped: { tube: 'tube.classic', background: 'bg.twilight' }, owned: ['bg.twilight'] } };
    const s = parseSave(JSON.stringify(v1), NOW);
    expect(s.wallet.coins).toBe(77);
    expect(s.progress.current).toBe(9);
    expect(s.cosmetics.equipped.tube).toBe(DEFAULT_EQUIPPED.tube);
    expect(s.cosmetics.equipped.background).toBe(DEFAULT_EQUIPPED.background);
  });
  it('unowned or unknown equipped items fall back to defaults', () => {
    const s = sanitizeSave({ cosmetics: { equipped: { tube: paidSkin.id, background: 'bg.nope', liquid: 'tube.gilded' }, owned: [] } }, NOW);
    expect(s.cosmetics.equipped).toMatchObject(DEFAULT_EQUIPPED);
  });
});
