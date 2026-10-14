import { showRewarded } from '@/src/ads/rewarded';
import { dayKey, grantVideoReward, videosLeft, type VideoReward } from './shop';
import { getSave, useSaveStore } from './useSaveStore';

export type WatchResult = 'granted' | 'limit' | 'skipped';

/** Show a rewarded video and, if it was watched to the end, apply the reward (daily cap applies). */
export async function watchForReward(reward: VideoReward): Promise<WatchResult> {
  if (videosLeft(getSave(), dayKey(new Date())) <= 0) return 'limit';
  const ok = await showRewarded();
  if (!ok) return 'skipped';
  const r = grantVideoReward(getSave(), reward, dayKey(new Date()));
  if (!r.ok) return 'limit';
  useSaveStore.getState().update(() => r.save, 'now');
  return 'granted';
}
