const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { execSync } = require('child_process');
const { parse } = require('node-html-parser');

class DependencyAnalyzer {
    constructor(rootDir) {
        this.updateRoot(rootDir);
    }

    // ★ ルートディレクトリを更新してグラフをリセット
    updateRoot(newPath) {
        this.rootDir = newPath;
        this.graph = {};
        this.files = [];
    }

    normalize(p) {
        return p.split(path.sep).join('/');
    }

    refresh(fileList) {
        this.files = fileList.map(f => this.normalize(f));
        this.graph = {};
        this.files.forEach(f => {
            this.graph[f] = { parents: new Set(), children: new Set() };
        });
        
        console.log(`Building dependency graph for: ${this.rootDir}`);
        this.buildGraph();
        
        // ログ出力
        let edgeCount = 0;
        Object.values(this.graph).forEach(n => edgeCount += n.children.size);
        console.log(`Graph built. Nodes: ${this.files.length}, Edges: ${edgeCount}`);
    }

    buildGraph() {
        for (const file of this.files) {
            const ext = path.extname(file).toLowerCase();
            const fullPath = path.join(this.rootDir, file);
            let imports = [];

            try {
                if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
                    imports = this.analyzeJsTs(fullPath);
                } else if (ext === '.py') {
                    imports = this.analyzePython(fullPath);
                } else if (ext === '.html' || ext === '.htm') {
                    imports = this.analyzeHtml(fullPath);
                }

                imports.forEach(imp => {
                    const resolved = this.resolvePath(file, imp);
                    if (resolved && this.graph[resolved]) {
                        this.graph[file].children.add(resolved);
                        this.graph[resolved].parents.add(file);
                    }
                });
            } catch (e) {
                // ファイル読み込みエラーなどは無視（存在しない場合など）
            }
        }
    }

    // --- HTML解析 ---
    analyzeHtml(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const root = parse(content);
        const imports = [];
        root.querySelectorAll('script').forEach(el => {
            const src = el.getAttribute('src');
            if (src && !src.match(/^(http|\/\/)/)) imports.push(src);
        });
        root.querySelectorAll('link').forEach(el => {
            const rel = el.getAttribute('rel');
            const href = el.getAttribute('href');
            if (rel === 'stylesheet' && href && !href.match(/^(http|\/\/)/)) imports.push(href);
        });
        return imports;
    }

    // --- JS/TS解析 ---
    analyzeJsTs(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
        const imports = [];
        const visit = (node) => {
            if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
                imports.push(node.moduleSpecifier.text);
            } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.Identifier && node.expression.text === 'require') {
                if (node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
                    imports.push(node.arguments[0].text);
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return imports;
    }

    // --- Python解析 ---
    analyzePython(filePath) {
        const safePath = filePath.split(path.sep).join('/');
        const pythonScript = `
import ast, json, sys
try:
    with open(r'${safePath}', 'r', encoding='utf-8') as f:
        tree = ast.parse(f.read())
    imports = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for n in node.names: imports.append(n.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module: imports.append(node.module)
            elif node.level > 0: imports.append('.' * node.level)
    print(json.dumps(imports))
except Exception:
    print("[]")
`;
        try {
            const cmd = `python -c "${pythonScript.replace(/"/g, '\\"')}"`;
            const result = execSync(cmd, { encoding: 'utf-8' });
            return JSON.parse(result.trim());
        } catch (e) { return []; }
    }

    // --- パス解決 ---
    resolvePath(currentFile, importPath) {
        let candidates = [];
        const currentDir = path.dirname(currentFile); 

        if (importPath.startsWith('.')) {
            candidates.push(this.normalize(path.join(currentDir, importPath)));
        } else {
            if (importPath.startsWith('/')) {
                candidates.push(importPath.substring(1));
            } else {
                candidates.push(importPath);
                candidates.push(importPath.replace(/\./g, '/'));
            }
            candidates.push(this.normalize(path.join(currentDir, importPath)));
        }

        const extensions = ['', '.js', '.ts', '.jsx', '.tsx', '.py', '.css', '.html', '/index.js', '/index.ts', '/__init__.py'];
        
        for (const basePath of candidates) {
            for (const ext of extensions) {
                const tryPath = this.normalize(basePath + ext);
                if (this.graph[tryPath]) {
                    return tryPath;
                }
            }
        }
        return null;
    }

    getGraph() {
        const plainGraph = {};
        for (const [key, val] of Object.entries(this.graph)) {
            plainGraph[key] = {
                parents: Array.from(val.parents),
                children: Array.from(val.children)
            };
        }
        return plainGraph;
    }
}

module.exports = DependencyAnalyzer;