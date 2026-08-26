/**
 * Заготовка нового урока.
 *
 *   npm run new-lesson
 *
 * Спрашивает название, раздел и порядковый номер — и создаёт файл урока
 * с заполненной шапкой и скелетом секций. Больше ничего трогать не нужно:
 * меню, главная, оглавление, соседние ссылки и карта сайта соберутся сами.
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { sectionsInOrder } from '../src/content/sections.mjs';
import { slugify } from '../src/lib/slug.mjs';

const LESSONS_DIR = path.join(process.cwd(), 'src', 'content', 'lessons');

const red = (t) => `\x1b[31m${t}\x1b[0m`;
const green = (t) => `\x1b[32m${t}\x1b[0m`;
const dim = (t) => `\x1b[2m${t}\x1b[0m`;
const bold = (t) => `\x1b[1m${t}\x1b[0m`;

function stop(message) {
  console.error('\n' + red('Не получилось: ') + message + '\n');
  process.exit(1);
}

/** Читает шапки всех уроков, чтобы не выдать занятый slug или номер. */
function readExisting() {
  if (!fs.existsSync(LESSONS_DIR)) return [];
  return fs
    .readdirSync(LESSONS_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((file) => {
      const text = fs.readFileSync(path.join(LESSONS_DIR, file), 'utf8');
      const slug = text.match(/^slug:\s*['"]?([^'"\n]+)['"]?/m)?.[1]?.trim();
      const order = Number(text.match(/^order:\s*(\d+)/m)?.[1]);
      const title = text.match(/^title:\s*['"]?([^'"\n]+)['"]?/m)?.[1]?.trim();
      return { file, slug, order, title };
    });
}

const SKELETON = (data) => `---
title: '${data.title.replace(/'/g, "''")}'
slug: '${data.slug}'
order: ${data.order}
section: '${data.section}'
summary: 'Одно-два предложения о том, чему учит урок. Их видно под заголовком и на карточке урока. Можно вставлять \`код в бэктиках\`.'
draft: true
headline: '${data.title.replace(/'/g, "''")}'
eyebrow: 'Roblox Studio · Luau · урок ${data.order}'
---

{/*
  Урок помечен draft: true — на сайте его нет, он виден только при npm run dev.
  Когда урок готов, поменяй draft на false.

  Все блоки показаны на служебной странице /lessons/demo-komponenty/ —
  открой её рядом, там под каждым блоком написано, как он пишется.
*/}

<Section title="Первый разговор" sub="О чём эта тема и зачем она нужна">

Здесь теория. Обычный текст, **жирный**, \`код внутри строки\`.

\`\`\`luau title="Script"
local score = 0
score += 10
print(score)
\`\`\`
<Output>10</Output>

<Note kind="tip" title="Главное">
Мысль, которую надо унести с собой.
</Note>

</Section>

<Section title="Тренажёры" sub="Пощёлкай, прежде чем читать дальше">

<Trainer type="expand" />

</Section>

<Section title="Разборы" sub="Примеры с полным ходом мысли">

### 1. Название разбора

\`\`\`luau title="Script"
local x = 5
x += 3
print(x)
\`\`\`
<Output>8</Output>

Объяснение: что произошло и почему получилось именно это.

</Section>

<Section title="Устные задания" sub="Отвечай вслух или на черновике. Компьютер не открывать">

<TaskGroup letter="А" title="Название группы">

<Task>
Текст вопроса.
<Answer>Ответ.</Answer>
</Task>

<Task>
Ещё один вопрос.
<Answer>Ответ. Номера А1, А2 проставляются сами.</Answer>
</Task>

</TaskGroup>

</Section>

<Section title="Письменные задания" sub="Открывай Studio, вставляй Script в ServerScriptService и пиши">

<TaskGroup letter="Б" title="Название группы">

<Task type="written">
Что нужно написать.

<Answer>
\`\`\`luau
local x = 0
x += 5
print(x)
\`\`\`
</Answer>
</Task>

</TaskGroup>

</Section>

<Section title="Шпаргалка" sub="Если забыл — смотри сюда">

<Note kind="ok" title="Правило">
Короткая формулировка всего урока одной фразой.
</Note>

| Пишешь [30%] | Значит |
| --- | --- |
| \`x += 1\` | \`x = x + 1\` |

</Section>
`;

/**
 * Значения можно не вводить руками, а передать сразу:
 *   npm run new-lesson -- --title "Циклы" --section osnovy --order 2
 * Что не передано — скрипт спросит.
 */
function readArgs() {
  const args = {};
  const list = process.argv.slice(2);
  for (let i = 0; i < list.length; i++) {
    const key = list[i];
    if (!key.startsWith('--')) continue;
    args[key.slice(2)] = list[i + 1]?.startsWith('--') ? '' : (list[i + 1] ?? '');
  }
  return args;
}

async function main() {
  const existing = readExisting();
  const args = readArgs();

  // спрашивать можно только если по ту сторону человек за клавиатурой
  const interactive = input.isTTY;
  const rl = interactive ? readline.createInterface({ input, output }) : null;

  /** Берёт значение из аргументов, иначе спрашивает, иначе — значение по умолчанию. */
  const ask = async (name, question, fallback = '') => {
    if (args[name] !== undefined && args[name] !== '') return String(args[name]).trim();
    if (!rl) {
      if (fallback !== '') return fallback;
      stop(
        `не хватает значения «${name}».\n` +
          `  Запусти ${bold('npm run new-lesson')} в терминале и ответь на вопросы,\n` +
          `  либо передай всё сразу: ${bold('npm run new-lesson -- --title "Название" --section osnovy')}`
      );
    }
    const answer = (await rl.question(question)).trim();
    return answer || fallback;
  };

  console.log('\n' + bold('Новый урок') + '\n');

  // ——— название ———
  const title = await ask('title', 'Название урока: ');
  if (title.length < 3) {
    rl?.close();
    stop('название слишком короткое. Напиши так, как оно должно стоять в меню.');
  }

  // ——— раздел ———
  if (interactive && args.section === undefined) {
    console.log('\nРазделы курса:');
    sectionsInOrder.forEach((s, i) => console.log(`  ${i + 1}. ${s.title}  ${dim(s.id)}`));
    console.log(dim('  Новый раздел добавляется в src/content/sections.mjs\n'));
  }

  const sectionRaw = await ask('section', 'Раздел (номер, по умолчанию 1): ', '1');
  // принимаем и номер из списка, и сам id раздела
  const picked =
    sectionsInOrder.find((s) => s.id === sectionRaw) ?? sectionsInOrder[Number(sectionRaw) - 1];
  if (!picked) {
    rl?.close();
    stop(
      `раздела «${sectionRaw}» нет. Есть такие: ${sectionsInOrder.map((s) => s.id).join(', ')}.\n` +
        `  Новый раздел добавляется в src/content/sections.mjs`
    );
  }

  // ——— номер по порядку ———
  // предлагаем наименьший свободный номер, а не «последний плюс один»:
  // тогда служебные страницы с большими номерами не сдвигают счёт
  const taken = new Set(existing.map((l) => l.order));
  let free = 1;
  while (taken.has(free)) free += 1;
  const suggestedOrder = String(free);
  const orderRaw = await ask('order', `Номер по порядку (по умолчанию ${suggestedOrder}): `, suggestedOrder);
  const order = Number(orderRaw);
  if (!Number.isInteger(order) || order < 1) {
    rl?.close();
    stop(`«${orderRaw}» — это не целое число больше нуля.`);
  }
  const orderClash = existing.find((l) => l.order === order);
  if (orderClash) {
    rl?.close();
    stop(
      `номер ${order} уже занят уроком «${orderClash.title}» (${orderClash.file}).\n` +
        `  Возьми другой номер или сначала поменяй order у того урока.`
    );
  }

  // ——— адрес ———
  const suggestedSlug = slugify(title);
  const slug = await ask('slug', `Адрес урока (по умолчанию ${suggestedSlug}): `, suggestedSlug);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    rl?.close();
    stop(`«${slug}» не годится для адреса. Нужны латинские буквы в нижнем регистре, цифры и дефис.`);
  }
  const slugClash = existing.find((l) => l.slug === slug);
  if (slugClash) {
    rl?.close();
    stop(`адрес «${slug}» уже занят уроком «${slugClash.title}» (${slugClash.file}).`);
  }

  rl?.close();

  // ——— пишем файл ———
  fs.mkdirSync(LESSONS_DIR, { recursive: true });
  const file = path.join(LESSONS_DIR, `${slug}.mdx`);
  if (fs.existsSync(file)) stop(`файл ${slug}.mdx уже есть. Удали его или возьми другой адрес.`);

  fs.writeFileSync(file, SKELETON({ title, slug, order, section: picked.id }), 'utf8');

  console.log('\n' + green('Готово.') + ' Создан файл:');
  console.log('  ' + bold(`src/content/lessons/${slug}.mdx`));
  console.log('\nДальше:');
  console.log('  1. ' + bold('npm run dev') + dim('  — открыть сайт на своём компьютере'));
  console.log(`  2. Открыть ${bold(`http://localhost:4321/lessons/${slug}/`)}`);
  console.log('  3. Править файл урока в любом редакторе — страница обновляется сама');
  console.log(
    '  4. Когда урок готов — поменять ' + bold('draft: true') + ' на ' + bold('draft: false')
  );
  console.log('  5. ' + bold('npm run publish') + dim('  — выложить на сайт'));
  console.log();
}

main().catch((error) => stop(error.message));
