# Salesforce Debug Log Format Analysis

## Key Findings from Salesforce Documentation

### Log Structure
1. **Header**: Contains execution units, code units, log lines, and additional log information
2. **Execution Units**: Equivalent to a transaction, delimited by `EXECUTION_STARTED` and `EXECUTION_FINISHED`
3. **Code Units**: Discrete units of work within a transaction, delimited by `CODE_UNIT_STARTED` and `CODE_UNIT_FINISHED`
4. **Log Lines**: Individual log entries with specific format

### Log Line Format
Log lines are delimited by pipe (`|`) characters with the following structure:
```
timestamp|event_identifier|additional_info
```

**Timestamp Format**: `HH:mm:ss.SSS (nanoseconds_elapsed)`
- Example: `16:06:58.18 (18043585)`

### Common Event Identifiers
- `USER_INFO`: User information
- `EXECUTION_STARTED`/`EXECUTION_FINISHED`: Transaction boundaries
- `CODE_UNIT_STARTED`/`CODE_UNIT_FINISHED`: Code unit boundaries
- `HEAP_ALLOCATE`: Memory allocation
- `STATEMENT_EXECUTE`: Statement execution
- `USER_DEBUG`: System.debug() statements
- `CUMULATIVE_LIMIT_USAGE`: Resource usage information
- `VALIDATION_RULE`: Validation rule execution
- `WORKFLOW`: Workflow execution
- `DML_BEGIN`/`DML_END`: DML operation boundaries
- `SOQL_EXECUTE_BEGIN`/`SOQL_EXECUTE_END`: SOQL query execution

### Log Categories for Accordion Organization
Based on the event identifiers, we can organize logs into these main categories:

1. **System Information**
   - USER_INFO
   - EXECUTION_STARTED/FINISHED
   - CUMULATIVE_LIMIT_USAGE

2. **Code Execution**
   - CODE_UNIT_STARTED/FINISHED
   - STATEMENT_EXECUTE
   - USER_DEBUG

3. **Database Operations**
   - DML_BEGIN/DML_END
   - SOQL_EXECUTE_BEGIN/SOQL_EXECUTE_END

4. **Memory Management**
   - HEAP_ALLOCATE

5. **Workflow & Validation**
   - VALIDATION_RULE
   - WORKFLOW

6. **Triggers**
   - Trigger-related CODE_UNIT entries

7. **Callouts**
   - CALLOUT_REQUEST/CALLOUT_RESPONSE

### Example Log Entry
```
16:06:58.18 (49244886)|USER_DEBUG|[1]|DEBUG|Hello World!
```
- Timestamp: `16:06:58.18 (49244886)`
- Event: `USER_DEBUG`
- Line Number: `[1]`
- Level: `DEBUG`
- Message: `Hello World!`

