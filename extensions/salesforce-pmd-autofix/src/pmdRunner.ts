import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export async function runPmd(filePath: string, context: vscode.ExtensionContext): Promise<string> {
    const config = vscode.workspace.getConfiguration('apexScaAutofix');
    const pmdPath = config.get<string>('pmdPath'); // e.g., C:\tools\pmd\bin\pmd.bat

    if (!pmdPath || !fs.existsSync(pmdPath)) {
        const action = 'Open Settings';
        vscode.window.showWarningMessage(
            'PMD CLI path is not set or invalid. Please set "apexScaAutofix.pmdPath" in settings.',
            action
        ).then(selection => {
            if (selection === action) {
                vscode.commands.executeCommand('workbench.action.openSettings', 'apexScaAutofix.pmdPath');
            }
        });
        throw new Error('PMD path not configured or invalid.');
    }

    const rulesetPath = path.join(context.extensionPath, 'rulesets', 'apex_ruleset.xml');
    if (!fs.existsSync(rulesetPath)) {
        throw new Error(`Default ruleset not found: ${rulesetPath}`);
    }

    const fileListPath = path.join(os.tmpdir(), `pmd_filelist_${Date.now()}.txt`);
    fs.writeFileSync(fileListPath, filePath, 'utf8');

    const args = [
        'check',
        '--file-list', `"${fileListPath}"`,
        '--format', 'json',
        '--rulesets', `"${rulesetPath}"`
    ];

    const isWindows = process.platform === 'win32';
    const command = isWindows && !pmdPath.endsWith('.bat') ? `${pmdPath}.bat` : pmdPath;

    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, { shell: true });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('error', (err) => {
            fs.unlinkSync(fileListPath);
            reject(new Error(`PMD process failed: ${err.message}`));
        });

        proc.on('close', (code) => {


            fs.unlinkSync(fileListPath);
                        console.log('[PMD OUTPUT]', stdout);
console.log('[PMD EXIT CODE]', code);
console.log('[PMD STDERR]', stderr);
            if (code === 0 || code === 4) {
                
                resolve(stdout);
            } else {
                reject(new Error(`PMD exited with code ${code}: ${stderr || stdout}`));
            }
        });
    });
}
