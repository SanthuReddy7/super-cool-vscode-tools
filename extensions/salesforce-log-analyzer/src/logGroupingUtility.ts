import { LogEntry, GroupedLogEntry } from './types';

export class LogGroupingUtility {
    /**
     * Enhanced grouping that creates sub-groups within event types based on patterns
     */
    public static enhanceGrouping(entries: LogEntry[], eventType: string): GroupedLogEntry[] {
        const groups = new Map<string, LogEntry[]>();

        for (const entry of entries) {
            const groupKey = this.determineGroupKey(entry, eventType);
            
            if (!groups.has(groupKey)) {
                groups.set(groupKey, []);
            }
            groups.get(groupKey)!.push(entry);
        }

        // Convert to GroupedLogEntry array and sort by count
        const result: GroupedLogEntry[] = [];
        for (const [groupKey, groupEntries] of groups) {
            result.push({
                type: groupKey,
                entries: groupEntries,
                count: groupEntries.length
            });
        }

        return result.sort((a, b) => b.count - a.count);
    }

    private static determineGroupKey(entry: LogEntry, eventType: string): string {
        switch (eventType) {
            case 'USER_DEBUG':
                return this.groupUserDebug(entry);
            case 'STATEMENT_EXECUTE':
                return this.groupStatementExecute(entry);
            case 'CODE_UNIT_STARTED':
            case 'CODE_UNIT_FINISHED':
                return this.groupCodeUnit(entry);
            case 'DML_BEGIN':
            case 'DML_END':
                return this.groupDML(entry);
            case 'SOQL_EXECUTE_BEGIN':
            case 'SOQL_EXECUTE_END':
                return this.groupSOQL(entry);
            case 'HEAP_ALLOCATE':
                return this.groupHeapAllocate(entry);
            case 'VALIDATION_RULE':
                return this.groupValidationRule(entry);
            case 'WORKFLOW':
                return this.groupWorkflow(entry);
            default:
                return eventType;
        }
    }

    private static groupUserDebug(entry: LogEntry): string {
        if (!entry.message) {
            return 'USER_DEBUG (No Message)';
        }

        // Group by debug patterns
        const message = entry.message.toLowerCase();
        
        if (message.includes('error') || message.includes('exception')) {
            return 'USER_DEBUG (Errors)';
        }
        
        if (message.includes('start') || message.includes('begin')) {
            return 'USER_DEBUG (Start/Begin)';
        }
        
        if (message.includes('end') || message.includes('finish') || message.includes('complete')) {
            return 'USER_DEBUG (End/Finish)';
        }
        
        if (message.includes('query') || message.includes('soql')) {
            return 'USER_DEBUG (Query Related)';
        }
        
        if (message.includes('insert') || message.includes('update') || message.includes('delete') || message.includes('upsert')) {
            return 'USER_DEBUG (DML Related)';
        }
        
        if (message.includes('test') || message.includes('assert')) {
            return 'USER_DEBUG (Test Related)';
        }

        // Group by log level
        if (entry.logLevel) {
            return `USER_DEBUG (${entry.logLevel})`;
        }

        return 'USER_DEBUG (General)';
    }

    private static groupStatementExecute(entry: LogEntry): string {
        if (entry.lineNumber) {
            // Group by line number ranges for better organization
            const lineNum = entry.lineNumber;
            if (lineNum <= 10) {
                return 'STATEMENT_EXECUTE (Lines 1-10)';
            } else if (lineNum <= 50) {
                return 'STATEMENT_EXECUTE (Lines 11-50)';
            } else if (lineNum <= 100) {
                return 'STATEMENT_EXECUTE (Lines 51-100)';
            } else {
                return 'STATEMENT_EXECUTE (Lines 100+)';
            }
        }
        return 'STATEMENT_EXECUTE (Unknown Line)';
    }

    private static groupCodeUnit(entry: LogEntry): string {
        if (entry.additionalInfo.length > 0) {
            const codeInfo = entry.additionalInfo[0];
            
            if (codeInfo.includes('trigger')) {
                return `${entry.eventIdentifier} (Triggers)`;
            }
            
            if (codeInfo.includes('execute_anonymous')) {
                return `${entry.eventIdentifier} (Anonymous Apex)`;
            }
            
            if (codeInfo.includes('webservice') || codeInfo.includes('RestResource')) {
                return `${entry.eventIdentifier} (Web Services)`;
            }
            
            if (codeInfo.includes('@future')) {
                return `${entry.eventIdentifier} (Future Methods)`;
            }
            
            if (codeInfo.includes('batch')) {
                return `${entry.eventIdentifier} (Batch Apex)`;
            }
            
            if (codeInfo.includes('schedule')) {
                return `${entry.eventIdentifier} (Scheduled Apex)`;
            }
            
            if (codeInfo.includes('test')) {
                return `${entry.eventIdentifier} (Test Methods)`;
            }
        }
        
        return `${entry.eventIdentifier} (General)`;
    }

    private static groupDML(entry: LogEntry): string {
        if (entry.additionalInfo.length > 0) {
            const dmlInfo = entry.additionalInfo.join(' ').toLowerCase();
            
            if (dmlInfo.includes('insert')) {
                return `${entry.eventIdentifier} (Insert)`;
            }
            
            if (dmlInfo.includes('update')) {
                return `${entry.eventIdentifier} (Update)`;
            }
            
            if (dmlInfo.includes('delete')) {
                return `${entry.eventIdentifier} (Delete)`;
            }
            
            if (dmlInfo.includes('upsert')) {
                return `${entry.eventIdentifier} (Upsert)`;
            }
            
            if (dmlInfo.includes('undelete')) {
                return `${entry.eventIdentifier} (Undelete)`;
            }
        }
        
        return `${entry.eventIdentifier} (General)`;
    }

    private static groupSOQL(entry: LogEntry): string {
        if (entry.additionalInfo.length > 0) {
            const queryInfo = entry.additionalInfo.join(' ').toLowerCase();
            
            // Extract object name from query
            const selectMatch = queryInfo.match(/select.*?from\s+(\w+)/);
            if (selectMatch) {
                const objectName = selectMatch[1];
                return `${entry.eventIdentifier} (${objectName})`;
            }
            
            if (queryInfo.includes('count()')) {
                return `${entry.eventIdentifier} (Count Queries)`;
            }
            
            if (queryInfo.includes('limit')) {
                return `${entry.eventIdentifier} (Limited Queries)`;
            }
            
            if (queryInfo.includes('order by')) {
                return `${entry.eventIdentifier} (Sorted Queries)`;
            }
        }
        
        return `${entry.eventIdentifier} (General)`;
    }

    private static groupHeapAllocate(entry: LogEntry): string {
        if (entry.additionalInfo.length > 0) {
            const allocInfo = entry.additionalInfo.join(' ');
            const bytesMatch = allocInfo.match(/Bytes:(\d+)/);
            
            if (bytesMatch) {
                const bytes = parseInt(bytesMatch[1], 10);
                
                if (bytes < 100) {
                    return 'HEAP_ALLOCATE (Small < 100B)';
                } else if (bytes < 1000) {
                    return 'HEAP_ALLOCATE (Medium < 1KB)';
                } else if (bytes < 10000) {
                    return 'HEAP_ALLOCATE (Large < 10KB)';
                } else {
                    return 'HEAP_ALLOCATE (Very Large 10KB+)';
                }
            }
        }
        
        return 'HEAP_ALLOCATE (Unknown Size)';
    }

    private static groupValidationRule(entry: LogEntry): string {
        if (entry.additionalInfo.length > 0) {
            const ruleInfo = entry.additionalInfo.join(' ');
            
            // Try to extract rule name or object
            const parts = ruleInfo.split('|');
            if (parts.length > 0) {
                const ruleName = parts[0].trim();
                if (ruleName && ruleName !== '[EXTERNAL]') {
                    return `VALIDATION_RULE (${ruleName})`;
                }
            }
        }
        
        return 'VALIDATION_RULE (General)';
    }

    private static groupWorkflow(entry: LogEntry): string {
        if (entry.additionalInfo.length > 0) {
            const workflowInfo = entry.additionalInfo.join(' ').toLowerCase();
            
            if (workflowInfo.includes('rule')) {
                return 'WORKFLOW (Rules)';
            }
            
            if (workflowInfo.includes('action')) {
                return 'WORKFLOW (Actions)';
            }
            
            if (workflowInfo.includes('field update')) {
                return 'WORKFLOW (Field Updates)';
            }
            
            if (workflowInfo.includes('email')) {
                return 'WORKFLOW (Email Alerts)';
            }
            
            if (workflowInfo.includes('task')) {
                return 'WORKFLOW (Tasks)';
            }
        }
        
        return 'WORKFLOW (General)';
    }

    /**
     * Get statistics about grouping effectiveness
     */
    public static getGroupingStats(originalGroups: GroupedLogEntry[], enhancedGroups: GroupedLogEntry[]): {
        originalGroupCount: number;
        enhancedGroupCount: number;
        averageEntriesPerGroup: number;
        largestGroupSize: number;
    } {
        const totalEntries = enhancedGroups.reduce((sum, group) => sum + group.count, 0);
        const largestGroup = enhancedGroups.reduce((max, group) => Math.max(max, group.count), 0);
        
        return {
            originalGroupCount: originalGroups.length,
            enhancedGroupCount: enhancedGroups.length,
            averageEntriesPerGroup: totalEntries / enhancedGroups.length,
            largestGroupSize: largestGroup
        };
    }
}

