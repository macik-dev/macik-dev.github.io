/**
 * Проверка собранного сайта: не тянет ли он что-нибудь с чужих адресов.
 *
 *   node scripts/check-no-external.mjs
 *
 * Требование простое: страница курса не должна ходить никуда, кроме себя самой.
 * Ни шрифтов из Google, ни счётчиков, ни библиотек с CDN. Иначе чужой сервер
 * узнаёт, кто из детей и когда открыл урок, а сайт перестаёт работать без
 * интернета.
 *
 * Ссылка в тексте урока — это нормально, по ней переходят руками.
 * Проверяем только то, что браузер загружает сам: src, href на стили и шрифты,
 * @import и url() в CSS.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.join(process.cwd(), 'dist');

if (!fs.existsSync(DIST)) {
  console.error('Папки dist нет. Сначала собери сайт: npm run build');
  process.exit(1);
}

/** Свой же адрес сайта из карты сайта — он в ссылках canonical, и это нормально. */
const ownOrigins = new Set();
const sitemap = path.join(DIST, 'sitemap-index.xml');
if (fs.existsSync(sitemap)) {
  for (const m of fs.readFileSync(sitemap, 'utf8').matchAll(/<loc>(https?:\/\/[^/]+)/g)) {
    ownOrigins.add(m[1]);
  }
}

const findings = [];

/** Всё, что браузер грузит сам, не спрашивая человека. */
const LOADED_BY_BROWSER = [
  { what: 'src="…"', re: /\bsrc\s*=\s*["']([^"']+)["']/g },
  { what: 'вложенный ресурс', re: /<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/g },
  { what: 'url() в стилях', re: /url\(\s*["']?([^"')]+)["']?\s*\)/g },
  { what: '@import в стилях', re: /@import\s+["']([^"']+)["']/g },
  { what: 'запрос из скрипта', re: /\b(?:fetch|importScripts|XMLHttpRequest)\s*\(\s*["']([^"']+)["']/g },
];

/** Ссылки, по которым переходят руками, — их не проверяем. */
const isNavigationLink = (tag) =>
  /<link\b/.test(tag) && /rel\s*=\s*["'](?:canonical|alternate|prev|next)["']/.test(tag);

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(html|css|js|mjs)$/.test(entry.name)) continue;

    const text = fs.readFileSync(full, 'utf8');
    const relative = path.relative(DIST, full).split(path.sep).join('/');

    for (const rule of LOADED_BY_BROWSER) {
      for (const match of text.matchAll(rule.re)) {
        const url = match[1];
        if (!/^https?:\/\//i.test(url) && !url.startsWith('//')) continue;
        if (isNavigationLink(match[0])) continue;

        const origin = url.startsWith('//') ? 'https:' + url.split('/').slice(0, 3).join('/')
                                            : url.split('/').slice(0, 3).join('/');
        if (ownOrigins.has(origin)) continue;

        findings.push({ relative, what: rule.what, url });
      }
    }
  }
}

walk(DIST);

if (findings.length === 0) {
  console.log('\x1b[32mВ собранном сайте нет обращений на чужие адреса.\x1b[0m');
  process.exit(0);
}

console.error('\n\x1b[31mСайт тянет что-то с чужих адресов:\x1b[0m\n');
for (const f of findings) {
  console.error(`  dist/${f.relative}`);
  console.error(`    ${f.what} → ${f.url}\n`);
}
console.error('Так нельзя: чужой сервер будет видеть, кто открывает уроки,');
console.error('а без интернета сайт сломается. Положи файл в public/ и сошлись на него.\n');
process.exit(1);
