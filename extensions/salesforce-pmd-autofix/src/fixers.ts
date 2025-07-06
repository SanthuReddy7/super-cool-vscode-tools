import * as vscode from 'vscode';

// --- Helper: Find class and method name for a given line (supports nested classes/methods) ---
function getClassAndMethodNameForLine(document: vscode.TextDocument, targetLine: number) {
    let classStack: string[] = [];
    let methodName: string | null = null;
    let braceStack: string[] = [];
    const classRegex = /\bclass\s+([A-Za-z0-9_]+)/;
    const methodRegex = /\b(public|private|protected|global)?\s*(static)?\s*\w+\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*[{;]?/;

    for (let i = 0; i <= targetLine; i++) {
        let line = document.lineAt(i).text.trim();
        const classMatch = line.match(classRegex);
        if (classMatch) {
            classStack.push(classMatch[1]);
            braceStack.push('{');
            continue;
        }
        const methodMatch = line.match(methodRegex);
        if (methodMatch && !line.startsWith('//') && !line.startsWith('*')) {
            methodName = methodMatch[3];
            braceStack.push('{');
            continue;
        }
        // Track braces
        if (line.includes('{')) braceStack.push('{');
        if (line.includes('}')) {
            let pop = braceStack.pop();
            if (pop === '{' && methodName) {
                methodName = null;
            } else if (pop === '{' && classStack.length > 0 && !methodName) {
                classStack.pop();
            }
        }
    }

    return {
        className: classStack.length > 0 ? classStack[classStack.length - 1] : "UnknownClass",
        methodName: methodName ? methodName : "UnknownMethod"
    };
}

// --- Helper: Given a variable name, look upwards in code to find its SObject type ---

function resolveSObjectType(document: vscode.TextDocument, varName: string, methodStart: number, lineIndex: number): string | null {
    const typePattern1 = new RegExp(`\\b([A-Za-z_][A-Za-z0-9_]*)\\s+${varName}\\b`);         // Account newAccount
    const typePattern2 = new RegExp(`List<([A-Za-z_][A-Za-z0-9_]*)>\\s+${varName}\\b`);      // List<Account> accounts
    const typePattern3 = new RegExp(`([A-Za-z_][A-Za-z0-9_]*)\\[\\]\\s+${varName}\\b`);      // Account[] accounts

    for (let j = lineIndex - 1; j >= methodStart; j--) {
        const line = document.lineAt(j).text;
        let match = line.match(typePattern2); if (match) return match[1];
        match = line.match(typePattern3);     if (match) return match[1];
        match = line.match(typePattern1);     if (match) return match[1];
    }
    return null;
}


// --- Helper: Find first non-comment line after method start (for insertion) ---
function findFirstNonCommentLine(document: vscode.TextDocument, methodStart: number): number {
    let i = methodStart + 1;
    while (i < document.lineCount) {
        const line = document.lineAt(i).text.trim();
        if (!line.startsWith('//') && !line.startsWith('*') && line.length > 0) {
            return i;
        }
        i++;
    }
    return methodStart + 1;
}

// --- Helper: Find method start (with comments/annotations) ---
function findMethodStart(document: vscode.TextDocument, lineNumber: number): number {
    for (let i = lineNumber; i >= 0; i--) {
        const line = document.lineAt(i).text.trim();
        if (
            (line.startsWith('public ') || line.startsWith('private ') ||
                line.startsWith('protected ') || line.startsWith('global ')) &&
            line.includes('(') && line.includes(')')
        ) {
            if (line.endsWith('{')) {
                return i;
            }
            // look ahead for brace
            let j = i + 1;
            while (j < document.lineCount && j <= i + 5) {
                const nextLine = document.lineAt(j).text.trim();
                if (nextLine === '{') {
                    return j;
                }
                if (nextLine.length > 0 && !nextLine.startsWith('//') && !nextLine.startsWith('/*') && !nextLine.startsWith('*')) {
                    break;
                }
                j++;
            }
        }
    }
    return 0;
}

// --- Main Fix Logic ---

export function applyFix(editor: vscode.TextEditor, violation: any): Promise<boolean> {
    console.log('applyFix called:', violation);
    return new Promise(async (resolve) => {
        let success = false;
        switch (violation.ruleName || violation.rule) {
            case 'UnusedLocalVariable':
                success = await fixUnusedLocalVariable(editor, violation);
                break;
            case 'EmptyCatchBlock':
                success = await fixEmptyCatchBlock(editor, violation);
                break;
            case 'ApexCRUDViolation':
            case 'ApexFLSViolation':
                console.log('calling fixCrudFlsViolation', violation);
                success = await fixCrudFlsViolation(editor, violation);
                break;
            default:
                vscode.window.showInformationMessage(`No autofix available for ${violation.ruleName}`);
                break;
        }
        if (!success) {
            console.error('applyFix failed', violation);
        }
        resolve(success);
    });
}


async function fixUnusedLocalVariable(editor: vscode.TextEditor, violation: any): Promise<boolean> {
    const lineNumber = violation.beginline - 1;
    if (lineNumber < 0 || lineNumber >= editor.document.lineCount) {
        vscode.window.showErrorMessage(`Invalid line number: ${lineNumber}`);
        return false;
    }
    const line = editor.document.lineAt(lineNumber);
    return editor.edit(editBuilder => {
        editBuilder.delete(line.rangeIncludingLineBreak);
    });
}

async function fixEmptyCatchBlock(editor: vscode.TextEditor, violation: any): Promise<boolean> {
    const document = editor.document;
    const range = new vscode.Range(
        new vscode.Position(violation.beginline - 1, violation.begincolumn - 1),
        new vscode.Position(violation.endline - 1, violation.endcolumn - 1)
    );
    const line = document.lineAt(range.start.line);
    const text = line.text;

    const openBraceIndex = text.indexOf('{', range.start.character);
    const closeBraceIndex = text.indexOf('}', openBraceIndex);

    if (openBraceIndex !== -1 && closeBraceIndex !== -1) {
        const newText = text.substring(0, openBraceIndex + 1) + " System.debug('An empty catch block was found.'); " + text.substring(closeBraceIndex);
        return editor.edit(editBuilder => {
            editBuilder.replace(line.range, newText);
        });
    }
    return false;
}

// --- CRUD/FLS Smart Fixer ---
export async function fixCrudFlsViolation(editor: vscode.TextEditor, violation: any): Promise<boolean> {
    try{
        console.log('fixCrudFlsViolation called', violation);
    const document = editor.document;
    const lineNumber = violation.beginline - 1;

    // Find context
    const { className, methodName } = getClassAndMethodNameForLine(document, lineNumber);

    // Find method boundaries
    const methodStart = findMethodStart(document, lineNumber);
    const methodEnd = (() => {
        const startIndent = document.lineAt(methodStart).firstNonWhitespaceCharacterIndex;
        for (let i = methodStart + 1; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            if (line.text.trim() === '}' && line.firstNonWhitespaceCharacterIndex <= startIndent) {
                return i;
            }
        }
        return document.lineCount - 1;
    })();

    // Try to extract SObject and permission
    let sObj: string | null = null;
    let perm: string | null = null;
    if (violation.sObject && violation.permission) {
        sObj = violation.sObject;
        perm = violation.permission;
    } else if (violation.description) {
        let p = violation.description.match(/([A-Za-z_][A-Za-z0-9_]*)\s+needs\s+(read|create|update|delete)/i);
        if (p) {
            sObj = p[1];
            const permMap = {
                read: 'isAccessible',
                create: 'isCreateable',
                update: 'isUpdateable',
                delete: 'isDeletable'
            } as const;
            type PermKey = keyof typeof permMap;
            const key = (p[2]?.toLowerCase() ?? '') as string;
            if (key in permMap) {
                perm = permMap[key as PermKey];
            } else {
                perm = null;
            }
        } else {
            let soqlMatch = violation.description.match(/([A-Za-z_][A-Za-z0-9_]*)\.(isAccessible|isCreateable|isUpdateable|isDeletable)/);
            if (soqlMatch) {
                sObj = soqlMatch[1];
                perm = soqlMatch[2];
            }
        }
    }

    if (!sObj || !perm) {
        // Try to infer from code line at violation
        const codeLine = document.lineAt(lineNumber).text;
        let matched = false;

        // INSERT
        let insertMatch = codeLine.match(/insert\s+(new\s+)?([A-Za-z_][A-Za-z0-9_]*)/i);
        if (insertMatch) {
            let varOrType = insertMatch[2];
            if (varOrType[0] === varOrType[0].toLowerCase()) {
                // Looks like a variable, try to resolve its type
                const resolved = resolveSObjectType(document, varOrType, methodStart, lineNumber);
                sObj = resolved ?? varOrType;
            } else {
                // It's a type (Account, Opportunity, etc)
                sObj = varOrType;
            }
            perm = 'isCreateable';
            matched = true;
        }

        // UPDATE
        let updateMatch = codeLine.match(/update\s+([A-Za-z_][A-Za-z0-9_]*)/i);
        if (updateMatch) {
            let varOrType = updateMatch[1];
            if (varOrType[0] === varOrType[0].toLowerCase()) {
                const resolved = resolveSObjectType(document, varOrType, methodStart, lineNumber);
                sObj = resolved ?? varOrType;
            } else {
                sObj = varOrType;
            }
            perm = 'isUpdateable';
            matched = true;
        }

        // DELETE
        let deleteMatch = codeLine.match(/delete\s+([A-Za-z_][A-Za-z0-9_]*)/i);
        if (deleteMatch) {
            let varOrType = deleteMatch[1];
            if (varOrType[0] === varOrType[0].toLowerCase()) {
                const resolved = resolveSObjectType(document, varOrType, methodStart, lineNumber);
                sObj = resolved ?? varOrType;
            } else {
                sObj = varOrType;
            }
            perm = 'isDeletable';
            matched = true;
        }

        // SOQL
        let soqlMatch = codeLine.match(/SELECT.*FROM\s+([A-Za-z_][A-Za-z0-9_]*)/i);
        if (soqlMatch) {
            sObj = soqlMatch[1];
            perm = 'isAccessible';
            matched = true;
        }

        if (!matched) {
            vscode.window.showWarningMessage('Could not determine SObject and permission from violation or code line.');
            console.error('fixCrudFlsViolation: unable to detect sObj/perm', { violation, codeLine });
            return false;
        }
    }


    const newCheck = `!Schema.sObjectType.${sObj}.${perm}()`;

    // Look for existing SCA check block
    let scaCommentLine = -1, ifLineNum = -1, oldCondition = '';
    for (let i = methodStart + 1; i <= methodEnd; i++) {
        const line = document.lineAt(i).text;
        if (line.match(/^\s*\/\/\s*SCA fix for/i)) {
            scaCommentLine = i;
            // Find next non-comment line which should be the if block
            for (let j = i + 1; j <= methodEnd; j++) {
                let next = document.lineAt(j).text;
                if (next.trim().startsWith("if (")) {
                    ifLineNum = j;
                    oldCondition = next.match(/if\s*\((.*)\)\s*{/)?.[1] ?? '';
                    break;
                }
            }
            break;
        }
    }

    if (ifLineNum >= 0) {
        // Parse/merge conditions, deduplicate, and rebuild
        let conditions = oldCondition.split('||').map(x => x.trim()).filter(x => x.length > 0);
        if (conditions.includes(newCheck)) {
            vscode.window.showInformationMessage('Nothing to fix: Permission already checked.');
            return false;
        }
        conditions.push(newCheck);
        // Rebuild and update
        const updatedCondition = conditions.join(' || ');
        const newIfLine = `if (${updatedCondition}) {`;
        return editor.edit(editBuilder => {
            editBuilder.replace(document.lineAt(ifLineNum).range, newIfLine);
        }).then(success => {
            if (!success) {
                vscode.window.showErrorMessage('VS Code edit operation failed!');
                return false;
            }
            return true;
        });
   
    } else {
        // No SCA check block, so insert new at top of method
        const checkCode = `// SCA fix for ${className}.${methodName}
if (${newCheck}) {
    throw new System.NoAccessException('Access to one or more SObjects is not allowed.');
}
`;
        // Insert after first non-comment/annotation after method start
        const insertLine = findFirstNonCommentLine(document, methodStart);
        return editor.edit(editBuilder => {
            editBuilder.insert(new vscode.Position(insertLine, 0), checkCode);
        }).then(success => {
            if (!success) vscode.window.showErrorMessage('Edit failed');
            return success;
        });
    }
}catch(err){
        vscode.window.showErrorMessage('fixCrudFlsViolation exception: ' + (err as Error).message);
        console.error('fixCrudFlsViolation exception:', err);
        return false;
    }
}
