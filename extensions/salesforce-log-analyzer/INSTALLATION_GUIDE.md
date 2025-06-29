# Salesforce Log Analyzer - Installation & Usage Guide

## Quick Start

### Installation
1. Download the `salesforce-log-analyzer-0.0.1.vsix` file
2. Open Visual Studio Code
3. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) to open Command Palette
4. Type "Extensions: Install from VSIX..." and select it
5. Browse and select the downloaded `.vsix` file
6. Click "Install" and restart VS Code if prompted

### First Use
1. Open the Explorer panel in VS Code (Ctrl+Shift+E)
2. Look for "Salesforce Log Analysis" panel at the bottom
3. Use one of these methods to analyze a log:
   - **Method 1**: Command Palette → "Analyze Salesforce Log File" → Select your .log file
   - **Method 2**: Right-click a .log/.txt file in Explorer → "Analyze Salesforce Log File"
   - **Method 3**: Open a log file in editor → Command Palette → "Analyze Current File as Salesforce Log"

## Features Overview

### 📊 Accordion Organization
- **System Information**: Execution boundaries, user info, resource usage
- **Code Execution**: Apex code, method calls, debug statements
- **Database Operations**: SOQL queries, DML operations
- **Memory Management**: Heap allocation tracking
- **Workflow & Validation**: Business logic execution
- **Triggers**: Trigger-related operations
- **Callouts**: External service calls

### 🔍 Intelligent Grouping
Each category automatically groups similar entries:
- **USER_DEBUG**: By message patterns (errors, start/end, queries, DML)
- **STATEMENT_EXECUTE**: By line number ranges
- **CODE_UNIT**: By code type (triggers, anonymous, web services)
- **DML Operations**: By operation type (insert, update, delete)
- **SOQL Queries**: By object type and characteristics
- **HEAP_ALLOCATE**: By allocation size ranges

### 📈 Performance Insights
- Total log entries count
- Execution time in milliseconds
- API version information
- Debug level configuration
- Resource usage statistics

## Sample Log Analysis

The extension includes a sample debug log (`sample_debug.log`) that demonstrates:
- Anonymous Apex execution
- System.debug statements
- Account record creation
- SOQL query execution
- DML operations
- Validation rule execution
- Workflow evaluation
- Memory allocation tracking

## Troubleshooting

### Extension Not Appearing
- Ensure VS Code version is 1.101.0 or higher
- Restart VS Code after installation
- Check Extensions view to confirm installation

### Log Not Parsing
- Verify the file contains valid Salesforce debug log format
- Check that log lines contain pipe (|) delimiters
- Ensure timestamps are in format: HH:mm:ss.SSS (nanoseconds)

### Performance Issues
- Large log files (>10MB) may take longer to parse
- Consider filtering logs to specific debug levels before analysis
- Close other resource-intensive VS Code extensions if needed

## Advanced Usage

### Custom Log Levels
The extension recognizes these Salesforce debug levels:
- FINEST, FINER, FINE, DEBUG, INFO, WARN, ERROR, FATAL

### Supported Log Categories
- APEX_CODE, APEX_PROFILING, CALLOUT, DB, SYSTEM
- VALIDATION, VISUALFORCE, WORKFLOW

### Log Entry Interaction
- Click any log entry to open it in a new editor tab
- Use the raw log view for detailed analysis
- Copy specific entries for sharing or documentation

## Development & Customization

### Source Code Structure
```
src/
├── extension.ts          # Main extension entry point
├── types.ts             # TypeScript interfaces
├── logParser.ts         # Core parsing logic
├── logViewProvider.ts   # UI webview provider
└── logGroupingUtility.ts # Enhanced grouping logic
```

### Building from Source
```bash
git clone <repository>
cd salesforce-log-analyzer
npm install
npm run compile
npm run package
```

## Support

For issues, feature requests, or contributions:
1. Check the README.md for detailed documentation
2. Review the log_format_analysis.md for technical details
3. Test with the included sample_debug.log file
4. Verify your log format matches Salesforce debug log standards

## Version History

### v0.0.1 (Initial Release)
- ✅ Accordion-based log organization
- ✅ Intelligent log grouping
- ✅ Salesforce debug log parsing
- ✅ Interactive UI with click-to-view
- ✅ Performance metrics display
- ✅ Command palette integration
- ✅ Context menu support

