/**
 * Всё, что урок умеет считать про себя сам.
 *
 * 1. Нумерация заданий. Автор пишет группу и задания внутри — номера
 *    (А1, А2, Б1…) и счётчик «12 заданий» проставляются здесь, на сборке.
 *    Вставил задание в середину — остальные перенумеровались сами.
 * 2. Оглавление. Каждой <Section> выдаётся якорь, из них собирается список
 *    для боковой колонки.
 * 3. Метки в шапке: сколько устных и письменных заданий, сколько тренажёров,
 *    сколько примерно минут чтения.
 */
import { visit } from 'unist-util-visit';
import { slugify } from '../lib/slug.mjs';

const attr = (node, name) => {
  const found = node.attributes?.find((a) => a.type === 'mdxJsxAttribute' && a.name === name);
  if (!found) return undefined;
  return typeof found.value === 'string' ? found.value : found.value?.value;
};

const setAttr = (node, name, value) => {
  node.attributes = node.attributes ?? [];
  const found = node.attributes.find((a) => a.type === 'mdxJsxAttribute' && a.name === name);
  if (found) found.value = String(value);
  else node.attributes.push({ type: 'mdxJsxAttribute', name, value: String(value) });
};

const isElement = (node, name) =>
  (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') && node.name === name;

/** Собирает все <Task> внутри группы, в порядке появления. */
function collectTasks(root) {
  const found = [];
  visit(root, (node) => {
    if (isElement(node, 'Task')) found.push(node);
  });
  return found;
}

/**
 * Блоки, которые не должны оказаться внутри абзаца.
 *
 * Если написать <Answer> сразу на следующей строке после текста задания, без
 * пустой строки, markdown сочтёт его частью того же абзаца — и получится
 * <details> внутри <p>. Браузер такую вложенность чинит по-своему, вёрстка
 * едет. Поэтому такие блоки вынимаем из абзаца сами: автору не нужно помнить
 * про пустые строки.
 */
const BLOCKS = new Set(['Answer', 'Note', 'Trainer', 'Output', 'Steps', 'VarFlow', 'Task', 'TaskGroup', 'Section']);

const isBlank = (node) => node.type === 'text' && !String(node.value).trim();

function liftBlocks(tree) {
  visit(tree, 'paragraph', (node, index, parent) => {
    if (!parent || index === undefined) return;
    const at = node.children.findIndex(
      (child) => child.type === 'mdxJsxTextElement' && BLOCKS.has(child.name)
    );
    if (at === -1) return;

    const before = node.children.slice(0, at);
    const block = node.children[at];
    const after = node.children.slice(at + 1);

    const replacement = [];
    if (before.some((c) => !isBlank(c))) replacement.push({ ...node, children: before });
    replacement.push({ ...block, type: 'mdxJsxFlowElement' });
    if (after.some((c) => !isBlank(c))) replacement.push({ ...node, children: after });

    parent.children.splice(index, 1, ...replacement);
    return index; // проверяем то же место ещё раз: блоков в абзаце может быть несколько
  });
}

/**
 * Заголовки без пропусков уровней.
 *
 * Внутри секции первый подзаголовок — всегда третьего уровня, потому что сама
 * секция это h2. Если автор написал #### там, где ### ещё не было, заголовок
 * поднимается на уровень выше, но получает пометку «мелкий» и выглядит ровно
 * так, как автор задумал. Читалкам с экрана и проверке доступности при этом
 * достаётся правильная лестница уровней.
 */
function fixHeadingLevels(tree) {
  visit(tree, (node) => {
    if (!isElement(node, 'Section')) return;

    const headings = [];
    visit(node, 'heading', (heading) => {
      headings.push(heading);
    });
    if (headings.length === 0) return;

    // какие уровни автор вообще использовал в этой секции
    const used = [...new Set(headings.map((h) => h.depth))].sort((a, b) => a - b);
    // и куда они лягут: подряд, начиная с третьего
    const target = new Map(used.map((depth, i) => [depth, 3 + i]));

    for (const heading of headings) {
      const depth = target.get(heading.depth);
      // заголовок, который автор хотел видеть помельче, но который поднялся до h3
      if (depth === 3 && heading.depth > 3) {
        heading.data = heading.data ?? {};
        heading.data.hProperties = { ...(heading.data.hProperties ?? {}), class: 'sub' };
      }
      heading.depth = depth;
    }
  });
}

export function remarkLesson() {
  return (tree, file) => {
    liftBlocks(tree);
    fixHeadingLevels(tree);

    const stats = { oral: 0, written: 0, trainers: 0, tasks: 0, words: 0, sections: 0 };
    const toc = [];
    const used = new Set();

    visit(tree, (node) => {
      if (isElement(node, 'Section')) {
        stats.sections += 1;
        const title = attr(node, 'title') ?? `Раздел ${stats.sections}`;

        // якорь должен быть уникальным даже при одинаковых названиях
        let id = attr(node, 'id') ?? slugify(title);
        let n = 2;
        while (used.has(id)) id = `${slugify(title)}-${n++}`;
        used.add(id);

        setAttr(node, 'id', id);
        setAttr(node, 'num', String(stats.sections).padStart(2, '0'));
        toc.push({ id, title, num: String(stats.sections).padStart(2, '0') });
        return;
      }

      if (isElement(node, 'TaskGroup')) {
        const letter = attr(node, 'letter') ?? '';
        const tasks = collectTasks(node);
        let n = 0;
        for (const task of tasks) {
          n += 1;
          const explicit = attr(task, 'id');
          if (explicit) {
            // автор задал номер вручную — уважаем его и считаем дальше от него
            const digits = explicit.match(/(\d+)\s*$/);
            if (digits) n = Number(digits[1]);
          } else {
            setAttr(task, 'id', letter + n);
          }
        }
        setAttr(node, 'count', tasks.length);
        return;
      }

      if (isElement(node, 'Task')) {
        stats.tasks += 1;
        const written = attr(node, 'type') === 'written';
        if (written) stats.written += 1;
        else stats.oral += 1;

        // у письменного задания спойлер называется «Показать решение»
        if (written) {
          visit(node, (inner) => {
            if (isElement(inner, 'Answer') && attr(inner, 'label') === undefined) {
              setAttr(inner, 'label', 'Показать решение');
            }
          });
        }
        return;
      }

      if (isElement(node, 'Trainer')) {
        stats.trainers += 1;
        return;
      }

      if (node.type === 'text' || node.type === 'inlineCode') {
        stats.words += String(node.value ?? '').split(/\s+/).filter(Boolean).length;
      }
    });

    // 130 слов в минуту — спокойный темп чтения технического текста ребёнком
    stats.readingMinutes = Math.max(1, Math.round(stats.words / 130));

    file.data.astro ??= {};
    file.data.astro.frontmatter ??= {};
    file.data.astro.frontmatter.stats = stats;
    file.data.astro.frontmatter.toc = toc;
  };
}
