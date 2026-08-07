# Pickomino — Strategy Analysis

## Player objectives

At the highest level, a Pickomino player is trying to maximise **total worm count** at game end. Since worms are proportional to tile number, this means preferring high tiles. But the penalty for busting (losing your top tile AND removing a central tile) creates a strong risk-management dimension.

### Primary objectives (ranked)

1. **Avoid busting** — busts cost you your best tile and shrink the available pool for everyone.
2. **Accumulate worms** — higher tiles = more worms. Tile 36 (4 worms) is worth 4× tile 21 (1 worm).
3. **Steal when it's free** — stealing costs nothing extra if your sum already hits the target.
4. **Deny opponents** — in multi-player games, holding the tile your opponent needs, or forcing a removal, has strategic value.

---

## Decision points

### 1. When to stop rolling

Stop when the expected gain from another roll is outweighed by bust risk.

Key factors:
- **Dice remaining** — fewer dice = higher bust probability.
- **Faces already used** — each locked-out face reduces your outs.
- **Current sum vs. target** — a sum of 25 with a WORM in hand might be enough; 23 without a WORM is not.

Rule of thumb: with ≤3 dice remaining and a valid sum in hand, stopping is usually correct unless the tile difference is large.

### 2. WORM priority

Taking a WORM early secures your license to claim. Taking it late (as the final set-aside) maximises pip sum but risks busting without one.

**Aggressive:** delay WORM as long as possible to maximise sum.  
**Safe:** take WORM as soon as you roll one.

### 3. Face value selection

When multiple face values are available, choose the one that:
- Maximises current sum increment.
- Preserves flexibility (don't lock out high-value faces early if alternatives exist).
- Avoids locking out WORM when you haven't secured one yet.

---

## Strategies (for simulation)

### S1: Greedy (maximise sum)

Always pick the face value that adds the most to the current sum. Take WORMs last. Stop only on bust.

Risk: high bust rate, but captures the highest tiles when it works.

### S2: Safe (WORM-first)

Take a WORM on the first roll that produces one. After securing a WORM, continue rolling only if ≥4 dice remain and the sum gain is at least 4.

Risk: low, but frequently claims lower tiles (21–25 range).

### S3: Target-21 (conservative floor)

Stop as soon as a valid sum ≥ 21 with a WORM is in hand. Guarantees a tile every turn (unless the 21 is gone).

Use when: behind, central row is depleted in the low range, or opponent's stack is vulnerable at 21.

### S4: Steal-hunter

Stop as soon as your sum exactly matches an opponent's top tile (steal). Otherwise follow Greedy.

Use when: one opponent has a high tile on top and you're within reach.

### S5: Adaptive threshold

Set a target sum threshold T (e.g. 28). Roll aggressively until sum ≥ T or bust. Adjust T based on what's available in the central row.

This is the closest to "optimal play" and is the recommended baseline.

---

## Monte Carlo notes

The simulation (`sim.js`) models N-player games over M iterations for each strategy pairing. Key metrics reported:

- Win rate (%)
- Average worm count at game end
- Bust rate per turn
- Average tile claimed per successful turn

See the [live simulation](https://kelu124.github.io/pikl/) to compare strategies interactively.

---

## Known edge cases

- **All tiles below your sum are gone:** you bust even with a WORM. Rare but happens late game — reason to aim high mid-game.
- **Tile 21 removal chain:** a sequence of busts can clear the low tiles rapidly, cutting the game short. Safe strategies suffer disproportionately when this happens.
- **2-player steal wars:** with 2 players, stealing becomes dominant once both have tiles — each bust feeds the opponent.
