// SI-assistance note: written with the help of Anthropic's Claude (coding assistant).
// Concept, story, design and decisions: team Seyir Defteri.
// One-way radio delay between Earth and Mars for a calendar date. Computed, not fetched:
// Keplerian mean elements (JPL "Approximate Positions of the Planets", valid 1800-2050).
// The UI labels the result as an approximation (docs/data-sources.md).

interface Elements {
  /** [value at J2000, change per Julian century] */
  a: [number, number];
  e: [number, number];
  inc: [number, number];
  meanLon: [number, number];
  periLon: [number, number];
  node: [number, number];
}

const EARTH: Elements = {
  a: [1.00000261, 0.00000562],
  e: [0.01671123, -0.00004392],
  inc: [-0.00001531, -0.01294668],
  meanLon: [100.46457166, 35999.37244981],
  periLon: [102.93768193, 0.32327364],
  node: [0, 0],
};
const MARS: Elements = {
  a: [1.52371034, 0.00001847],
  e: [0.0933941, 0.00007882],
  inc: [1.84969142, -0.00813131],
  meanLon: [-4.55343205, 19140.30268499],
  periLon: [-23.94362959, 0.44441088],
  node: [49.55953891, -0.29257343],
};

const RAD = Math.PI / 180;
const J2000_MS = Date.UTC(2000, 0, 1, 12);
const MS_PER_CENTURY = 36525 * 86_400_000;
/** Light travel time for one astronomical unit, seconds. */
const LIGHT_SECONDS_PER_AU = 499.004784;
const KEPLER_STEPS = 6;

function position(el: Elements, centuries: number): [number, number, number] {
  const at = (pair: [number, number]): number => pair[0] + pair[1] * centuries;
  const e = at(el.e);
  const periLon = at(el.periLon);
  const node = at(el.node) * RAD;
  const inc = at(el.inc) * RAD;
  const peri = periLon * RAD - node;
  const mean = (at(el.meanLon) - periLon) * RAD;
  let ecc = mean;
  for (let i = 0; i < KEPLER_STEPS; i++) ecc -= (ecc - e * Math.sin(ecc) - mean) / (1 - e * Math.cos(ecc));
  const x = at(el.a) * (Math.cos(ecc) - e);
  const y = at(el.a) * Math.sqrt(1 - e * e) * Math.sin(ecc);
  const [cp, sp, cn, sn, ci, si] = [Math.cos(peri), Math.sin(peri), Math.cos(node), Math.sin(node), Math.cos(inc), Math.sin(inc)];
  return [
    (cp * cn - sp * sn * ci) * x + (-sp * cn - cp * sn * ci) * y,
    (cp * sn + sp * cn * ci) * x + (-sp * sn + cp * cn * ci) * y,
    sp * si * x + cp * si * y,
  ];
}

/** One-way light time Earth <-> Mars in seconds at noon UTC of an ISO date. */
export function commsDelaySeconds(isoDate: string): number {
  const centuries = (Date.parse(`${isoDate.slice(0, 10)}T12:00:00Z`) - J2000_MS) / MS_PER_CENTURY;
  const earth = position(EARTH, centuries);
  const mars = position(MARS, centuries);
  const au = Math.hypot(mars[0] - earth[0], mars[1] - earth[1], mars[2] - earth[2]);
  return au * LIGHT_SECONDS_PER_AU;
}

export function splitDelay(seconds: number): { min: number; s: number } {
  const whole = Math.round(seconds);
  return { min: Math.floor(whole / 60), s: whole % 60 };
}
