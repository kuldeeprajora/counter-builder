# Counter Builder

Counter Builder is a dockable Adobe After Effects ScriptUI panel for creating editable, animated number counters on text layers.

Current script version: `1.0.5`

## Features

- Animate between custom start and end values
- Use seconds, frames, a selected layer's duration, or the composition work area as the counter duration
- Add custom prefixes and suffixes
- Display 0–10 decimal places
- Enable or disable thousands separators
- Choose International or Indian number grouping
- Set left, centre, or right paragraph alignment
- Choose Linear, Ease Out, or Ease In-Out animation
- Create a new text layer, apply the counter to a selected text layer, or duplicate a selected text layer
- Update a counter previously created by the tool
- Remove the generated expression controls while preserving the currently displayed text
- Edit counter values later through controls added to the layer's Effect Controls panel

## Installation

Copy `Counter Builder.jsx` into the After Effects `Scripts/ScriptUI Panels` directory.

- Windows: `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\`
- macOS: `/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/`

Restart After Effects, then open **Window > Counter Builder**.

A separate `Counter_Builder_Quick_Installation_Guide.pdf` is included in this repository.

## Basic Usage

1. Open or select a composition.
2. Enter the start value, end value, duration, formatting, and animation settings.
3. Choose a layer mode.
4. Click **Create Counter**.
5. To revise a generated counter, select its text layer and click **Update Selected Counter**.
6. To convert it back to normal text, select the layer and click **Remove Counter Setup**.

When using **Apply to Selected Text Layer**, **Duplicate Selected Text Layer**, or **Selected Layer Duration**, select exactly one suitable layer before running the action.

## Development Status

Counter Builder is not release-ready. The current build has known functional problems in testing on both macOS and Windows. The repository is private while those issues are reproduced and fixed.

