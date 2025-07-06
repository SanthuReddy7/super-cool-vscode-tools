# Apex SCA Autofix - Installation and Usage Guide

## Overview

This VS Code extension automatically resolves SCA (Software Composition Analysis) violations in Apex code. It includes all the requested features:

✅ **User-selectable violation fix levels (1-5)** - Checkboxes in sidebar  
✅ **Default PMD XML ruleset** - Included with option to select custom files  
✅ **Fix preview functionality** - Shows violations before applying fixes  
✅ **Batch fixing options** - Fix same type violations or all violations in file  
✅ **Auto-fixers for violations 1, 2, and 3**:
   - Unused variables/imports (Violation 1)
   - Empty catch blocks (Violation 2) 
   - CRUD/FLS violations (Violation 3)

## Installation

### Prerequisites
1. **Java 11 or higher** - Required for PMD execution
   ```bash
   # Check if Java is installed
   java -version
   
   # Install Java if needed (Ubuntu/Debian)
   sudo apt update && sudo apt install -y openjdk-11-jdk
   ```

2. **VS Code 1.101.0 or higher**

### Install the Extension
1. Download the `salesforce-pmd-autofix-0.0.1.vsix` file
2. In VS Code, open Command Palette (Ctrl+Shift+P)
3. Run "Extensions: Install from VSIX..."
4. Select the downloaded .vsix file
5. Restart VS Code

## Features Overview

### 1. Fix Level Selection (Checkboxes 1-5)
- **Level 1 (Critical)** - ✅ Enabled by default
- **Level 2 (High)** - ✅ Enabled by default  
- **Level 3 (Medium)** - ✅ Enabled by default
- **Level 4 (Low)** - ⬜ Disabled by default
- **Level 5 (Info)** - ⬜ Disabled by default

### 2. PMD Ruleset Management
- **Default XML file provided** - Located in `rulesets/apex_ruleset.xml`
- **Custom ruleset selection** - Use "Select Custom Ruleset" button
- **Update existing file** - Modify the default or select a new one

### 3. Fix Preview and Batch Operations
- **Preview violations** - View all violations in sidebar before fixing
- **Fix individual violation** - "Fix This Violation" button
- **Fix same type** - "Fix All of This Type" button  
- **Fix all violations** - "Fix All Violations" button

## Usage Instructions

### Step 1: Open Apex File
1. Open any Apex (.cls) file in VS Code
2. The extension will automatically activate
3. The "Apex SCA Autofix" sidebar panel will appear

### Step 2: Configure Fix Levels
1. In the sidebar, check/uncheck violation levels 1-5
2. Default: Levels 1-3 are enabled (Critical, High, Medium)

### Step 3: Select PMD Ruleset (Optional)
1. Click "Select Custom Ruleset" button
2. Choose your custom PMD XML file
3. Or use the default ruleset provided

### Step 4: Run SCA Analysis
1. Click "Run SCA Analysis" button in sidebar
2. Or use Command Palette: "Apex SCA Autofix: Run SCA Analysis"
3. Or right-click in editor and select "Run SCA Analysis"

### Step 5: Review and Fix Violations
1. **Preview violations** in the sidebar grouped by type
2. **Fix options**:
   - Individual: Click "Fix This Violation"
   - By type: Click "Fix All of This Type" 
   - All: Click "Fix All Violations"

## Auto-Fixer Details

### Violation 1: Unused Variables/Imports
- **Detection**: Identifies unused local variables
- **Fix**: Automatically removes the unused variable declaration
- **Example**: 
  ```apex
  // Before
  String unusedVar = 'test';
  String usedVar = 'hello';
  System.debug(usedVar);
  
  // After
  String usedVar = 'hello';
  System.debug(usedVar);
  ```

### Violation 2: Empty Catch Blocks
- **Detection**: Finds empty catch blocks
- **Fix**: Adds appropriate logging statement
- **Example**:
  ```apex
  // Before
  try {
      Integer result = 10 / 0;
  } catch (Exception e) {
      // Empty catch block
  }
  
  // After
  try {
      Integer result = 10 / 0;
  } catch (Exception e) {
      System.debug('An empty catch block was found.');
  }
  ```

### Violation 3: CRUD/FLS Violations
- **Detection**: Identifies SOQL/DML operations without permission checks
- **Fix**: Adds Schema.sObjectType permission validation
- **Example**:
  ```apex
  // Before
  List<Account> accounts = [SELECT Id, Name FROM Account];
  
  // After
  if (!Schema.sObjectType.Account.isAccessible()) {
      throw new System.NoAccessException('Access to Account object is not allowed.');
  }
  List<Account> accounts = [SELECT Id, Name FROM Account];
  ```

## Default PMD Ruleset

The extension includes a default ruleset (`rulesets/apex_ruleset.xml`):

```xml
<?xml version="1.0"?>
<ruleset name="Apex SCA Autofix Ruleset">
    <description>Default ruleset for Apex SCA Autofix extension.</description>
    
    <rule ref="category/apex/bestpractices.xml/UnusedLocalVariable"/>
    <rule ref="category/apex/errorprone.xml/EmptyCatchBlock"/>
    <rule ref="category/apex/security.xml/ApexCRUDViolation"/>
</ruleset>
```

## Commands Available

- `Apex SCA Autofix: Run SCA Analysis`
- `Apex SCA Autofix: Fix All Violations`
- `Apex SCA Autofix: Select Custom Ruleset`

## Troubleshooting

### Java Not Found Error
- Ensure Java 11+ is installed and in PATH
- Restart VS Code after installing Java

### PMD Execution Failed
- Check that the Apex file syntax is valid
- Verify the custom ruleset XML is properly formatted

### No Violations Detected
- Ensure the file has actual violations
- Check that the correct ruleset is selected
- Verify fix levels are properly configured

## File Structure

```
salesforce-pmd-autofix/
├── src/                    # TypeScript source code
├── out/                    # Compiled JavaScript
├── pmd/                    # PMD binary (included)
├── rulesets/              # Default PMD ruleset
├── test-examples/         # Example Apex files for testing
├── package.json           # Extension manifest
├── README.md             # Extension documentation
└── salesforce-pmd-autofix-0.0.1.vsix  # Packaged extension
```

## Support

This extension provides comprehensive SCA violation auto-fixing for Apex code with all requested features implemented and ready for use.

