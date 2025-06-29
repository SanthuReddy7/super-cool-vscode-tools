# Salesforce Log Analyzer

A Visual Studio Code extension that analyzes Salesforce debug logs with organized accordion views and intelligent log grouping.

## Features

- **Accordion Organization**: Automatically categorizes log entries into collapsible accordions by type (System Information, Code Execution, Database Operations, etc.)
- **Intelligent Grouping**: Groups similar log entries together within each category for better analysis
- **Enhanced Parsing**: Parses Salesforce debug log format with support for timestamps, event identifiers, and additional information
- **Interactive UI**: Click on log entries to view them in detail, expand/collapse categories as needed
- **Performance Metrics**: Shows execution time, total entries, and resource usage statistics

## Usage

### Analyze a Log File
1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Run "Analyze Salesforce Log File"
3. Select your Salesforce debug log file (.log or .txt)
4. View the analysis in the "Salesforce Log Analysis" panel in the Explorer

### Analyze Current File
1. Open a Salesforce debug log file in VS Code
2. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
3. Run "Analyze Current File as Salesforce Log"
4. View the analysis in the "Salesforce Log Analysis" panel

### Analyze Clipboard Content
1. Copy Salesforce debug log content to your clipboard
2. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
3. Run "Analyze Clipboard Content as Salesforce Log"
4. View the analysis in the "Salesforce Log Analysis" panel

### Context Menu
- Right-click on .log or .txt files in the Explorer
- Select "Analyze Salesforce Log File" from the context menu

## Log Categories

The extension organizes logs into the following categories:

- **System Information**: User info, execution boundaries, resource usage
- **Code Execution**: Apex code execution, method calls, debug statements
- **Database Operations**: SOQL queries, DML operations, database interactions
- **Memory Management**: Heap allocation and memory management operations
- **Workflow & Validation**: Workflow rules, validation rules, business logic
- **Triggers**: Trigger execution and trigger-related operations
- **Callouts**: External service callouts and HTTP requests
- **Other**: Uncategorized log entries

## Enhanced Grouping

Within each category, the extension provides intelligent sub-grouping:

- **USER_DEBUG**: Groups by message patterns (errors, start/end, queries, DML, tests)
- **STATEMENT_EXECUTE**: Groups by line number ranges
- **CODE_UNIT**: Groups by code type (triggers, anonymous apex, web services, batch, etc.)
- **DML Operations**: Groups by operation type (insert, update, delete, upsert)
- **SOQL Queries**: Groups by object type and query characteristics
- **HEAP_ALLOCATE**: Groups by allocation size ranges
- **VALIDATION_RULE**: Groups by rule name
- **WORKFLOW**: Groups by workflow type (rules, actions, field updates, etc.)

## Requirements

- Visual Studio Code 1.101.0 or higher

## Installation

1. Download the `.vsix` file
2. Open VS Code
3. Go to Extensions view (`Ctrl+Shift+X`)
4. Click the "..." menu and select "Install from VSIX..."
5. Select the downloaded `.vsix` file

## Development

To set up the development environment:

```bash
git clone <repository-url>
cd salesforce-log-analyzer
npm install
npm run compile
```

To run the extension in development mode:
1. Open the project in VS Code
2. Press `F5` to launch a new Extension Development Host window
3. Test the extension in the new window

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License © 2025 Santhosh Reddy BasiReddy


## Release Notes

### 1.0.0

New features:
- ✅ **Clipboard Analysis**: Analyze Salesforce debug logs directly from clipboard content
- ✅ Enhanced validation for clipboard content to ensure it's valid Salesforce log format
- ✅ Improved user feedback with detailed progress messages

### 2.0.0

Initial release of Salesforce Log Analyzer:
- ✅ Basic log parsing and categorization
- ✅ Accordion UI with expandable categories
- ✅ Intelligent log grouping within categories
- ✅ Support for Salesforce debug log format
- ✅ Performance metrics and statistics

### 2.0.1

- ✅ Supports Visual Studio Code version to support 1.85.0 and above

[Download the latest VSIX](https://marketplace.visualstudio.com/_apis/public/gallery/publishers/supercooltools/vsextensions/salesforce-log-analyzer/2.0.1/vspackage)
