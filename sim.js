// Pickomino simulation engine

const WORM = 'W';
const FACES = [1, 2, 3, 4, 5, WORM];
const WORM_VALUE = 5;

function faceValue(f) { return f === WORM ? WORM_VALUE : f; }

function rollDice(n) {
  const result = [];
  for (let i = 0; i < n; i++) result.push(FACES[Math.floor(Math.random() * 6)]);
  return result;
}

function groupByFace(dice) {
  const groups = {};
  for (const d of dice) groups[d] = (groups[d] || 0) + 1;
  return groups;
}

function wormCount(tile) {
  if (tile <= 24) return 1;
  if (tile <= 28) return 2;
  if (tile <= 32) return 3;
  return 4;
}

// Full tile pool (all tiles available — for per-turn independent analysis)
function fullPool() {
  const pool = {};
  for (let t = 21; t <= 36; t++) pool[t] = true;
  return pool;
}

function bestTileForSum(pool, sum) {
  const tiles = Object.keys(pool).map(Number).filter(t => pool[t] && t <= sum);
  return tiles.length ? Math.max(...tiles) : null;
}

// Serialize a combination map for use as a Map key
// combination = { '1': 2, '5': 1, 'W': 3 } → "🪱×3 · 5×1 · 1×2"
function serializeCombination(combo) {
  const faceOrder = [WORM, 5, 4, 3, 2, 1];
  return faceOrder
    .filter(f => combo[f])
    .map(f => `${f === WORM ? '🪱' : f}×${combo[f]}`)
    .join(' · ');
}

// Play one independent turn, record the dice combination set aside.
// Returns { busted, tile, combination, sum }
// strategy: function(currentSum, usedFaces, dice, pool) → face to pick, or null to stop
function playTurnRecorded(strategy) {
  const pool = fullPool();
  let diceCount = 8;
  let currentSum = 0;
  const usedFaces = new Set();
  const combination = {}; // face → total count kept

  while (diceCount > 0) {
    const dice = rollDice(diceCount);
    const groups = groupByFace(dice);

    const available = Object.keys(groups).filter(f => !usedFaces.has(f) && !usedFaces.has(Number(f)));
    if (available.length === 0) return { busted: true, tile: null, combination, sum: currentSum };

    const chosen = strategy(currentSum, usedFaces, dice, pool);
    if (chosen === null) break; // voluntarily stop

    // Normalise chosen (strategy may return string or number)
    const chosenKey = chosen === WORM || chosen === 'W' ? WORM : Number(chosen);
    const groupKey = groups[chosenKey] !== undefined ? chosenKey : String(chosenKey);

    if (!groups[groupKey] && !groups[chosenKey]) return { busted: true, tile: null, combination, sum: currentSum };

    const count = groups[groupKey] || groups[chosenKey];
    usedFaces.add(chosenKey);
    combination[chosenKey] = (combination[chosenKey] || 0) + count;
    currentSum += faceValue(chosenKey) * count;
    diceCount -= count;
  }

  if (!usedFaces.has(WORM)) return { busted: true, tile: null, combination, sum: currentSum };

  const tile = bestTileForSum(pool, currentSum);
  return { busted: tile === null, tile, combination, sum: currentSum };
}

// --- Strategies ---

function stratGreedy(currentSum, usedFaces, dice) {
  const groups = groupByFace(dice);
  let best = null, bestGain = -1;
  for (const face of Object.keys(groups)) {
    const f = face === 'W' ? WORM : Number(face);
    if (usedFaces.has(f)) continue;
    const gain = faceValue(f) * groups[face];
    if (gain > bestGain) { bestGain = gain; best = f; }
  }
  return best;
}

function stratSafe(currentSum, usedFaces, dice, pool) {
  const groups = groupByFace(dice);
  const hasWorm = usedFaces.has(WORM);
  const diceLeft = dice.length;

  if (!hasWorm && (groups[WORM] || groups['W'])) return WORM;
  if (hasWorm && diceLeft <= 3 && bestTileForSum(pool, currentSum) !== null) return null;

  let best = null, bestGain = -1;
  for (const face of Object.keys(groups)) {
    const f = face === 'W' ? WORM : Number(face);
    if (usedFaces.has(f)) continue;
    const gain = faceValue(f) * groups[face];
    if (gain > bestGain) { bestGain = gain; best = f; }
  }
  return best;
}

function makeAdaptive(threshold) {
  return function(currentSum, usedFaces, dice, pool) {
    const groups = groupByFace(dice);
    const hasWorm = usedFaces.has(WORM);

    if (!hasWorm && (groups[WORM] || groups['W'])) return WORM;
    if (hasWorm && currentSum >= threshold && bestTileForSum(pool, currentSum) !== null) return null;

    let best = null, bestGain = -1;
    for (const face of Object.keys(groups)) {
      const f = face === 'W' ? WORM : Number(face);
      if (usedFaces.has(f)) continue;
      const gain = faceValue(f) * groups[face];
      if (gain > bestGain) { bestGain = gain; best = f; }
    }
    return best;
  };
}

const STRATEGIES = {
  Greedy:     { name: 'Greedy',       fn: stratGreedy },
  Safe:       { name: 'Safe',         fn: stratSafe },
  Adaptive25: { name: 'Adaptatif-25', fn: makeAdaptive(25) },
  Adaptive28: { name: 'Adaptatif-28', fn: makeAdaptive(28) },
  Adaptive31: { name: 'Adaptatif-31', fn: makeAdaptive(31) },
};

// Run N independent turns, return full log + per-tile top combinations
function runAnalysis(strategy, nRounds) {
  let successes = 0, failures = 0;
  // Per-tile: Map<tile, Map<comboKey, {label, count}>>
  const tileCombos = {};
  for (let t = 21; t <= 36; t++) tileCombos[t] = {};

  for (let i = 0; i < nRounds; i++) {
    const result = playTurnRecorded(strategy);
    if (result.busted || !result.tile) {
      failures++;
    } else {
      successes++;
      const key = serializeCombination(result.combination);
      const tile = result.tile;
      if (!tileCombos[tile][key]) tileCombos[tile][key] = { label: key, count: 0, sum: result.sum };
      tileCombos[tile][key].count++;
    }
  }

  // Top 10 per tile
  const topByTile = {};
  for (let t = 21; t <= 36; t++) {
    topByTile[t] = Object.values(tileCombos[t])
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  return { nRounds, successes, failures, topByTile };
}

if (typeof module !== 'undefined') module.exports = { runAnalysis, STRATEGIES, serializeCombination };
