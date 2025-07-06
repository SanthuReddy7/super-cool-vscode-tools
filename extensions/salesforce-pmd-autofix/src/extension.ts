import * as vscode from 'vscode';
import { runPmd } from './pmdRunner';
import { applyFix } from './fixers';
import { SidebarProvider } from './sidebarProvider';
import * as path from 'path';

let sidebarProvider: SidebarProvider;
let isRunning = false;

const outputChannel = vscode.window.createOutputChannel('Apex SCA Autofix');
const diagnosticCollection = vscode.languages.createDiagnosticCollection('apexScaAutofix');


let globalExtensionContext: vscode.ExtensionContext;


export async  function activate(context: vscode.ExtensionContext) {
globalExtensionContext = context;

    const sessionKey = 'apexScaAutofix.sessionActive';
    const lastSession = context.workspaceState.get<boolean>(sessionKey);

    // 🧹 Clear violations from the previous session
    if (!lastSession) {
        await context.workspaceState.update('apexScaAutofix.violationsMap', {});
    }

    // ✅ Mark session as active for this run
    await context.globalState.update(sessionKey, true);

     sidebarProvider = new SidebarProvider(context.extensionUri, context);


    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebarProvider)
    );

    vscode.workspace.onDidSaveTextDocument(document => {
        if (isApexFile(document)) {
            runSca(document, context);
        }
    });

    vscode.workspace.onDidCloseTextDocument(doc => {
        diagnosticCollection.delete(doc.uri);
    });

    vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor && isApexFile(editor.document)) {
        const activePath = editor.document.fileName;
        const violationsMap = context.workspaceState.get<Record<string, any[]>>('apexScaAutofix.violationsMap', {});
        // if (violationsMap[activePath]) {
            sidebarProvider.expandFileAccordion(activePath); // 👈 you’ll define this
        // }

            // Always post the message, whether or not the file has violations
        // const hasViolations = !!violationsMap[activePath];
        // sidebarProvider.postActiveFileChanged(activePath, hasViolations);

    }
});


    context.subscriptions.push(
        vscode.commands.registerCommand('salesforce-pmd-autofix.fixViolation', async (violation: any) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) return;
            const success = await applyFix(editor, violation);
            if (success) {
                await editor.document.save();
                runSca(editor.document, context);
            }
        }),

        vscode.commands.registerCommand('salesforce-pmd-autofix.selectRuleset', async () => {
            const fileUri = await vscode.window.showOpenDialog({
                canSelectMany: false,
                openLabel: 'Select PMD Ruleset',
                filters: { 'XML files': ['xml'] }
            });
            if (fileUri?.[0]) {
                context.workspaceState.update('apexScaAutofix.customRuleset', fileUri[0].fsPath);
                vscode.window.showInformationMessage(`Custom ruleset selected: ${path.basename(fileUri[0].fsPath)}`);
            }
        })
    );
}

function isApexFile(document: vscode.TextDocument): boolean {
    return document.languageId === 'apex' ||
        document.fileName.endsWith('.cls') ||
        document.fileName.endsWith('.apex');
}

async function runSca(document: vscode.TextDocument, context: vscode.ExtensionContext) {
    if (isRunning) return;
    isRunning = true;

    
    try {
        outputChannel.clear();
        outputChannel.appendLine('Running SCA Analysis...');

        const filePath = document.fileName;
        const output = await runPmd(filePath, context);
        const pmdResults = JSON.parse(output);

        const allViolations: any[] = [];
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

        if (pmdResults.files?.length > 0) {
            for (const fileEntry of pmdResults.files) {
                const rawPath = decodeURIComponent(fileEntry.filename || '').trim();
                const absolutePath = path.isAbsolute(rawPath)
                    ? path.normalize(rawPath)
                    : path.resolve(workspaceRoot, rawPath);

                for (const violation of fileEntry.violations || []) {
                    allViolations.push({
                        rule: violation.rule,
                        description: violation.description || violation.message,
                        beginline: Number(violation.beginline),
                        begincolumn: Number(violation.begincolumn),
                        method: violation.method || 'Unknown Method',
                        filePath: absolutePath
                    });
                }
            }
        }

        const violationsMap = context.workspaceState.get<Record<string, any[]>>('apexScaAutofix.violationsMap', {});
        if (allViolations.length > 0) {
            violationsMap[document.fileName] = allViolations;
        } else {
            delete violationsMap[document.fileName];
        }

        context.workspaceState.update('apexScaAutofix.violationsMap', violationsMap);
        sidebarProvider.updateViolations(violationsMap);
    } catch (err) {
        outputChannel.appendLine(`❌ Failed to run PMD: ${err}`);
    } finally {
        isRunning = false;
    }
}

export async function deactivate() {
    const sessionKey = 'apexScaAutofix.sessionActive';
    const ext = vscode.extensions.getExtension('supercooltools.salesforce-pmd-autofix');
    const context = ext?.exports?.context;

    if (context) {
        await context.globalState.update(sessionKey, false);
    }
    if (sidebarProvider?._diagnostics) {
    sidebarProvider._diagnostics.clear();
    sidebarProvider._diagnostics.dispose();
  }
}


