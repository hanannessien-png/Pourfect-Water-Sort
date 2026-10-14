import { angleForArea, buildPourPlan, levelForArea, PLAN_SAMPLES, pourDuration, retainedArea } from '../pourPlan';

const W = 30;
const H = 120;

describe('pour geometry', () => {
  it('computes the retained area of an upright tube', () => {
    expect(retainedArea(W, H, 0, 0)).toBeCloseTo(W * H, 6);
    expect(retainedArea(W, H, 0, H / 2)).toBeCloseTo((W * H) / 2, 6);
    expect(retainedArea(W, H, 0, H)).toBeCloseTo(0, 6);
  });

  it('holds less liquid the further it tilts', () => {
    let prev = Infinity;
    for (let deg = 0; deg <= 85; deg += 5) {
      const a = retainedArea(W, H, (deg * Math.PI) / 180, 0);
      expect(a).toBeLessThanOrEqual(prev + 1e-9);
      prev = a;
    }
  });

  it('inverts area ↔ level and area ↔ angle', () => {
    const theta = 0.6;
    for (const frac of [0.1, 0.35, 0.8]) {
      const area = W * H * frac;
      const level = levelForArea(W, H, theta, area);
      expect(retainedArea(W, H, theta, level)).toBeCloseTo(area, 1);
      const ang = angleForArea(W, H, area);
      expect(retainedArea(W, H, ang, 0)).toBeCloseTo(area, 1);
    }
    expect(angleForArea(W, H, W * H)).toBe(0);
  });
});

describe('buildPourPlan', () => {
  const plan = buildPourPlan({
    innerW: W,
    innerH: H,
    unit: 28,
    srcUnits: 4,
    count: 2,
    home: { x: 10, y: 20 },
    rest: { x: 10, y: 40 },
    pour: { x: 200, y: -30 },
    dir: 1,
  });

  it('starts at home, ends at rest, upright', () => {
    expect(plan.samples).toBe(PLAN_SAMPLES);
    expect(plan.px[0]).toBeCloseTo(10);
    expect(plan.py[0]).toBeCloseTo(20);
    expect(plan.px[PLAN_SAMPLES - 1]).toBeCloseTo(10);
    expect(plan.py[PLAN_SAMPLES - 1]).toBeCloseTo(40);
    expect(plan.angle[0]).toBeCloseTo(0);
    expect(plan.angle[PLAN_SAMPLES - 1]).toBeCloseTo(0);
  });

  it('fills the target monotonically from 0 to count, streaming only while pouring', () => {
    for (let k = 1; k < PLAN_SAMPLES; k++) expect(plan.fill[k]!).toBeGreaterThanOrEqual(plan.fill[k - 1]! - 1e-9);
    expect(plan.fill[0]).toBe(0);
    expect(plan.fill[PLAN_SAMPLES - 1]).toBeCloseTo(2);
    expect(plan.stream[0]).toBe(0);
    expect(plan.stream[PLAN_SAMPLES - 1]).toBe(0);
    expect(Math.max(...plan.stream)).toBeGreaterThan(0.9);
    expect(plan.levels).toHaveLength(PLAN_SAMPLES * 4);
    expect(plan.angle.every((a) => a >= 0 && a < Math.PI / 2)).toBe(true);
  });

  it('scales duration with layers moved', () => {
    expect(pourDuration(1)).toBeLessThan(pourDuration(3));
    expect(pourDuration(1)).toBeGreaterThanOrEqual(400);
    expect(pourDuration(8)).toBeLessThanOrEqual(900);
  });
});
