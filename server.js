const express = require('express');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const DependencyAnalyzer = require('./analyzer');

const app = express();
const PORT = 3000;

// 初期値
let TARGET_ROOT = path.resolve(__dirname, '..');
const SETS_DIR = path.join(__dirname, 'sets');

if (!fs.existsSync(SETS_DIR)) fs.mkdirSync(SETS_DIR);

app.use(express.static('public'));
app.use(express.json());

const analyzer = new DependencyAnalyzer(TARGET_ROOT);
const IGNORE = ['node_modules', '.git', 'dist', 'build', '.vscode', 'anko', 'package-lock.json', 'yarn.lock', 'env', 'venv', '.venv', '.next', '.cache'];
const toPosix = (p) => p.split(path.sep).join('/');

// --- フォルダ一覧取得 ---
app.post('/api/dirs', (req, res) => {
    console.log('[API /dirs] Request received with path:', req.body.path);
    let targetPath = req.body.path;
    if (targetPath === undefined) targetPath = TARGET_ROOT;
    console.log('[API /dirs] Evaluated targetPath:', targetPath);
    
    if (process.platform === 'win32' && (targetPath === '' || targetPath === '/')) {
        console.log('[API /dirs] Hit win32 root drives block');
        const drives = [];
        for (let i = 65; i <= 90; i++) {
            const drive = String.fromCharCode(i) + ':\\';
            if (fs.existsSync(drive)) drives.push(drive);
        }
        console.log('[API /dirs] Found drives:', drives);
        return res.json({ current: '', parent: null, dirs: drives, isRoot: true });
    }
    
    try {
        console.log('[API /dirs] Attempting to read directory:', targetPath);
        if (!fs.existsSync(targetPath)) {
            console.log('[API /dirs] Path does not exist, falling back to TARGET_ROOT');
            targetPath = TARGET_ROOT;
        }
        const items = fs.readdirSync(targetPath, { withFileTypes: true });
        const dirs = items
            .filter(item => item.isDirectory() && !IGNORE.includes(item.name) && !item.name.startsWith('.'))
            .map(item => item.name);
        const parent = path.dirname(targetPath);
        const isRoot = parent === targetPath;
        res.json({
            current: toPosix(targetPath),
            parent: isRoot ? '' : toPosix(parent),
            dirs: dirs,
            isRoot: isRoot
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- ルート変更 ---
app.get('/api/root', (req, res) => {
    res.json({ root: toPosix(TARGET_ROOT) });
});
app.post('/api/root', (req, res) => {
    const { path: newPath } = req.body;
    if (!newPath || !fs.existsSync(newPath)) return res.status(400).json({ error: 'Invalid path' });
    TARGET_ROOT = path.resolve(newPath);
    analyzer.updateRoot(TARGET_ROOT);
    res.json({ success: true, root: toPosix(TARGET_ROOT) });
});

// --- ファイル一覧 ---
app.get('/api/files', (req, res) => {
    const rawFiles = glob.sync('**/*', { cwd: TARGET_ROOT, nodir: true, ignore: IGNORE.map(i => `**/${i}/**`), dot: true });
    let filteredFiles = rawFiles.map(f => toPosix(f)).filter(f => !f.startsWith('anko/') && !f.includes('/anko/'));
    
    const MAX_FILES = 3000;
    if (filteredFiles.length > MAX_FILES) {
        console.warn(`[Warning] Too many files (${filteredFiles.length}). Limiting to ${MAX_FILES} to prevent freeze.`);
        filteredFiles = filteredFiles.slice(0, MAX_FILES);
    }
    
    analyzer.refresh(filteredFiles);
    res.json({
        files: filteredFiles,
        root: toPosix(TARGET_ROOT),
        graph: analyzer.getGraph()
    });
});

// --- 生成 ---
app.post('/api/anko', (req, res) => {
    const { files } = req.body;
    let output = `# Anko Extraction\n# Root: ${toPosix(TARGET_ROOT)}\n\n`;
    let count = 0;
    files.forEach(relPath => {
        const fullPath = path.join(TARGET_ROOT, relPath);
        if (fs.existsSync(fullPath)) {
            try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                const ext = path.extname(relPath).replace('.', '') || 'txt';
                output += `### File: ${relPath}\n\`\`\`${ext}\n${content}\n\`\`\`\n\n`;
                count++;
            } catch (e) {}
        }
    });
    res.json({ content: output, count });
});

// --- ★ セット保存機能（スロット対応版） ---
// スロット一覧を取得 (slot_1.json ... slot_N.json の中身も読んで返す)
app.get('/api/slots', (req, res) => {
    const slots = [];
    // スロット1〜5を固定でチェック
    for (let i = 1; i <= 5; i++) {
        const filename = `slot_${i}.json`;
        const p = path.join(SETS_DIR, filename);
        let data = null;
        if (fs.existsSync(p)) {
            try {
                const content = JSON.parse(fs.readFileSync(p, 'utf-8'));
                // 互換性チェック: 配列なら古い形式
                if (Array.isArray(content)) {
                    data = { files: content, date: '---', name: 'No Name' };
                } else {
                    data = content;
                }
            } catch (e) {
                data = null; // 読み込みエラー時は空扱い
            }
        }
        slots.push({ id: i, filename, data });
    }
    res.json(slots);
});

// スロットへ保存
app.post('/api/slots/:id', (req, res) => {
    const id = req.params.id;
    const filePath = path.join(SETS_DIR, `slot_${id}.json`);
    // req.body = { files: [], name: "...", date: "..." }
    fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2), 'utf-8');
    res.json({ message: 'Saved' });
});

// スロット読み込み (個別)
app.get('/api/slots/:id', (req, res) => {
    const filePath = path.join(SETS_DIR, `slot_${req.params.id}.json`);
    if (fs.existsSync(filePath)) {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (Array.isArray(content)) {
            res.json({ files: content, date: '', name: '' });
        } else {
            res.json(content);
        }
    } else {
        res.status(404).json({ error: 'Empty slot' });
    }
});

app.listen(PORT, () => {
    console.log(`🍡 Anko (Node.js) is ready at http://localhost:${PORT}`);
}); 