import { showRewardedAd } from '@/src/ads/service';
import { dayKey, grantVideoReward, videosLeft, type VideoReward } from './shop';
import { getSave, useSaveStore } from './useSaveStore';

export type WatchResult = 'granted' | 'limit' | 'skipped' | 'unavailable';

/** Show a rewarded video and, if it was watched to the end, apply the reward (daily cap applies). */
export async function watchForReward(reward: VideoReward): Promise<WatchResult> {
  if (videosLeft(getSave(), dayKey(new Date())) <= 0) return 'limit';
  const out = await showRewardedAd();
  if (out !== 'rewarded') return out;
  const r = grantVideoReward(getSave(), reward, dayKey(new Date()));
  if (!r.ok) return 'limit';
  useSaveStore.getState().update(() => r.save, 'now');
  return 'granted';
}
