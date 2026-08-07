# pikl — Pickomino Analysis

A rules reference, strategy guide, and Monte Carlo simulation engine for **Pickomino** (Regenwormen), the dice-and-tile game by Spartaco Albertarelli.

→ **[Live simulation](https://kelu124.github.io/pikl/)** | Managed by the [Pikl agent](skill.md)

---

## Rules

### Components

- **8 dice** — each face shows: `1 · 2 · 3 · 4 · 5 · 🪱` (WORM)
- **16 tiles** — numbered 21–36, each worth 1–4 worms:
  | Tiles | Worms |
  |-------|-------|
  | 21–24 | 1 🪱 |
  | 25–28 | 2 🪱 |
  | 29–32 | 3 🪱 |
  | 33–36 | 4 🪱 |

### Turn structure

1. **Roll** all 8 dice.
2. **Set aside** all dice showing one face value of your choice (must be a value not yet set aside this turn). You must take at least one die.
3. **Repeat** — roll remaining dice, set aside another face value.
4. **Stop** when you choose to, or when no legal set-aside exists (bust).

### Scoring your sum

- Each pip die (1–5) counts at face value.
- Each WORM die counts as **5** toward your sum.
- You **must have at least one WORM** set aside to claim a tile.

### Claiming a tile

- **From the central row:** take the tile exactly matching your sum. If that tile is gone, take the highest available tile below your sum.
- **Stealing:** if your sum exactly matches the **top tile of another player's stack**, steal it from them instead of the central row.
- If you cannot claim anything (bust, no WORM, or no tile ≤ your sum remains), your turn fails:
  - Your top tile (if any) goes back to the central row face-up.
  - The highest face-up tile in the central row is **flipped over and removed permanently**.

### Bust conditions

- No dice remaining to roll.
- Every face you could set aside has already been used this turn.
- (You may voluntarily stop before busting to bank a smaller sum.)

### End of game

The game ends when **all central tiles are taken or removed**. The player with the most worms (sum across all tiles in their stack) wins. Ties broken by most tiles, then by highest tile.

---

## Repo structure

| Path | Contents |
|------|----------|
| `README.md` | Rules reference (this file) |
| `skill.md` | Pikl agent skill definition |
| `strategies.md` | Player objectives and strategy analysis |
| `index.html` | Monte Carlo simulation (GitHub Pages) |
| `sim.js` | Simulation engine |

---

## Quick-start (local)

```bash
# No build step needed — open index.html in a browser, or:
python3 -m http.server 8080
# then visit http://localhost:8080
```
