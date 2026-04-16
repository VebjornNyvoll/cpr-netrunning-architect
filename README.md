# Netrunning Architect

A Foundry VTT module for **Cyberpunk Red** (`cyberpunk-red-core`) that provides a visual NET Architecture builder with tile placement on the current scene. Build architectures with drag-and-drop, generate them randomly with constraints, then place them as tiles directly on your battle map.

## Requirements

- Foundry VTT v12+
- [Cyberpunk Red Core](https://foundryvtt.com/packages/cyberpunk-red-core) system (v0.89.1+)

### Recommended (optional)

- [Dice So Nice](https://foundryvtt.com/packages/dice-so-nice) — 3D dice animations on Interface checks and combat rolls
- [lib-wrapper](https://foundryvtt.com/packages/lib-wrapper) — safe method patching for future extensions

## Installation

1. In Foundry VTT, go to **Settings > Add-on Modules > Install Module**
2. Paste this manifest URL:
   ```
   https://github.com/VebjornNyvoll/cpr-netrunning-architect/releases/latest/download/module.json
   ```
3. Click **Install**
4. Enable the module in your world under **Settings > Manage Modules**

## Features & Usage

### 1. NET Architecture Builder (GM Tool)

A visual editor for creating and editing NET Architecture items.

**How to open:**
- **Right-click** any `netarch` item in the Items sidebar > **Open in NET Architect**
- Or open a `netarch` item sheet and click **Open in Architect** in the header

**Building floors:**
- **Add floors** manually — set DV, content type (Password, File, Control Node, Black ICE), branch letter, and descriptions
- **Edit floors** — click the pencil icon to modify any floor
- **Reorder** with up/down arrows, **delete** with the trash icon
- **Drag-and-drop** Black ICE actors or black-ice-class programs onto floor drop zones

**Random generation:**
- Click the dice button to open the generation dialog
- Choose difficulty: Basic / Standard / Uncommon / Advanced
- Set optional **constraints**: minimum number of Control Nodes, Files, or Passwords
- The module rolls on the CPR compendium tables (3d6 for floor count) and ensures constraints are met

**Other actions:**
- **Export to Chat** — posts a formatted architecture summary card (whispered to GM)
- **Save** — writes changes back to the `netarch` item

### 2. Tile Placement on Scene

Place your architecture directly on the current scene as Foundry tiles — no separate netrunning scene needed.

**How to use:**
1. Build your architecture in the builder (or generate one randomly)
2. Click **Place on Scene** in the builder toolbar
3. The builder minimizes and a **crosshair cursor** appears on the canvas
4. **Click** where you want the top-left corner of the architecture (press **ESC** to cancel)
5. Tiles are placed using the same grid layout algorithm as the CPR system — floors arranged horizontally with arrow connectors, branches extending vertically

**Clearing tiles:**
- Click **Clear Tiles** in the builder to remove all tiles placed for that architecture
- Tile IDs are tracked per architecture, so you can have multiple architectures placed on the same scene

**Custom tiles:**
The module supports both the default CPR system tiles and custom animated tile sets. Configure in module settings:
- **Tile Image Path** — point to your custom tile directory (e.g., `assets/Battlemaps/Netrunning`)
- **Tile File Extension** — `webp` (static), `webm` (animated), or `png`
- **Tile Grid Size** — pixel size per grid unit (default: 110)

The module auto-detects naming conventions:
- System default: `Asp.webp`, `PasswordDV6.webp`
- Custom animated: `ASP-TILE (4).webm`, `PASSWORD-DV6-TILE (5).webm`

### 3. GM Tracker

A GM-side reference window for tracking netrunning state alongside the canvas tiles.

**How to open:**
- Click **Open Tracker** in the builder toolbar

**Tabs:**
- **Architecture** — tower view with floor status, movement controls, and multi-runner tracking
- **NET Actions** — buttons for all 9 Interface abilities (Scanner, Backdoor, Cloak, Control, Eye-Dee, Pathfinder, Slide, Virus, Zap)
- **Programs** — quick view of rezzed programs with stats and REZ bars

### 4. Program Slot Manager

Manage the netrunner's cyberdeck programs.

**How to open:**
- From the tracker's Programs tab, click **Cyberdeck Programs**

**Features:**
- Visual slot grid showing the equipped cyberdeck's capacity
- **Rez / De-Rez** programs with one click
- View program stats (ATK, DEF, REZ) with visual REZ bars
- Open any program's item sheet for details

### 5. NET Combat Panel

Opens when encountering Black ICE on a floor.

**ICE display:**
- Stat block: PER, SPD, ATK, DEF in a grid
- Visual REZ bar with current/max values

**Combat actions:**
- **Zap** — Interface rank vs ICE DEF, 1d6 REZ damage on hit
- **Program Attack** — Interface rank + program ATK vs ICE DEF, 2d6 REZ damage
- **Program Defend** — roll Interface rank + program DEF
- **ICE Attacks** — GM rolls ICE ATK
- **Flee (Slide)** — Interface check vs floor DV to escape
- **End Combat** — mark encounter as resolved

**GM tools:** manually reduce/reset ICE REZ. ICE defeat is announced in chat when REZ hits 0.

### 6. Interface Check Automation

All rolls follow CPR rules:
- **Formula:** 1d10 + Interface role rank vs DV
- **Critical Success:** natural 10 = roll another d10 and add
- **Critical Failure:** natural 1 = roll another d10 and subtract
- **Dice So Nice:** 3D dice shown when DSN is active (respects roll mode)

Results posted as styled chat cards with roll breakdown and success/failure.

## Module Settings

### World Settings (GM only)

| Setting | Default | Description |
|---------|---------|-------------|
| Enable Module | On | Master toggle for all features |
| Auto Interface Checks | On | Prompt Interface rolls when moving between floors |
| Fog of War | On | Hide unexplored floors in the tracker |
| Show Floor DVs to Players | Off | Display DVs to players before exploring |
| Auto-Trigger ICE | On | Auto-open combat when entering an ICE floor |
| Auto-Roll ICE Initiative | Off | Auto-roll initiative for Black ICE |
| Default Generation Difficulty | Standard | Default difficulty for random generation |
| Tile Image Path | System default | Directory for tile images |
| Tile File Extension | webp | Tile file format (webp/webm/png) |
| Tile Grid Size | 110 | Pixels per grid unit for tile placement |

### Client Settings (per player)

| Setting | Default | Description |
|---------|---------|-------------|
| Animation Speed | 400ms | Speed of UI animations |
| Compact Mode | Off | Compact floor display |

## Public API

```javascript
const api = game.modules.get("cpr-netrunning-architect").api;

api.openBuilder(netarchItem);              // Open the builder
api.openTracker(netarchItem, actor);       // Open the tracker
api.getArchitectureState(netarchItem);     // Read current run state
api.resetArchitecture(netarchItem);        // Clear all run state
```

## Development

1. Clone into your Foundry `Data/modules/` directory:
   ```bash
   cd /path/to/foundry/Data/modules
   git clone https://github.com/VebjornNyvoll/cpr-netrunning-architect.git
   ```
2. Restart Foundry and enable the module
3. No build step — plain ESModules

## Release

1. Update `version` in `module.json`
2. Commit and push
3. Create a GitHub Release with a matching tag (e.g., `v0.3.0`)
4. GitHub Actions builds and attaches `module.json` + `module.zip`

## License

MIT
