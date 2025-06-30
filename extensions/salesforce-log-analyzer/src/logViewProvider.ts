import * as vscode from 'vscode';
import { ParsedLog, LogCategoryType } from './types';
import { SalesforceLogParser } from './logParser';

export class LogViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'salesforceLogAnalyzerView';

    private _view?: vscode.WebviewView;
    private _parsedLog?: ParsedLog;
    private _fileName?: string;
    private _filePath?: string;
    private _logDatetime?: string;
    private _viewedDate?: string;

    private _context?: vscode.ExtensionContext;

    constructor(private readonly _extensionUri: vscode.Uri, context?: vscode.ExtensionContext) {
        if (context) {
            this.setContext(context);
        }
    }

    public setContext(context: vscode.ExtensionContext) {
        this._context = context;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.type) {
                    case 'toggleAccordion':
                        this._handleToggleAccordion(message.categoryType);
                        break;
                    case 'showLogEntry':
                        this._handleShowLogEntry(message.entryIndex, message.categoryType, message.groupType);
                        break;
                    case 'deleteLog':
                        await this._deleteCurrentLog();
                        break;
                    case 'requestLogData':
                        this._sendCurrentLogToWebview();
                        break;
                    case 'openLogFile':
                        if (message.filePath) {
                            const fileUri = vscode.Uri.file(message.filePath);
                            try {
                                await vscode.window.showTextDocument(fileUri);
                            } catch (e) {
                                vscode.window.showWarningMessage('Could not open log file: ' + e);
                            }
                        }
                        break;
                }
            },
            undefined,
            []
        );

        this._restoreCurrentLog();
    }

    private _restoreCurrentLog() {
        if (this._context) {
            const savedLog = this._context.globalState.get<{ name: string; content: string; path?: string, logDatetime?: string, viewed?: string }>('currentLog');
            if (savedLog) {
                const parser = new SalesforceLogParser();
                const parsedLog = parser.parseLog(savedLog.content);
                this._parsedLog = parsedLog;
                this._fileName = savedLog.name;
                this._filePath = savedLog.path;
                this._logDatetime = savedLog.logDatetime;
                this._viewedDate = savedLog.viewed;
                this.updateLogData(parsedLog, savedLog.name, savedLog.path, savedLog.logDatetime, savedLog.viewed);
            } else {
                if (this._view) {
                    this._view.webview.postMessage({ type: 'clearLog' });
                }
            }
        }
    }

    private async _deleteCurrentLog() {
        if (this._context) {
            await this._context.globalState.update('currentLog', undefined);
        }
        this._parsedLog = undefined;
        this._fileName = undefined;
        this._filePath = undefined;
        this._logDatetime = undefined;
        this._viewedDate = undefined;
        if (this._view) {
            this._view.webview.postMessage({ type: 'clearLog' });
        }
    }

    public extractFirstTimestamp(logContent: string): string | undefined {
        const line = logContent.split('\n').find(l => /^\d{2}:\d{2}:\d{2}\.\d{1,3}/.test(l));
        if (!line) return undefined;
        const m = line.match(/^(\d{2}:\d{2}:\d{2}\.\d{1,3})/);
        return m ? m[1] : undefined;
    }

    public updateLogData(parsedLog: ParsedLog, fileName: string, filePath?: string, logDatetime?: string, viewed?: string) {
        this._parsedLog = parsedLog;
        this._fileName = fileName;
        this._filePath = filePath;
        this._logDatetime = logDatetime;
        this._viewedDate = viewed;

        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateLogData',
                data: {
                    parsedLog: this._serializeParsedLog(parsedLog),
                    fileName,
                    filePath,
                    logDatetime,
                    viewed
                }
            });
        }
    }

    private _handleToggleAccordion(categoryType: string) {
        console.log(`Toggling accordion for category: ${categoryType}`);
    }

    private _handleShowLogEntry(entryIndex: number, categoryType: string, groupType: string) {
        if (!this._parsedLog) { return; };
        const category = this._parsedLog.categories.get(categoryType as LogCategoryType);
        if (!category) { return; };
        const group = category.groups.find(g => g.type === groupType);
        if (!group || entryIndex >= group.entries.length) { return; };
        const entry = group.entries[entryIndex];
        vscode.workspace.openTextDocument({
            content: entry.rawLine,
            language: 'log'
        }).then(doc => {
            vscode.window.showTextDocument(doc);
        });
    }

    private _sendCurrentLogToWebview() {
        if (!this._view) { return; };
        if (this._parsedLog && this._fileName) {
            this._view.webview.postMessage({
                type: 'updateLogData',
                data: {
                    parsedLog: this._serializeParsedLog(this._parsedLog),
                    fileName: this._fileName,
                    filePath: this._filePath,
                    logDatetime: this._logDatetime,
                    viewed: this._viewedDate
                }
            });
        } else if (this._context) {
            const savedLog = this._context.globalState.get<{ name: string; content: string; path?: string, logDatetime?: string, viewed?: string }>('currentLog');
            if (savedLog) {
                const parser = new SalesforceLogParser();
                const parsedLog = parser.parseLog(savedLog.content);
                this._parsedLog = parsedLog;
                this._fileName = savedLog.name;
                this._filePath = savedLog.path;
                this._logDatetime = savedLog.logDatetime;
                this._viewedDate = savedLog.viewed;

                this._view.webview.postMessage({
                    type: 'updateLogData',
                    data: {
                        parsedLog: this._serializeParsedLog(parsedLog),
                        fileName: savedLog.name,
                        filePath: savedLog.path,
                        logDatetime: savedLog.logDatetime,
                        viewed: savedLog.viewed
                    }
                });
            } else {
                this._view.webview.postMessage({ type: 'clearLog' });
            }
        }
    }

    private _serializeParsedLog(parsedLog: ParsedLog): any {
        const serialized = {
            totalEntries: parsedLog.totalEntries,
            executionTime: parsedLog.executionTime,
            apiVersion: parsedLog.apiVersion,
            debugLevels: parsedLog.debugLevels,
            categories: {} as any
        };
        for (const [categoryType, category] of parsedLog.categories) {
            if (category.totalEntries > 0) {
                serialized.categories[categoryType] = {
                    name: category.name,
                    description: category.description,
                    eventTypes: category.eventTypes,
                    totalEntries: category.totalEntries,
                    groups: category.groups.map(group => ({
                        type: group.type,
                        count: group.count,
                        entries: group.entries.map(entry => ({
                            timestamp: entry.timestamp,
                            nanoseconds: entry.nanoseconds,
                            eventIdentifier: entry.eventIdentifier,
                            additionalInfo: entry.additionalInfo,
                            lineNumber: entry.lineNumber,
                            logLevel: entry.logLevel,
                            message: entry.message,
                            rawLine: entry.rawLine
                        }))
                    }))
                };
            }
        }
        return serialized;
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Salesforce Log Analyzer</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 16px;
            line-height: 1.4;
        }

        .header {
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .header h2 {
            margin: 0 0 8px 0;
            color: var(--vscode-foreground);
            font-size: 18px;
            font-weight: 600;
        }

        .summary {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin: 4px 0;
        }

        .accordion {
            margin-bottom: 8px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            overflow: hidden;
        }

        .accordion-header {
            background-color: var(--vscode-list-hoverBackground);
            padding: 12px 16px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background-color 0.2s ease;
            user-select: none;
        }

        .accordion-header:hover {
            background-color: var(--vscode-list-activeSelectionBackground);
        }
        .accordion-header:hover .accordion-title {
            color: #FFFFFF !important;       /* Hover text: black */
            font-weight: bold !important; /* Hover text: bold */
        }

        .accordion-header.active {
            background-color: var(--vscode-list-activeSelectionBackground);
        }

        .accordion-title {
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .accordion-count {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
        }

        .accordion-icon {
            transition: transform 0.2s ease;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }

        .accordion-header.active .accordion-icon {
            transform: rotate(90deg);
        }
        
         .accordion-header.active .accordion-title {
            color: #FFFFFF !important;       /* Hover text: black */
            font-weight: bold !important; /* Hover text: bold */
        }

        .accordion-content {
            display: none;
            padding: 0;
            background-color: var(--vscode-editor-background);
        }

        .accordion-content.active {
            display: block;
        }

        .category-description {
            padding: 12px 16px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            background-color: var(--vscode-textBlockQuote-background);
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .log-group {
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .log-group:last-child {
            border-bottom: none;
        }

        .log-group-header {
            padding: 10px 16px;
            background-color: var(--vscode-list-inactiveSelectionBackground);
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background-color 0.2s ease;
        }

        .log-group-header:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .log-group-title {
            font-family: var(--vscode-editor-font-family);
            font-size: 13px;
            color: var(--vscode-foreground);
            font-weight: 500;
        }

        .log-group-count {
            background-color: var(--vscode-inputValidation-infoBorder);
            color: #FFFFFF !important;       /* Hover text: black */
            padding: 1px 6px;
            border-radius: 8px;
            font-size: 10px;
            font-weight: 500;
        }

        .log-entries {
            display: none;
            max-height: 300px;
            overflow-y: auto;
        }

        .log-entries.active {
            display: block;
        }

        .log-entry {
            padding: 8px 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
            cursor: pointer;
            transition: background-color 0.2s ease;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
        }

        .log-entry:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .log-entry:last-child {
            border-bottom: none;
        }

        .log-timestamp {
            color: var(--vscode-descriptionForeground);
            font-weight: 500;
        }

        .log-event {
            color: var(--vscode-symbolIcon-functionForeground);
            font-weight: 600;
            margin: 0 8px;
        }

        .log-message {
            color: var(--vscode-foreground);
            word-break: break-all;
        }

        .log-level {
            color: var(--vscode-symbolIcon-keywordForeground);
            font-weight: 500;
            margin-right: 8px;
        }

        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
        }

        .empty-state h3 {
            margin: 0 0 8px 0;
            color: var(--vscode-foreground);
        }

        .empty-state p {
            margin: 0;
            font-size: 14px;
        }

        .scrollbar {
            scrollbar-width: thin;
            scrollbar-color: var(--vscode-scrollbarSlider-background) transparent;
        }

        .scrollbar::-webkit-scrollbar {
            width: 8px;
        }

        .scrollbar::-webkit-scrollbar-track {
            background: transparent;
        }

        .scrollbar::-webkit-scrollbar-thumb {
            background-color: var(--vscode-scrollbarSlider-background);
            border-radius: 4px;
        }

        .scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: var(--vscode-scrollbarSlider-hoverBackground);
        }
    </style>
</head>
<body>
    <div id="app">
        <div class="empty-state">
            <h3>No Log Data</h3>
            <p>Use "Analyze Salesforce Log File" command to load a debug log for analysis.</p>
        </div>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        vscode.postMessage({ type: 'requestLogData' });

        let currentLogData = null;

        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'updateLogData':
                    currentLogData = message.data;
                    renderLogData(message.data);
                    break;
                case 'clearLog':
                    renderEmpty();
                    break;
            }
        });

        function renderEmpty() {
            document.getElementById('app').innerHTML = \`
                <div class="empty-state">
                    <h3>No Log Data</h3>
                    <p>Use "Analyze Salesforce Log File" command to load a debug log for analysis.</p>
                </div>
            \`;
        }

        function renderLogData(data) {
            const app = document.getElementById('app');
            const { parsedLog, fileName, filePath, logDatetime, viewed } = data;

            if (!parsedLog || parsedLog.totalEntries === 0) {
                app.innerHTML = \`
                    <div class="empty-state">
                        <h3>No Log Entries Found</h3>
                        <p>The selected file does not contain valid Salesforce debug log entries.</p>
                    </div>
                \`;
                return;
            }

            const categoriesArray = Object.entries(parsedLog.categories)
                .filter(([_, category]) => category.totalEntries > 0)
                .sort(([_, a], [__, b]) => b.totalEntries - a.totalEntries);

            app.innerHTML = \`
                <div class="header">
                    <h2>
                      📊 
                      \${filePath
                        ? '<span id="fileNameLink" style="cursor:pointer;color:#0066cc;text-decoration:underline;">' + fileName + '</span>'
                        : fileName
                      }
                    </h2>
                    \${logDatetime ? '<div style="margin-bottom:4px;"><strong>Log Time:</strong> ' + logDatetime + '</div>' : ''}
                    \${viewed ? '<div style="margin-bottom:8px;"><strong>Viewed:</strong> ' + viewed + '</div>' : ''}
                    <button id="deleteLogBtn" title="Delete Log" style="float:right;font-size:1.2em;">🗑️</button>
                    <div class="summary">
                        <div>📈 Total Entries: <strong>\${parsedLog.totalEntries.toLocaleString()}</strong></div>
                        <div>⏱️ Execution Time: <strong>\${parsedLog.executionTime.toFixed(2)}ms</strong></div>
                        \${parsedLog.apiVersion ? \`<div>🔧 API Version: <strong>\${parsedLog.apiVersion}</strong></div>\` : ''}
                        <div>📂 Categories: <strong>\${categoriesArray.length}</strong></div>
                    </div>
                </div>
                <div class="accordions">
                    \${categoriesArray.map(([categoryType, category]) => \`
                        <div class="accordion">
                            <div class="accordion-header" onclick="toggleAccordion('\${categoryType}')">
                                <div>
                                    <div class="accordion-title">\${category.name}</div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span class="accordion-count">\${category.totalEntries}</span>
                                    <span class="accordion-icon">▶</span>
                                </div>
                            </div>
                            <div class="accordion-content" id="accordion-\${categoryType}">
                                <div class="category-description">
                                    \${category.description}
                                </div>
                                \${category.groups.map(group => \`
                                    <div class="log-group">
                                        <div class="log-group-header" onclick="toggleLogGroup('\${categoryType}', '\${group.type}')">
                                            <span class="log-group-title">\${group.type}</span>
                                            <span class="log-group-count">\${group.count}</span>
                                        </div>
                                        <div class="log-entries scrollbar" id="entries-\${categoryType}-\${group.type}">
                                            \${group.entries.slice(0, 50).map((entry, index) => \`
                                                <div class="log-entry" onclick="showLogEntry(\${index}, '\${categoryType}', '\${group.type}')">
                                                    <span class="log-timestamp">\${entry.timestamp}</span>
                                                    <span class="log-event">\${entry.eventIdentifier}</span>
                                                    \${entry.logLevel ? \`<span class="log-level">[\${entry.logLevel}]</span>\` : ''}
                                                    \${entry.message ? \`<span class="log-message">\${entry.message}</span>\` : ''}
                                                    \${!entry.message && entry.additionalInfo.length > 0 ? \`<span class="log-message">\${entry.additionalInfo.join(' | ')}</span>\` : ''}
                                                </div>
                                            \`).join('')}
                                            \${group.entries.length > 50 ? \`
                                                <div class="log-entry" style="text-align: center; font-style: italic; color: var(--vscode-descriptionForeground);">
                                                    ... and \${group.entries.length - 50} more entries
                                                </div>
                                            \` : ''}
                                        </div>
                                    </div>
                                \`).join('')}
                            </div>
                        </div>
                    \`).join('')}
                </div>
            \`;

            document.getElementById('deleteLogBtn').onclick = () => vscode.postMessage({ type: 'deleteLog' });

            // Add file open handler
            if (filePath) {
                const fileNameLink = document.getElementById('fileNameLink');
                if (fileNameLink) {
                    fileNameLink.onclick = () => vscode.postMessage({ type: 'openLogFile', filePath });
                }
            }
        }

        // Accordion logic
        function toggleAccordion(categoryType) {
            const header = document.querySelector(\`[onclick="toggleAccordion('\${categoryType}')"]\`);
            const content = document.getElementById(\`accordion-\${categoryType}\`);
            header.classList.toggle('active');
            content.classList.toggle('active');
            vscode.postMessage({ type: 'toggleAccordion', categoryType: categoryType });
        }
        function toggleLogGroup(categoryType, groupType) {
            const entries = document.getElementById(\`entries-\${categoryType}-\${groupType}\`);
            entries.classList.toggle('active');
        }
        function showLogEntry(entryIndex, categoryType, groupType) {
            vscode.postMessage({ type: 'showLogEntry', entryIndex: entryIndex, categoryType: categoryType, groupType: groupType });
        }
    </script>
</body>
</html>
        `;
    }
}
