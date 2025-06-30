import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SalesforceLogParser } from './logParser';
import { LogViewProvider } from './logViewProvider';

export function activate(context: vscode.ExtensionContext) {
    const logParser = new SalesforceLogParser();
    const logViewProvider = new LogViewProvider(context.extensionUri, context);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(LogViewProvider.viewType, logViewProvider)
    );

    // Command: Analyze Salesforce Log File
    const analyzeLogCommand = vscode.commands.registerCommand('salesforce-log-analyzer.analyzeLog', async () => {
        try {
            const fileUri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'Log files': ['log', 'txt'],
                    'All files': ['*']
                },
                openLabel: 'Select Salesforce Debug Log'
            });

            if (!fileUri || fileUri.length === 0) { return; }
            const logFilePath = fileUri[0].fsPath;

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Analyzing Salesforce Debug Log",
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: "Reading log file..." });

                const logContent = fs.readFileSync(logFilePath, 'utf8');
                progress.report({ increment: 50, message: "Parsing log entries..." });

                const parsedLog = logParser.parseLog(logContent);
                progress.report({ increment: 90, message: "Generating analysis view..." });

                const logDatetime = logViewProvider.extractFirstTimestamp(logContent); // <---- new
                const viewed = new Date().toISOString().split('T')[0];

                // Update view and persist log (SAVE PATH, LOG TIME, VIEWED!)
                logViewProvider.updateLogData(parsedLog, path.basename(logFilePath), logFilePath, logDatetime, viewed);
                await context.globalState.update('currentLog', {
                    name: path.basename(logFilePath),
                    content: logContent,
                    path: logFilePath,
                    logDatetime: logDatetime,
                    viewed: viewed
                });

                progress.report({ increment: 100, message: "Analysis complete!" });
                vscode.window.showInformationMessage(
                    `Log analysis complete! Found ${parsedLog.totalEntries} entries across ${Array.from(parsedLog.categories.values()).filter(c => c.totalEntries > 0).length} categories.`
                );
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error analyzing log file: ${error}`);
        }
    });

    // Command: Analyze current editor file
    const analyzeCurrentFileCommand = vscode.commands.registerCommand('salesforce-log-analyzer.analyzeCurrentFile', async () => {
        try {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                vscode.window.showWarningMessage('No file is currently open.');
                return;
            }
            const document = activeEditor.document;
            const logContent = document.getText();
            if (!logContent.trim()) {
                vscode.window.showWarningMessage('The current file is empty.');
                return;
            }
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Analyzing Current File as Salesforce Debug Log",
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: "Parsing log entries..." });

                const parsedLog = logParser.parseLog(logContent);
                progress.report({ increment: 90, message: "Generating analysis view..." });
                const logDatetime = logViewProvider.extractFirstTimestamp(logContent); // <---- new
                const viewed = new Date().toISOString().split('T')[0];

                // Use document.fileName as filePath if the file is saved, otherwise undefined
                const isUntitled = document.isUntitled || !document.fileName;
                logViewProvider.updateLogData(
                    parsedLog,
                    path.basename(document.fileName),
                    !isUntitled ? document.fileName : undefined,
                    logDatetime,
                    viewed
                );

                // Persist log (add file path if not untitled)
                await context.globalState.update('currentLog', {
                    name: path.basename(document.fileName),
                    content: logContent,
                    path: !isUntitled ? document.fileName : undefined,
                    logDatetime: logDatetime,
                    viewed: viewed
                });

                progress.report({ increment: 100, message: "Analysis complete!" });
                vscode.window.showInformationMessage(
                    `Log analysis complete! Found ${parsedLog.totalEntries} entries across ${Array.from(parsedLog.categories.values()).filter(c => c.totalEntries > 0).length} categories.`
                );
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error analyzing current file: ${error}`);
        }
    });

    // Command: Analyze clipboard content
    const analyzeClipboardCommand = vscode.commands.registerCommand('salesforce-log-analyzer.analyzeClipboard', async () => {
        try {
            const clipboardContent = await vscode.env.clipboard.readText();
            if (!clipboardContent.trim()) {
                vscode.window.showWarningMessage('Clipboard is empty or contains no text.');
                return;
            }
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Analyzing Clipboard Content as Salesforce Debug Log",
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: "Reading clipboard content..." });

                if (!clipboardContent.includes('|') || !clipboardContent.match(/\d{2}:\d{2}:\d{2}\.\d{3}/)) {
                    vscode.window.showWarningMessage('Clipboard content does not appear to be a valid Salesforce debug log format.');
                    return;
                }

                progress.report({ increment: 50, message: "Parsing log entries..." });
                const parsedLog = logParser.parseLog(clipboardContent);

                if (parsedLog.totalEntries === 0) {
                    vscode.window.showWarningMessage('No valid Salesforce debug log entries found in clipboard content.');
                    return;
                }

                progress.report({ increment: 90, message: "Generating analysis view..." });
                const logDatetime = logViewProvider.extractFirstTimestamp(clipboardContent);
                const viewed = new Date().toISOString().split('T')[0];

                logViewProvider.updateLogData(parsedLog, 'Clipboard Content', undefined, logDatetime, viewed);

                // Persist log (no file path)
                await context.globalState.update('currentLog', {
                    name: 'Clipboard Content',
                    content: clipboardContent,
                    logDatetime: logDatetime,
                    viewed: viewed
                });

                progress.report({ increment: 100, message: "Analysis complete!" });
                vscode.window.showInformationMessage(
                    `Clipboard log analysis complete! Found ${parsedLog.totalEntries} entries across ${Array.from(parsedLog.categories.values()).filter(c => c.totalEntries > 0).length} categories.`
                );
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Error analyzing clipboard content: ${error}`);
        }
    });

    context.subscriptions.push(analyzeLogCommand, analyzeCurrentFileCommand, analyzeClipboardCommand);

    logViewProvider.setContext(context);
}

export function deactivate() {}
