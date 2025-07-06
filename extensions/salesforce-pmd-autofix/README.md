# Apex SCA Autofix

A VS Code extension that automatically resolves SCA (Software Composition Analysis) violations in Apex code.

## Features

- **Automatic Detection**: Uses PMD to detect SCA violations in Apex code
- **Auto-fixing**: Automatically fixes common violations including:
  - Unused variables and imports
  - Empty catch blocks
  - CRUD/FLS violations
- **User-selectable Fix Levels**: Choose which violation levels to fix (1-5)
- **Custom PMD Rulesets**: Support for custom PMD ruleset XML files
- **Fix Preview**: Preview fixes before applying them
- **Batch Fixing**: Fix all violations of the same type or all violations in a file
- **Sidebar Integration**: Dedicated sidebar panel for managing violations

## Requirements

- Java 11 or higher (required for PMD)
- VS Code 1.101.0 or higher

## Installation

1. Install the extension from the VS Code marketplace
2. Ensure Java 11+ is installed and available in your PATH
3. Open an Apex (.cls) file to activate the extension

## Usage

### Running SCA Analysis

1. Open an Apex file (.cls)
2. Use the Command Palette (Ctrl+Shift+P) and run "Apex SCA Autofix: Run SCA Analysis"
3. Or right-click in the editor and select "Run SCA Analysis"
4. View violations in the sidebar panel

### Fixing Violations

- **Fix Individual Violation**: Click "Fix This Violation" button in the sidebar
- **Fix All of Same Type**: Click "Fix All of This Type" button for a violation group
- **Fix All Violations**: Click "Fix All Violations" button in the sidebar

### Custom Rulesets

1. Use "Apex SCA Autofix: Select Custom Ruleset" command
2. Choose your custom PMD ruleset XML file
3. The extension will use your custom rules for future analyses

### Fix Level Selection

Use the checkboxes in the sidebar to select which violation levels to include:
- Level 1 (Critical)
- Level 2 (High)
- Level 3 (Medium)
- Level 4 (Low)
- Level 5 (Info)

## Supported Violations

### Unused Variables/Imports
- Automatically removes unused local variables
- Removes unused import statements

### Empty Catch Blocks
- Adds appropriate logging statements to empty catch blocks

### CRUD/FLS Violations
- Adds Schema.sObjectType permission checks before DML operations
- Inserts appropriate access checks for SOQL queries

## Configuration

The extension includes a default PMD ruleset but supports custom rulesets. Place your custom ruleset XML file anywhere and select it using the "Select Custom Ruleset" command.

## Known Limitations

- CRUD/FLS fixes use simplified logic and may require manual adjustment
- Complex code structures may need manual review after auto-fixing
- The extension requires Java to be installed for PMD execution

## Contributing

This extension is open source. Feel free to contribute improvements and additional auto-fixers.

## License

MIT License

