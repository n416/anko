# 🍡 Anko - Smart Dependency Extractor

[ [日本語](README.ja.md) | English ]

**Anko** is a powerful file extraction tool designed for LLM-based development context gathering.
It parses your codebase (JS/TS, Python, HTML), visualizes dependency graphs (AST-based), and allows you to select files recursively with a specific depth.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ Features

- **AST-Based Parsing**: Correctly identifies imports in JavaScript, TypeScript, JSX, TSX, Python, and HTML.
- **Recursive Selection**: Select "Parents" (callers) or "Children" (dependencies) with a customizable depth slider.
- **Smart Context**: Generates a single markdown text block ready to be pasted into ChatGPT, Claude, or Gemini.
- **Save/Load System**: Save your working context (file sets) into "Slots" or export them as JSON files.
- **Local Browser**: Navigate and switch target directories directly from the Web UI.

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Python (optional, required for parsing `.py` files)

### Installation

1. Clone this repository.
2. Install dependencies:

```bash
npm install
```

### Usage

Start the local server:

```bash
npm start
```

Open your browser at `http://localhost:3000`.

## 🛠 Tech Stack

- **Backend**: Node.js (Express), TypeScript Compiler API, Python `ast` module.
- **Frontend**: Vue 3 (CDN), Tailwind CSS.

## 📝 License

This project is licensed under the MIT License.
