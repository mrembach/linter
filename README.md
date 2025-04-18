# Figma Linter

A powerful Figma plugin designed to help designers maintain consistency and quality in their design files through automated linting.

## Features

- Automated design file linting
- Team library integration
- Real-time feedback on design consistency
- Customizable linting rules

## How It Works

The Figma Linter compares design values in your file against a designated library file, while respecting an exceptions list. Here's how it works:

1. **Library File Reference**:
   - The linter uses a specified Figma library file as the source of truth
   - All design values are compared against the library's defined standards

2. **Value Comparison**:
   - **Colors**:
     The linter first checks if a color is using a library style. If not, it compares the color's hex/RGB values against all colors in the library palette. Colors are considered matching if their values are within a small tolerance range (to account for rounding differences). Opacity values are checked separately and can have their own tolerance range.

   - **Text Styles**:
     For each text layer, the linter checks if it's using a library text style. If not, it compares the text properties (font family, size, weight, line height, letter spacing) against all library text styles. A match is found when all properties align with a library style within defined tolerance ranges. The linter also checks for common mistakes like using similar but different font weights.

   - **Spacing**:
     The linter analyzes the spacing between elements by measuring the distance between node boundaries. It then compares these values against the library's defined spacing scale. The spacing scale typically follows a consistent pattern (e.g., 4px, 8px, 16px, 24px, etc.). Values that don't match the scale within a small tolerance are flagged. The linter also checks if auto-layout could be used instead of manual spacing.

   - **Border Radius**:
     For each node with rounded corners, the linter checks if it's using a library style. If not, it compares the radius values against the library's defined options. The linter handles both uniform and mixed radius values, ensuring all corners follow the library's standards. It also checks for consistency within components, ensuring the same radius values are used for similar elements.

3. **Detached Instance Detection**:
   - Scans for elements not properly connected to library styles
   - Identifies:
     - Text layers with custom styling instead of library text styles
     - Frames with manual spacing instead of auto-layout
     - Components with overridden properties that should use variants
     - Colors applied directly instead of using color styles
     - Effects and shadows not using library styles

4. **Exceptions Handling**:
   - The linter maintains an exceptions list for special cases
   - Nodes or components in the exceptions list are skipped during validation
   - Exceptions can be set for:
     - Specific components or instances
     - Entire frames or sections
     - Individual properties (e.g., allowing custom colors in certain contexts)

5. **Validation Process**:
   - Each node is checked against the library file
   - Values outside library standards are flagged
   - Detached instances are identified and reported
   - Exceptions are respected before flagging issues
   - Detailed reports show where values deviate from standards

## Usage

1. Install the plugin in Figma
2. Open your design file
3. Run the linter to check for consistency issues
4. Follow the suggestions to improve your design

## Project Structure

- `src/` - Source code directory
  - `main.ts` - Main plugin logic
  - `ui.tsx` - Plugin UI components
- `build/` - Compiled plugin files
- `docs/` - Documentation

## Dependencies

- @create-figma-plugin/ui
- @create-figma-plugin/utilities
- preact
- TypeScript

## Credits

This project is built using several open-source libraries and tools:

- [Create Figma Plugin](https://github.com/yuanqing/create-figma-plugin) - The build tool and utilities for creating Figma plugins
- [Preact](https://preactjs.com/) - A fast, lightweight alternative to React for the UI
- [TypeScript](https://www.typescriptlang.org/) - For type-safe development
- [Figma Plugin API](https://www.figma.com/plugin-docs/) - The official Figma Plugin API documentation
