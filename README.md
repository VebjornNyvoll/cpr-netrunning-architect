# Netrunning Architect

A Foundry VTT module for **Cyberpunk Red** (`cyberpunk-red-core`) that provides a visual floor-by-floor NET Architecture builder and play-mode netrunner tracker.

Build architectures with drag-and-drop, then run them live at the table — complete with fog of war, automated Interface checks, program management, and Black ICE combat.

## Requirements

- Foundry VTT v12+
- [Cyberpunk Red Core](https://foundryvtt.com/packages/cyberpunk-red-core) system (v0.89.1+)

### Recommended (optional)

- [Dice So Nice](https://foundryvtt.com/packages/dice-so-nice) — 3D dice animations on Interface checks and combat rolls
- [lib-wrapper](https://foundryvtt.com/packages/lib-wrapper) — safe method patching for future extensions

## Installation

### Manual Installation
1. In Foundry VTT, go to **Settings > Add-on Modules > Install Module**
2. Paste this manifest URL:
   ```
   https://github.com/VebjornNyvoll/cpr-netrunning-architect/releases/latest/download/module.json
   ```
3. Click **Install**
4. Enable the module in your world under **Settings > Manage Modules**

## Features & Usage

### 1. NET Architecture Builder (GM Tool)

The builder is a visual editor for creating and editing NET Architecture items.

**How to open:**
- **Right-click** any `netarch` item in the Items sidebar > **Open in NET Architect**
- Or open a `netarch` item sheet and click the **Open in Architect** button in the header

**What you can do:**
- **Add floors** manually with the + button, setting DV, content type (Password, File, Control Node, Black ICE), and descriptions
- **Edit floors** — click the pencil icon on any floor to change its DV, content, branch status, and Black ICE type
- **Reorder floors** with the up/down arrow buttons
- **Drag-and-drop** Black ICE actors or black-ice-class program items directly onto floor drop zones
- **Generate random architectures** — click the dice button, pick a difficulty (Basic / Standard / Uncommon / Advanced), and the module rolls on the CPR compendium tables (3d6 for floor count, draws from the system's NET Architecture roll tables)
- **Export to chat** — posts a formatted architecture summary card to chat (whispered to GM)
- **Save** — writes your changes back to the `netarch` item

### 2. Netrunner Tracker (Play Mode)

The tracker is the player-facing window used during active netrunning sessions.

**How to open:**
- On any character sheet, go to the **Fight** tab and click **Netrunning Architect**
- Select which NET Architecture to jack into from the dropdown, then click **Jack In**

**What it does:**
- Displays the architecture as a **vertical tower** of floor tiles
- **Fog of war** — unexplored floors are hidden (shown as "???") until the netrunner moves to them. The GM always sees all floors.
- **Movement** — click **Move Up** or **Move Deeper** to navigate. If auto Interface checks are enabled, the module automatically rolls 1d10 + Interface rank vs the floor's DV before moving
- **Floor reveal** — when entering a new floor, a chat card announces what was found (content type, Black ICE presence)
- **Black ICE encounters** — when entering a floor with ICE, the combat panel opens automatically
- **Multi-runner support** — multiple netrunners can be in the same architecture simultaneously, each tracked independently
- **Jack Out** — ends the session and removes the runner from the architecture

**Tabs:**
- **Architecture** — the tower view with movement controls
- **NET Actions** — buttons for all 9 Interface abilities (Scanner, Backdoor, Cloak, Control, Eye-Dee, Pathfinder, Slide, Virus, Zap)
- **Programs** — quick view of rezzed programs with stats and REZ bars

### 3. Program Slot Manager

A dedicated panel for managing the netrunner's cyberdeck programs.

**How to open:**
- From the tracker's Programs tab, click **Cyberdeck Programs**

**What it shows:**
- The equipped cyberdeck's name and slot count (used / total)
- **Rezzed programs** with ATK, DEF stats and REZ bars
- **Installed programs** (not yet rezzed)
- **Empty slots** as placeholders

**Actions:**
- Click the play button to **Rez** a program (activates it for NET combat)
- Click the power button to **De-Rez** a rezzed program
- Click the search icon to open the program's item sheet

### 4. NET Combat Panel

Opens when encountering Black ICE on a floor.

**What it shows:**
- **ICE stat block** — PER, SPD, ATK, DEF displayed in a grid, plus a visual REZ bar
- **Runner's rezzed programs** with their stats
- Quick-action buttons

**Combat actions:**
- **Zap** — roll Interface rank vs ICE DEF, deal 1d6 REZ damage on hit
- **Program Attack** — roll Interface rank + program ATK vs ICE DEF, deal 2d6 REZ damage on hit
- **Program Defend** — roll Interface rank + program DEF (result shown in chat for comparison)
- **ICE Attacks** — GM clicks to roll ICE ATK (result posted to chat)
- **Flee (Slide)** — Interface check vs floor DV to escape combat
- **End Combat** — manually end the encounter

**GM tools:**
- **Reduce REZ** — manually subtract 1 REZ from ICE
- **Reset REZ** — restore ICE to full REZ

When ICE REZ hits 0, a defeat notification is posted to chat and the encounter is marked as cleared.

### 5. Interface Check Automation

All Interface rolls follow CPR rules:
- **Formula:** 1d10 + Interface role rank vs DV
- **Critical Success:** natural 10 on the d10 = roll another d10 and add it
- **Critical Failure:** natural 1 on the d10 = roll another d10 and subtract it
- **Dice So Nice:** if installed, 3D dice are shown for all rolls (respects roll mode: public/GM/blind/self)

Results are posted as styled chat cards showing the roll breakdown, total vs DV, and success/failure.

### 6. Socket Synchronization

All state changes (runner movement, floor reveals, ICE encounters, combat actions) are synchronized in real-time between GM and players via Foundry's socket system. The GM is always the authoritative source — players send requests, the GM validates and broadcasts updates.

## Module Settings

### World Settings (GM only)

| Setting | Default | Description |
|---------|---------|-------------|
| Enable Module | On | Master toggle for all features |
| Auto Interface Checks | On | Prompt Interface rolls when moving between floors |
| Fog of War | On | Hide unexplored floors in the tracker |
| Show Floor DVs to Players | Off | Display DVs to players before exploring |
| Auto-Trigger ICE | On | Automatically open combat when entering an ICE floor |
| Auto-Roll ICE Initiative | Off | Automatically roll initiative for Black ICE |
| Default Generation Difficulty | Standard | Default difficulty for random architecture generation |

### Client Settings (per player)

| Setting | Default | Description |
|---------|---------|-------------|
| Animation Speed | 400ms | Speed of floor reveal and movement animations |
| Compact Mode | Off | Use a more compact floor display |

## Public API

Other modules can interact with Netrunning Architect via:

```javascript
const api = game.modules.get("cpr-netrunning-architect").api;

api.openBuilder(netarchItem);              // Open the builder
api.openTracker(netarchItem, actor);       // Open the tracker
api.getArchitectureState(netarchItem);     // Read current run state
api.resetArchitecture(netarchItem);        // Clear all run state
```

## Development

1. Clone this repo into your Foundry `Data/modules/` directory:
   ```bash
   cd /path/to/foundry/Data/modules
   git clone https://github.com/VebjornNyvoll/cpr-netrunning-architect.git
   ```
2. Restart Foundry and enable the module in your world
3. No build step required — the module uses plain ESModules

## Release

1. Update `version` in `module.json`
2. Commit and push
3. Create a GitHub Release with a tag matching the version (e.g., `v1.0.0`)
4. The GitHub Actions workflow automatically builds and attaches `module.json` + `module.zip`

## License

MIT
