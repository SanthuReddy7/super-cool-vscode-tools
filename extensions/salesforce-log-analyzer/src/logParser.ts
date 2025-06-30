import { LogEntry, GroupedLogEntry, LogCategory, LogCategoryType, ParsedLog } from './types';
import { LogGroupingUtility } from './logGroupingUtility';

export class SalesforceLogParser {
    private static readonly EVENT_CATEGORY_MAP: Map<string, LogCategoryType> = new Map([
        // System Information
        ['USER_INFO', LogCategoryType.SYSTEM_INFO],
        ['EXECUTION_STARTED', LogCategoryType.SYSTEM_INFO],
        ['EXECUTION_FINISHED', LogCategoryType.SYSTEM_INFO],
        ['CUMULATIVE_LIMIT_USAGE', LogCategoryType.SYSTEM_INFO],
        ['CUMULATIVE_LIMIT_USAGE_END', LogCategoryType.SYSTEM_INFO],
        ['LIMIT_USAGE_FOR_NS', LogCategoryType.SYSTEM_INFO],

        // Code Execution
        ['CODE_UNIT_STARTED', LogCategoryType.CODE_EXECUTION],
        ['CODE_UNIT_FINISHED', LogCategoryType.CODE_EXECUTION],
        ['STATEMENT_EXECUTE', LogCategoryType.CODE_EXECUTION],
        ['USER_DEBUG', LogCategoryType.CODE_EXECUTION],
        ['CONSTRUCTOR_ENTRY', LogCategoryType.CODE_EXECUTION],
        ['CONSTRUCTOR_EXIT', LogCategoryType.CODE_EXECUTION],
        ['METHOD_ENTRY', LogCategoryType.CODE_EXECUTION],
        ['METHOD_EXIT', LogCategoryType.CODE_EXECUTION],
        ['VF_APEX_CALL_START', LogCategoryType.CODE_EXECUTION],
        ['VF_APEX_CALL_END', LogCategoryType.CODE_EXECUTION],
        ['EXCEPTION_THROWN',LogCategoryType.CODE_EXECUTION],

        // Database Operations
        ['DML_BEGIN', LogCategoryType.DATABASE_OPERATIONS],
        ['DML_END', LogCategoryType.DATABASE_OPERATIONS],
        ['SOQL_EXECUTE_BEGIN', LogCategoryType.DATABASE_OPERATIONS],
        ['SOQL_EXECUTE_END', LogCategoryType.DATABASE_OPERATIONS],
        ['SOSL_EXECUTE_BEGIN', LogCategoryType.DATABASE_OPERATIONS],
        ['SOSL_EXECUTE_END', LogCategoryType.DATABASE_OPERATIONS],

        // Memory Management
        ['HEAP_ALLOCATE', LogCategoryType.MEMORY_MANAGEMENT],
        ['HEAP_DEALLOCATE', LogCategoryType.MEMORY_MANAGEMENT],

        // Workflow & Validation
        ['VALIDATION_RULE', LogCategoryType.WORKFLOW_VALIDATION],
        ['VALIDATION_PASS', LogCategoryType.WORKFLOW_VALIDATION],
        ['VALIDATION_FAIL', LogCategoryType.WORKFLOW_VALIDATION],
        ['WORKFLOW', LogCategoryType.WORKFLOW_VALIDATION],
        ['WF_RULE_EVAL_BEGIN', LogCategoryType.WORKFLOW_VALIDATION],
        ['WF_RULE_EVAL_END', LogCategoryType.WORKFLOW_VALIDATION],
        ['WF_CRITERIA_BEGIN', LogCategoryType.WORKFLOW_VALIDATION],
        ['WF_CRITERIA_END', LogCategoryType.WORKFLOW_VALIDATION],
        ['WF_ACTIONS_END', LogCategoryType.WORKFLOW_VALIDATION],

        // Callouts
        ['CALLOUT_REQUEST', LogCategoryType.CALLOUTS],
        ['CALLOUT_RESPONSE', LogCategoryType.CALLOUTS],
    ]);

    public parseLog(logContent: string): ParsedLog {
        const lines = logContent.split('\n').filter(line => line.trim() !== '');
        const entries: LogEntry[] = [];
        let apiVersion: string | undefined;
        let debugLevels: string | undefined;
        let executionStartTime: number | undefined;
        let executionEndTime: number | undefined;

        for (const line of lines) {
            // Skip empty lines and comments
            if (!line.trim() || line.startsWith('//')) {
                continue;
            }

            // Extract API version and debug levels from header
            if (line.includes('APEX_CODE,') && line.includes(';')) {
                const versionMatch = line.match(/^(\d+\.\d+)\s/);
                if (versionMatch) {
                    apiVersion = versionMatch[1];
                    debugLevels = line.substring(versionMatch[0].length);
                }
                continue;
            }

            // Parse log entry
            const entry = this.parseLogEntry(line);
            if (entry) {
                entries.push(entry);

                // Track execution time
                if (entry.eventIdentifier === 'EXECUTION_STARTED') {
                    executionStartTime = entry.nanoseconds;
                } else if (entry.eventIdentifier === 'EXECUTION_FINISHED') {
                    executionEndTime = entry.nanoseconds;
                }
            }
        }

        const executionTime = (executionStartTime && executionEndTime) 
            ? (executionEndTime - executionStartTime) / 1000000 // Convert to milliseconds
            : 0;

        const categories = this.categorizeEntries(entries);

        return {
            categories,
            totalEntries: entries.length,
            executionTime,
            apiVersion,
            debugLevels
        };
    }

    private parseLogEntry(line: string): LogEntry | null {
        // List of all known Salesforce log event names
        const KNOWN_EVENT_NAMES = [
        'USER_INFO', 'EXECUTION_STARTED', 'EXECUTION_FINISHED', 'CUMULATIVE_LIMIT_USAGE', 'CUMULATIVE_LIMIT_USAGE_END', 'LIMIT_USAGE_FOR_NS', 'CODE_UNIT_STARTED',
        'CODE_UNIT_FINISHED', 'SYSTEM_CONSTRUCTOR_ENTRY', 'SYSTEM_CONSTRUCTOR_EXIT', 'SYSTEM_METHOD_ENTRY', 'SYSTEM_METHOD_EXIT', 'APEX_PROFILING',
        'STATEMENT_EXECUTE', 'USER_DEBUG', 'CONSTRUCTOR_ENTRY', 'CONSTRUCTOR_EXIT', 'METHOD_ENTRY', 'METHOD_EXIT', 'EXCEPTION_THROWN', 'DML_BEGIN', 'DML_END',
        'SOQL_EXECUTE_BEGIN', 'SOQL_EXECUTE_END', 'SOSL_EXECUTE_BEGIN', 'SOSL_EXECUTE_END', 'APEX_CODE', 'VF_APEX_CALL_START', 'VF_APEX_CALL_END',
        'FLOW_START_INTERVIEW', 'FLOW_END_INTERVIEW', 'FLOW_START_INTERVIEW_BEGIN', 'FLOW_START_INTERVIEW_END', 'FLOW_CREATE_INTERVIEW', 'FLOW_ELEMENT_BEGIN',
        'FLOW_ELEMENT_END', 'FLOW_CREATE_INTERVIEW_BEGIN', 'FLOW_CREATE_INTERVIEW_END', 'DB_BEGIN', 'DB_END', 'DML_INSERT', 'DML_UPDATE', 'DML_DELETE', 'DML_UPSERT', 'DML_UNDELETE',
        'TRIGGER_STARTED', 'TRIGGER_FINISHED', 'HEAP_ALLOCATE', 'HEAP_DEALLOCATE', 'VALIDATION_RULE', 'VALIDATION_PASS', 'VALIDATION_FAIL', 'WORKFLOW',
        'WF_RULE_EVAL_BEGIN', 'WF_RULE_EVAL_END', 'WF_CRITERIA_BEGIN', 'WF_CRITERIA_END', 'WF_ACTIONS_BEGIN', 'WF_ACTIONS_END', 'WF_TASK', 'WF_EMAIL_ALERT', 'WF_FIELD_UPDATE',
        'WF_OUTBOUND_MESSAGE', 'WF_TIME_TRIGGER', 'WF_APPROVAL', 'WF_STEP', 'WF_STEP_APPROVER', 'WF_ALERT', 'CALLOUT_REQUEST', 'CALLOUT_RESPONSE', 'WEB_SERVICE', 'WEB_SERVICE_RESPONSE',
        'STATIC_RESOURCE_BEGIN', 'STATIC_RESOURCE_END', 'VF_DESERIALIZE_VIEWSTATE_BEGIN', 'VF_DESERIALIZE_VIEWSTATE_END', 'VF_SERIALIZE_VIEWSTATE_BEGIN', 'VF_SERIALIZE_VIEWSTATE_END',
        'PLATFORM_EVENT_PUBLISH', 'PLATFORM_EVENT_CONSUME', 'FATAL_ERROR', 'DUPLICATE_DETECTION_BEGIN', 'DUPLICATE_DETECTION_END'
        ];

        // Find first event name in the line
        const EVENT_NAME_REGEX = new RegExp(`\\b(${KNOWN_EVENT_NAMES.join('|')})\\b`);
        const eventMatch = line.match(EVENT_NAME_REGEX);
        if (!eventMatch) return null;

        const eventIdentifier = eventMatch[1].toUpperCase();
        const idx = line.indexOf(eventIdentifier);

        // --- Get what's before event for time/nano extraction ---
        const preEvent = line.substring(0, idx).trim();

        // Try to extract timestamp/nanoseconds from preEvent
        let timestamp = '';
        let nanoseconds = 0;
        const tsMatch = preEvent.match(/(\d{2}:\d{2}:\d{2}\.\d{1,3})\s*\((\d+)\)/);
        if (tsMatch) {
            timestamp = tsMatch[1];
            nanoseconds = parseInt(tsMatch[2], 10);
        }

        // --- After event: additional info ---
        let afterEvent = line.substring(idx + eventIdentifier.length);
        afterEvent = afterEvent.replace(/^[\[\|\s]*/, '');
        const additionalInfo = afterEvent.length
            ? afterEvent.split('|').map(s => s.trim()).filter(Boolean)
            : [];

        const entry: LogEntry = {
            timestamp,
            nanoseconds,  // Always a number!
            eventIdentifier,
            additionalInfo,
            rawLine: line
        };

        // Optional: further parsing...
        if (eventIdentifier === 'USER_DEBUG' && additionalInfo.length >= 3) {
            entry.lineNumber = this.extractLineNumber(additionalInfo[0]);
            entry.logLevel = additionalInfo[1];
            entry.message = additionalInfo.slice(2).join('|');
        } else if (eventIdentifier === 'STATEMENT_EXECUTE' && additionalInfo.length >= 1) {
            entry.lineNumber = this.extractLineNumber(additionalInfo[0]);
        }

        return entry;
    }



    private extractLineNumber(lineInfo: string): number | undefined {
        const match = lineInfo.match(/\[(\d+)\]/);
        return match ? parseInt(match[1], 10) : undefined;
    }

    private categorizeEntries(entries: LogEntry[]): Map<LogCategoryType, LogCategory> {
        const categories = new Map<LogCategoryType, LogCategory>();

        // Initialize all categories
        for (const categoryType of Object.values(LogCategoryType)) {
            categories.set(categoryType as LogCategoryType, {
                name: categoryType,
                description: this.getCategoryDescription(categoryType as LogCategoryType),
                eventTypes: [],
                groups: [],
                totalEntries: 0
            });
        }

        // Group entries by category and event type
        const categoryGroups = new Map<LogCategoryType, Map<string, LogEntry[]>>();

        for (const entry of entries) {
            const categoryType = SalesforceLogParser.EVENT_CATEGORY_MAP.get(entry.eventIdentifier) || LogCategoryType.OTHER;
            
            if (!categoryGroups.has(categoryType)) {
                categoryGroups.set(categoryType, new Map());
            }

            const eventGroups = categoryGroups.get(categoryType)!;
            if (!eventGroups.has(entry.eventIdentifier)) {
                eventGroups.set(entry.eventIdentifier, []);
            }

            eventGroups.get(entry.eventIdentifier)!.push(entry);
        }

        // Convert to final structure with enhanced grouping
        for (const [categoryType, eventGroups] of categoryGroups) {
            const category = categories.get(categoryType)!;
            category.eventTypes = Array.from(eventGroups.keys());
            category.totalEntries = Array.from(eventGroups.values()).reduce((sum, entries) => sum + entries.length, 0);

            for (const [eventType, entries] of eventGroups) {
                // Use enhanced grouping for better organization
                const enhancedGroups = LogGroupingUtility.enhanceGrouping(entries, eventType);
                category.groups.push(...enhancedGroups);
            }

            // Sort groups by count (descending)
            category.groups.sort((a, b) => b.count - a.count);
        }

        return categories;
    }

    private getCategoryDescription(categoryType: LogCategoryType): string {
        switch (categoryType) {
            case LogCategoryType.SYSTEM_INFO:
                return 'System information, execution boundaries, and resource usage';
            case LogCategoryType.CODE_EXECUTION:
                return 'Apex code execution, method calls, and debug statements';
            case LogCategoryType.DATABASE_OPERATIONS:
                return 'SOQL queries, DML operations, and database interactions';
            case LogCategoryType.MEMORY_MANAGEMENT:
                return 'Heap allocation and memory management operations';
            case LogCategoryType.WORKFLOW_VALIDATION:
                return 'Workflow rules, validation rules, and business logic';
            case LogCategoryType.TRIGGERS:
                return 'Trigger execution and trigger-related operations';
            case LogCategoryType.CALLOUTS:
                return 'External service callouts and HTTP requests';
            case LogCategoryType.OTHER:
                return 'Other log entries not categorized above';
            default:
                return 'Unknown category';
        }
    }

    public getLogSummary(parsedLog: ParsedLog): string {
        const summary = [];
        summary.push(`Total Log Entries: ${parsedLog.totalEntries}`);
        summary.push(`Execution Time: ${parsedLog.executionTime.toFixed(2)}ms`);
        
        if (parsedLog.apiVersion) {
            summary.push(`API Version: ${parsedLog.apiVersion}`);
        }

        summary.push('\\nCategories:');
        for (const [categoryType, category] of parsedLog.categories) {
            if (category.totalEntries > 0) {
                summary.push(`  ${category.name}: ${category.totalEntries} entries`);
            }
        }

        return summary.join('\\n');
    }
}

