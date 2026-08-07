// Pickomino Monte Carlo simulation engine

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

// Tile pool management
function makeTilePool() {
  const pool = {};
  for (let t = 21; t <= 36; t++) pool[t] = true;
  return pool;
}

function availableTiles(pool) {
  return Object.keys(pool).map(Number).filter(t => pool[t]).sort((a, b) => a - b);
}

function bestTileForSum(pool, sum) {
  const tiles = availableTiles(pool);
  // exact match first, then highest below
  const candidates = tiles.filter(t => t <= sum);
  return candidates.length ? candidates[candidates.length - 1] : null;
}

function wormCount(tile) {
  if (tile <= 24) return 1;
  if (tile <= 28) return 2;
  if (tile <= 32) return 3;
  return 4;
}

// Strategy implementations
// Each strategy returns which face to pick (or null to stop)
// signature: strategy(currentSum, usedFaces, dice, pool, playerStacks)

function stratGreedy(currentSum, usedFaces, dice, pool, playerStacks) {
  const groups = groupByFace(dice);
  let best = null, bestGain = -1;
  for (const face of Object.keys(groups)) {
    if (usedFaces.has(face)) continue;
    const gain = faceValue(face) * groups[face];
    if (gain > bestGain) { bestGain = gain; best = face; }
  }
  return best; // always roll on
}

function stratSafe(currentSum, usedFaces, dice, pool, playerStacks) {
  const groups = groupByFace(dice);
  const hasWorm = usedFaces.has(WORM);
  const diceLeft = dice.length;

  // Prioritise WORM if not secured
  if (!hasWorm && groups[WORM]) return WORM;

  // Stop if we have a WORM, a valid tile, and few dice remain
  if (hasWorm && diceLeft <= 3 && bestTileForSum(pool, currentSum) !== null) return null;

  // Otherwise pick best gain
  let best = null, bestGain = -1;
  for (const face of Object.keys(groups)) {
    if (usedFaces.has(face)) continue;
    const gain = faceValue(face) * groups[face];
    if (gain > bestGain) { bestGain = gain; best = face; }
  }
  return best;
}

function stratTarget21(currentSum, usedFaces, dice, pool, playerStacks) {
  const groups = groupByFace(dice);
  const hasWorm = usedFaces.has(WORM);

  if (!hasWorm && groups[WORM]) return WORM;
  if (hasWorm && currentSum >= 21 && bestTileForSum(pool, currentSum) !== null) return null;

  let best = null, bestGain = -1;
  for (const face of Object.keys(groups)) {
    if (usedFaces.has(face)) continue;
    const gain = faceValue(face) * groups[face];
    if (gain > bestGain) { bestGain = gain; best = face; }
  }
  return best;
}

function makeAdaptive(threshold) {
  return function stratAdaptive(currentSum, usedFaces, dice, pool, playerStacks) {
    const groups = groupByFace(dice);
    const hasWorm = usedFaces.has(WORM);

    if (!hasWorm && groups[WORM]) return WORM;
    if (hasWorm && currentSum >= threshold && bestTileForSum(pool, currentSum) !== null) return null;

    let best = null, bestGain = -1;
    for (const face of Object.keys(groups)) {
      if (usedFaces.has(face)) continue;
      const gain = faceValue(face) * groups[face];
      if (gain > bestGain) { bestGain = gain; best = face; }
    }
    return best;
  };
}

// Play one turn; returns { tile: number|null, busted: bool }
function playTurn(strategy, pool, playerStacks, playerIdx) {
  let diceCount = 8;
  let currentSum = 0;
  const usedFaces = new Set();

  while (diceCount > 0) {
    const dice = rollDice(diceCount);
    const groups = groupByFace(dice);

    // Filter to available faces
    const available = Object.keys(groups).filter(f => !usedFaces.has(f));
    if (available.length === 0) return { tile: null, busted: true };

    const chosen = strategy(currentSum, usedFaces, dice, pool, playerStacks);
    if (chosen === null) break; // voluntarily stop

    if (!available.includes(String(chosen)) && !available.includes(chosen)) {
      // strategy tried to pick unavailable face — bust
      return { tile: null, busted: true };
    }

    usedFaces.add(chosen);
    currentSum += faceValue(chosen) * groups[chosen];
    diceCount -= groups[chosen];
  }

  if (!usedFaces.has(WORM)) return { tile: null, busted: true };

  // Check steal
  for (let i = 0; i < playerStacks.length; i++) {
    if (i === playerIdx) continue;
    const stack = playerStacks[i];
    if (stack.length && stack[stack.length - 1] === currentSum) {
      return { tile: currentSum, stolen: true, stolenFrom: i };
    }
  }

  const tile = bestTileForSum(pool, currentSum);
  return { tile, busted: tile === null };
}

// Run one full game; returns array of worm totals per player
function runGame(strategies) {
  const n = strategies.length;
  const pool = makeTilePool();
  const stacks = strategies.map(() => []);
  const stats = strategies.map(() => ({ turns: 0, busts: 0, tilesWon: 0, wormsWon: 0 }));

  let gameOver = false;
  while (!gameOver) {
    for (let i = 0; i < n && !gameOver; i++) {
      stats[i].turns++;
      const result = playTurn(strategies[i], pool, stacks, i);

      if (result.busted) {
        stats[i].busts++;
        // Return top tile
        if (stacks[i].length) {
          const lost = stacks[i].pop();
          pool[lost] = true;
        }
        // Remove highest face-up tile
        const tiles = availableTiles(pool);
        if (tiles.length) {
          delete pool[tiles[tiles.length - 1]];
        }
      } else if (result.tile) {
        if (result.stolen) {
          const fromStack = stacks[result.stolenFrom];
          fromStack.pop();
          stacks[i].push(result.tile);
        } else {
          pool[result.tile] = false;
          stacks[i].push(result.tile);
        }
        stats[i].tilesWon++;
        stats[i].wormsWon += wormCount(result.tile);
      }

      if (availableTiles(pool).length === 0) { gameOver = true; break; }
    }
  }

  const finalWorms = stacks.map(s => s.reduce((a, t) => a + wormCount(t), 0));
  return { finalWorms, stats };
}

// Monte Carlo: compare strategies over N games
function monteCarlo(strategyDefs, nGames) {
  const results = strategyDefs.map(() => ({ wins: 0, totalWorms: 0, totalBusts: 0, totalTurns: 0 }));

  for (let g = 0; g < nGames; g++) {
    const { finalWorms, stats } = runGame(strategyDefs.map(s => s.fn));
    const maxWorms = Math.max(...finalWorms);
    finalWorms.forEach((w, i) => {
      if (w === maxWorms) results[i].wins++;
      results[i].totalWorms += w;
      results[i].totalBusts += stats[i].busts;
      results[i].totalTurns += stats[i].turns;
    });
  }

  return results.map((r, i) => ({
    name: strategyDefs[i].name,
    winRate: (r.wins / nGames * 100).toFixed(1),
    avgWorms: (r.totalWorms / nGames).toFixed(2),
    bustRate: (r.totalBusts / r.totalTurns * 100).toFixed(1),
  }));
}

// Available named strategies
const STRATEGIES = {
  Greedy:     { name: 'Greedy',      fn: stratGreedy },
  Safe:       { name: 'Safe',        fn: stratSafe },
  Target21:   { name: 'Target-21',   fn: stratTarget21 },
  Adaptive25: { name: 'Adaptive-25', fn: makeAdaptive(25) },
  Adaptive28: { name: 'Adaptive-28', fn: makeAdaptive(28) },
  Adaptive31: { name: 'Adaptive-31', fn: makeAdaptive(31) },
};

// Export for browser and Node
if (typeof module !== 'undefined') module.exports = { monteCarlo, STRATEGIES };
