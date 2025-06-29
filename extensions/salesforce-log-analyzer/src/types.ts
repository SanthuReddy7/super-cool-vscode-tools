// Types and interfaces for Salesforce log parsing

export interface LogEntry {
    timestamp: string;
    nanoseconds: number;
    eventIdentifier: string;
    additionalInfo: string[];
    rawLine: string;
    lineNumber?: number;
    logLevel?: string;
    message?: string;
}

export interface GroupedLogEntry {
    type: string;
    entries: LogEntry[];
    count: number;
}

export interface LogCategory {
    name: string;
    description: string;
    eventTypes: string[];
    groups: GroupedLogEntry[];
    totalEntries: number;
}

export enum LogCategoryType {
    SYSTEM_INFO = 'System Information',
    CODE_EXECUTION = 'Code Execution',
    DATABASE_OPERATIONS = 'Database Operations',
    MEMORY_MANAGEMENT = 'Memory Management',
    WORKFLOW_VALIDATION = 'Workflow & Validation',
    TRIGGERS = 'Triggers',
    CALLOUTS = 'Callouts',
    OTHER = 'Other'
}

export interface ParsedLog {
    categories: Map<LogCategoryType, LogCategory>;
    totalEntries: number;
    executionTime: number;
    apiVersion?: string;
    debugLevels?: string;
}

