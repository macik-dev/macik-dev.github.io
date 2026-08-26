/**
 * Проверка: не попал ли в проект пароль, токен или ключ.
 *
 *   npm run check-secrets
 *
 * Запускается сама перед публикацией и в GitHub Actions при каждом пуше.
 * Репозиторий публичный: всё, что сюда попало, увидит любой человек в интернете,
 * а из истории git это уже не вычистить простым удалением файла.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.astro', '.vscode', '.idea']);
const SKIP_FILES = new Set(['package-lock.json', 'check-secrets.mjs']);

const TEXT_EXT = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.astro', '.mdx', '.md', '.json', '.yml', '.yaml',
  '.html', '.css', '.txt', '.env', '.sh', '.ps1', '.toml', '.ini', '.xml', '.svg',
]);

/**
 * Каждое правило: как называется по-русски и по какому признаку ищем.
 * Признаки взяты по формату самих токенов, а не по слову «token» рядом,
 * чтобы не ругаться на обычные тексты про токены.
 */
const RULES = [
  { name: 'токен GitHub (ghp_/gho_/ghu_/ghs_/ghr_)', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { name: 'токен GitHub нового формата (github_pat_)', re: /\bgithub_pat_[A-Za-z0-9_]{60,}\b/ },
  { name: 'ключ доступа AWS', re: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/ },
  { name: 'ключ Google API', re: /\bAIza[A-Za-z0-9_-]{35}\b/ },
  { name: 'токен Slack', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: 'токен Telegram-бота', re: /\b\d{8,10}:AA[A-Za-z0-9_-]{33}\b/ },
  { name: 'приватный ключ', re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: 'строка подключения с паролем', re: /\b[a-z+]{2,12}:\/\/[^\s:@/]+:[^\s:@/]{6,}@/i },
];

/** Файлы, которых в публичном репозитории быть не должно вообще. */
const FORBIDDEN_FILES = [/^\.env(\..+)?$/, /\.pem$/, /\.p12$/, /\.pfx$/, /^id_rsa$/, /^secrets?\./];

const findings = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full);
      continue;
    }
    if (SKIP_FILES.has(entry.name)) continue;

    const relative = path.relative(ROOT, full).split(path.sep).join('/');

    if (FORBIDDEN_FILES.some((re) => re.test(entry.name))) {
      findings.push({ relative, line: 0, what: 'такому файлу не место в публичном репозитории' });
      continue;
    }

    if (!TEXT_EXT.has(path.extname(entry.name))) continue;
    if (fs.statSync(full).size > 2_000_000) continue;

    const lines = fs.readFileSync(full, 'utf8').split('\n');
    lines.forEach((text, i) => {
      for (const rule of RULES) {
        if (rule.re.test(text)) findings.push({ relative, line: i + 1, what: rule.name });
      }
    });
  }
}

walk(ROOT);

if (findings.length === 0) {
  console.log('\x1b[32mСекретов не найдено.\x1b[0m');
  process.exit(0);
}

console.error('\n\x1b[31mСТОП. Похоже на секрет в файлах проекта:\x1b[0m\n');
for (const f of findings) {
  console.error(`  ${f.relative}${f.line ? ':' + f.line : ''}`);
  console.error(`    ${f.what}\n`);
}
console.error('Репозиторий публичный. Публиковать это нельзя.');
console.error('Что делать: убрать секрет из файла, а сам секрет — отозвать и выпустить заново');
console.error('(даже если он ещё не попал в интернет, считай его скомпрометированным).\n');
process.exit(1);
