import * as vscode from 'vscode';
import * as path from 'path';

const highlightDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(255, 255, 0, 0.3)'
});

// const diagnostics = vscode.languages.createDiagnosticCollection('apexScaAutofix');


export class SidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'apexScaAutofix.sidebar';
    private _view?: vscode.WebviewView;
    public _diagnostics: vscode.DiagnosticCollection;


    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext,
    ) {
        this._diagnostics = vscode.languages.createDiagnosticCollection('apexScaAutofix')

    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'fixViolation':
                    vscode.commands.executeCommand('salesforce-pmd-autofix.fixViolation', data.violation);
                    break;
                case 'fixAllViolations':
                    vscode.commands.executeCommand('salesforce-pmd-autofix.fixAllViolations');
                    break;
                case 'fixAllOfType':
                    vscode.commands.executeCommand('salesforce-pmd-autofix.fixAllOfType', data.ruleType);
                    break;
                case 'selectRuleset':
                    vscode.commands.executeCommand('salesforce-pmd-autofix.selectRuleset');
                    break;
                case 'resetRuleset':
                    this._context.workspaceState.update('apexScaAutofix.customRuleset', undefined);
                    this._view?.webview.postMessage({ type: 'updateRulesetPath', path: null });
                    break;
                case 'jumpToViolation': {
                    const filePath = data.filePath;
                    const lineNumber = data.line;
                    if (!filePath || typeof lineNumber !== 'number') return;

                    try {
                        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
                        const editor = await vscode.window.showTextDocument(doc, { preview: false });
                        const pos = new vscode.Position(lineNumber - 1, 0);
                        editor.selection = new vscode.Selection(pos, pos);
                        editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
                        editor.setDecorations(highlightDecoration, [editor.document.lineAt(pos.line).range]);
                        setTimeout(() => editor.setDecorations(highlightDecoration, []), 1500);
                    } catch (err) {
                        vscode.window.showErrorMessage(`Unable to jump to line ${lineNumber}: ${err}`);
                    }
                    break;
                }
                case 'openFile': {
                    if (!data.filePath || data.filePath.includes('\t')) return;
                    try {
                        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(data.filePath));
                        await vscode.window.showTextDocument(doc);
                    } catch (err) {
                        vscode.window.showErrorMessage(`Unable to open file: ${data.filePath}`);
                    }
                    break;
                }
            }
        });

        // Load stored violations when sidebar becomes visible
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                const violationsMap = this._context.workspaceState.get<Record<string, any[]>>('apexScaAutofix.violationsMap', {});
                this.updateViolations(violationsMap);
            }
        });

        // Initial load if already visible
        if (this._view?.visible) {
            const violationsMap = this._context.workspaceState.get<Record<string, any[]>>('apexScaAutofix.violationsMap', {});
            this.updateViolations(violationsMap);
        }
    }

    public isApexFile(filePath: string | undefined): boolean {
        return !!filePath && (filePath.endsWith('.cls') || filePath.endsWith('.apex'));
    }

public updateViolations(violationsMap: Record<string, any[]>) {
    if (!this._view) return;

    const editor = vscode.window.activeTextEditor;
    const activeFile = editor?.document?.fileName || null;

    const allViolations = Object.values(violationsMap).flat();

    this._view.webview.postMessage({
        type: 'updateViolations',
        violations: allViolations,
        scanned: true,
        activeFile
    });

    if (activeFile && this.isApexFile(activeFile)) {
    this._view.webview.postMessage({
        type: 'expandFileAccordion',
        filePath: activeFile
    });
    this._view.webview.postMessage({
  type: 'highlightFileAccordion',
  filePath: activeFile
});

}


this._diagnostics.clear(); // Clear old ones first

for (const [filePath, violations] of Object.entries(violationsMap)) {
  const uri = vscode.Uri.file(filePath);
  const diags: vscode.Diagnostic[] = violations.map(v => {
    const range = new vscode.Range(
      new vscode.Position(v.beginline - 1, v.begincolumn - 1),
      new vscode.Position(v.beginline - 1, v.begincolumn)
    );

    const diag = new vscode.Diagnostic(
      range,
      v.description || 'Code violation',
      vscode.DiagnosticSeverity.Warning
    );
    diag.source = v.rule || 'PMD';
    return diag;
  });

  this._diagnostics.set(uri, diags);
}



}
public expandFileAccordion(filePath: string) {
    if (!this._view) return;

    this._view.webview.postMessage({
        type: 'expandFileAccordion',
        filePath
    });
}





private _getHtmlForWebview(webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Apex SCA Autofix</title>
  <style>
    .accordion-header.highlighted {
      outline: 2px solid yellow;
      background-color: var(--vscode-list-activeSelectionBackground);
    }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      padding: 10px;
    }
    .accordion-group-main {
      margin-bottom: 8px;
      
      border-radius: 4px;
      overflow: hidden;
    }
    .accordion-group {
      margin-top: 4px !important;
      border-radius: 4px;
      overflow: hidden;
      margin-left: 16px;
    }
    .accordion-header {
      background-color: var(--vscode-list-hoverBackground);
      padding: 5px 5px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      user-select: none;
    }
    .accordion-header:hover {
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
    }
    .accordion-icon {
      transition: transform 0.2s ease;
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
    }
    .accordion-header.active .accordion-icon {
      transform: rotate(90deg);
    }
    .accordion-content {
      display: none;
      padding-left: 0;
      background-color: var(--vscode-editor-background);
    }
    .accordion-content.active {
      display: block;
    }
 .violation-item {
  border: 1px solid var(--vscode-panel-border);
  padding: 8px;
  margin-left: 0; /* align with accordion */
  margin-right: 0;
  border-radius: 4px;
  background-color: var(--vscode-editor-background);
  cursor: pointer;
}

.violation-title {
  font-weight: bold;
  margin-bottom: 5px;
  color: var(--vscode-editor-foreground);
}

.violation-description {
  font-size: 0.9em;
  color: var(--vscode-descriptionForeground);
  margin-bottom: 6px;
}

.violation-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8em;
  color: var(--vscode-descriptionForeground);
}

.fix-button {
  background-color: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  padding: 4px 8px;
  font-size: 0.8em;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}


    .violation-location {
      font-size: 0.8em;
      color: var(--vscode-descriptionForeground);
    }

      .accordion-title span[title] {
        cursor: help;
        text-decoration: underline dotted;
      }




    .accordion-header-main {
      display: flex;
      cursor: pointer;
      background: transparent;
      border: none;
    }



.accordion-main-icon {
  width: 16px;
  display: inline-block;
  color: var(--vscode-descriptionForeground);
  font-size: 12px;
}

.accordion-main-title {
  display: flex;
  flex-grow: 1;
  font-weight: 500;
  color: var(--vscode-foreground);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  align-items: center;
}

.accordion-main-count {
  background-color: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  margin-left: 10px;
}


  </style>
</head>
<body>
  <h3 id="violationsHeader">Violations (0)</h3>
  <div id="violationsList"><p class="empty-message">No violations to display. Save a file to run analysis and view violations here.</p></div>
  <script>
    const vscode = acquireVsCodeApi();
    let currentViolations = [];

    function updateViolationsList(violations, scanned = false, activeFilePath = '') {
    document.getElementById('violationsHeader').textContent = \`Violations (\${violations.length})\`;

    const violationsList = document.getElementById('violationsList');
    if (!violations || violations.length === 0) {
        violationsList.innerHTML = hasBeenScanned
            ? '<p class="empty-message">No violations found in the current scan.</p>'
            : '<p class="empty-message">Violations will appear here after scanning your code.</p>';
        return;
    }

    currentViolations = violations;

    const groupedByFile = violations.reduce((acc, violation) => {
        const fileKey = violation.filePath || 'Unknown File';
        (acc[fileKey] ||= []).push(violation);
        return acc;
    }, {});

    let flatIndex = 0;
    const fileKeys = Object.keys(groupedByFile);
    const activeFileInMap = fileKeys.includes(activeFilePath);

    // 🟡 Collapse all if active file is not in violationsMap
    if (!activeFileInMap) {
      document.getElementById('violationsList').innerHTML =
        '<p class="empty-message">No violations found in the current scan.</p>';

      // Collapse all existing accordions
      document.querySelectorAll('.accordion-header-main').forEach(header => header.classList.remove('active'));
      document.querySelectorAll('.accordion-content').forEach(content => content.classList.remove('active'));
      // return;
    }


    const fileHTML = Object.entries(groupedByFile).map(([filePath, fileViolations], fileIndex) => {
        const encodedFilePath = encodeURIComponent(filePath);
       const fileId = \`file-\${fileIndex}\`;    
        const groupedByRule = groupViolationsByRule(fileViolations);
        const fileName = filePath.split(/[\\\\/]/).pop();
        console.log("fileName :" +fileName);
        const rulesHTML = Object.entries(groupedByRule).map(([ruleName, ruleViolations], ruleIndex) => {
            const ruleId = \`\${fileId}-rule-\${ruleIndex}\`;
            const ruleItemsHTML = ruleViolations.map((violation) => {


                const html = \`
                <div class="violation-item"
                data-filepath="\${filePath.split('/').pop()}"
                data-line="\${violation.beginline}"
                onclick="handleViolationClick(this)">
                        <div class="violation-description">\${violation.description}</div>
                        <div class="violation-meta">
                          <div class="violation-location">Line \${violation.beginline}, Column \${violation.begincolumn}</div>
                          <button class="fix-button" onclick="event.stopPropagation(); fixViolationByIndex(\${flatIndex})">Fix</button>
                      </div>
                        </div>\`;
                flatIndex++;
                return html;
            }).join('');

            return \`
                <div class="accordion-group">
                    <div class="accordion-header" id="header-\${ruleId}" onclick="toggleRuleAccordion('\${ruleId}')">
                        <div class="accordion-title">
                            \${ruleName}
                            <span class="accordion-count">\${ruleViolations.length}</span>
                        </div>
                        <div>
                            <button class="fix-button" onclick="event.stopPropagation(); fixAllOfType('\${ruleName}')">Fix All</button>
                            <span class="accordion-icon" data-arrow>▶</span>
                        </div>
                    </div>
                    <div class="accordion-content" id="content-\${ruleId}">
                        \${ruleItemsHTML}
                    </div>
                </div>\`;
        }).join('');

        return \`
            <div class="accordion-group-main">
    <div class="accordion-header-main" id="mainfile-header-\${encodedFilePath}" onclick="toggleFileAccordion('mainfile-header-\${encodedFilePath}', 'file-\${fileIndex}')">
        <div class="accordion-main-title">
        <div class="accordion-main-icon" data-arrow>▶</div>
            <span title="\${filePath}">\${fileName}</span>
            <span class="accordion-main-count">\${fileViolations.length}</span>
        </div>
        
    </div>

    <div class="accordion-content" id="file-\${fileIndex}">
        \${rulesHTML}
    </div>
  </div>\`;
    }).join('');

    violationsList.innerHTML = fileHTML;

    // 🔽 Auto-expand active file accordion after rendering
const encodedId = encodeURIComponent(activeFilePath);
const headerId = \`mainfile-header-\${encodedId}\`;

let retryCount = 0;
const maxRetries = 10;





}



function waitForElementById(id, maxRetries = 10, interval = 100) {
  return new Promise((resolve, reject) => {
    let tries = 0;

    const check = () => {
      const el = document.getElementById(id);
      if (el) return resolve(el);
      if (++tries > maxRetries) return reject(new Error(\`Element not found: \${id}\`));
      setTimeout(check, interval);
    };

    check();
  });
}

function handleViolationClick(element) {
  const filePath = element.getAttribute('data-filepath');
  const line = parseInt(element.getAttribute('data-line'), 10);

  if (!filePath || isNaN(line)) {
    vscode.postMessage({ type: 'showError', message: 'Invalid file path or line.' });
    return;
  }

  vscode.postMessage({ type: 'jumpToViolation', filePath, line });
}


function jumpToViolation(filePath, line) {
    if (typeof line !== 'number') {
        vscode.postMessage({ type: 'showError', message: 'Missing line number for violation.' });
        return;
    }
    vscode.postMessage({ type: 'jumpToViolation', line, filePath });
}

function fixAllOfType(ruleType) {
  vscode.postMessage({ type: 'fixAllOfType', ruleType });
}
  
function toggleFileAccordion(headerId, contentId) {
  const header = document.getElementById(headerId);
  const content = document.getElementById(contentId);
  if (!header || !content) return;

  const isOpen = content.classList.contains('active');
  content.classList.toggle('active');
  header.classList.toggle('active',);

  const icon = header.querySelector('[data-arrow]');
  if (icon) icon.textContent = !isOpen ? '▼' : '▶';
}

function toggleRuleAccordion(ruleId) {
  const header = document.getElementById(\`header-\${ruleId}\`);
  const content = document.getElementById(\`content-\${ruleId}\`);
  if (!header || !content) return;

  const isOpen = content.classList.contains('active');
  content.classList.toggle('active', !isOpen);
  header.classList.toggle('active', !isOpen);

  const icon = header.querySelector('[data-arrow]');
  if (icon) icon.textContent = !isOpen ? '▼' : '▶';
}



function expandOnlyThisFileAccordion(targetHeaderId, targetContentId) {
  // Collapse all others
  document.querySelectorAll('.accordion-group-main').forEach(group => {
    const header = group.querySelector('.accordion-header-main');
    const content = group.querySelector('.accordion-content');
    if (!header || !content) return;

    header.classList.remove('active', 'highlighted');
    content.classList.remove('active');
    const icon = header.querySelector('[data-arrow]');
    if (icon) icon.textContent = '▶';
  });

  // Then expand the target
  toggleFileAccordion(targetHeaderId, targetContentId);
  const header = document.getElementById(targetHeaderId);
  if (header) header.classList.add('highlighted');
}




    function fixViolationByIndex(index) {
      const flat = currentViolations.flat ? currentViolations.flat() : Object.values(currentViolations).flat();
      const v = flat[index];
      if (v) {
        vscode.postMessage({ type: 'fixViolation', violation: v });
      } else {
        vscode.postMessage({ type: 'showError', message: 'Violation not found.' });
      }
    }

    function groupViolationsByRule(list) {
      return list.reduce((g, v) => {
        const key = v.rule || 'Unknown Rule';
        (g[key] ||= []).push(v);
        return g;
      }, {});
    }


        window.addEventListener('message', event => {
    const msg = event.data;

    switch (msg.type) {
        case 'showSpinner' :
            showSpinner();
             break;
        case 'sidebarVisible':
            // Sidebar is visible → ask extension if violations need to be re-run
            // vscode.postMessage({ type: 'requestViolationsIfNeeded' });
            break;

        case 'updateViolations':
            currentViolations = msg.violations || [];
            hasBeenScanned = !!msg.scanned;
            updateViolationsList(currentViolations, hasBeenScanned, msg.activeFile || '');
            break;

        case 'updateRulesetPath':
            const label = document.getElementById('rulesetPath');
            label.textContent = msg.path ? \`Using: \${msg.path}\` : 'Using default ruleset';

            break;

        case 'expandFileAccordion': {
          const encodedId = encodeURIComponent(msg.filePath);
          const headerId = \`mainfile-header-\${encodedId}\`;

          // Collapse all open accordions
          document.querySelectorAll('.accordion-header-main.active').forEach(header => {
            header.classList.remove('active');
            const icon = header.querySelector('[data-arrow]');
            if (icon) icon.textContent = '▶';
          });
          document.querySelectorAll('.accordion-content.active').forEach(content => {
            content.classList.remove('active');
          });

          // ✅ Correctly find the file-level accordion group
          const group = [...document.querySelectorAll('.accordion-group-main')].find(g =>
            g.querySelector('.accordion-header-main')?.id === headerId
          );
          const header = group?.querySelector('.accordion-header-main');
          const content = group?.querySelector('.accordion-content');

          if (header && content?.id) {
            expandOnlyThisFileAccordion(header.id, content.id);
            header.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }

          break;
        }



        case 'highlightFileAccordion': {
          const encodedId = encodeURIComponent(msg.filePath);
          const headerId = \`mainfile-header-\${encodedId}\`;
          const allHeaders = document.querySelectorAll('.accordion-header-main');
          allHeaders.forEach(header => header.classList.remove('highlighted'));

          const targetHeader = document.getElementById(headerId);
          if (targetHeader) {
            targetHeader.classList.add('highlighted');
            targetHeader.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          break;
        }

          


        // Optionally handle more message types
    }
});


    </script>
</body>
</html>`;
}



// private _getHtmlForWebview(webview: vscode.Webview): string {
//         // Same minimal HTML version from your earlier template with dynamic JS rendering
//         return `<!DOCTYPE html>
// <html lang="en">
// <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Apex SCA Autofix</title></head>
// <body>
//     <div id="container">Loading violations...</div>
//     <script>
//         const vscode = acquireVsCodeApi();

//         window.addEventListener('message', event => {
//             const msg = event.data;
//             if (msg.type === 'updateViolationsMap') {
//                 const container = document.getElementById('container');
//                 container.innerHTML = '<h3>Total Violations: ' + msg.totalCount + '</h3>';
//                 msg.fileViolations.forEach(file => {
//                     const section = document.createElement('div');
//                     section.innerHTML = '<h4>' + file.filePath + ' (' + file.count + ')</h4>';
//                     file.violations.forEach(v => {
//                         const div = document.createElement('div');
//                         div.style.border = '1px solid gray';
//                         div.style.margin = '4px';
//                         div.style.padding = '4px';
//                         div.innerText = v.rule + ': Line ' + v.beginline + ' - ' + v.description;
//                         section.appendChild(div);
//                     });
//                     container.appendChild(section);
//                 });
//             }
//         });
//     </script>
// </body>
// </html>`;
//     }
    
    }

