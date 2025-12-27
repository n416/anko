# 🍡 Anko - Smart Dependency Extractor

[ 日本語 | [English](README.md) ]

**Anko** は、LLM（大規模言語モデル）を用いた開発における「コンテキスト収集」を効率化するために設計された強力なファイル抽出ツールです。
JS/TS、Python、HTMLなどのコードベースを解析して依存関係グラフ（ASTベース）を構築し、指定した深度（Depth）まで再帰的に関連ファイルを一括選択できます。

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ 特徴

- **ASTベースの解析**: JavaScript, TypeScript, JSX, TSX, Python, HTML の import/require/src などを正規表現ではなく構文木レベルで正確に識別します。
- **再帰的な選択**: 「親（呼び出し元）」や「子（依存先）」を、スライダーで指定した深さまで芋づる式に選択できます。
- **スマートコンテキスト**: ChatGPT, Claude, Gemini 等にそのまま貼り付けられる形式（ファイルパス＋コードブロック）のMarkdownテキストを瞬時に生成します。
- **セーブ＆ロード**: 作業中のファイルセットを「冒険の書（スロット）」に保存したり、JSONファイルとしてエクスポート/インポートしたりできます。
- **ローカルブラウザ**: OSのダイアログを使わず、Web UI上から解析対象のディレクトリを自由に移動・切り替え可能です。

## 🚀 はじめ方

### 前提条件

- Node.js (v16 以上)
- Python (オプション: `.py` ファイルの解析を行う場合に必要)

### インストール

1. リポジトリをクローンします。
2. 依存パッケージをインストールします:

```bash
npm install
```

### 使い方

ローカルサーバーを起動します:

```bash
npm start
```

ブラウザで `http://localhost:3000` にアクセスしてください。

## 🛠 技術スタック

- **Backend**: Node.js (Express), TypeScript Compiler API, Python `ast` module.
- **Frontend**: Vue 3 (CDN), Tailwind CSS.

## 📝 ライセンス

本プロジェクトは MIT ライセンスの下で公開されています。
