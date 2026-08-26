/**
 * Обычная таблица в Markdown → таблица в рамке с горизонтальной прокруткой.
 * Автор пишет таблицу как таблицу, а не как вёрстку.
 *
 * Ширину колонки можно задать прямо в заголовке, в квадратных скобках:
 *
 *   | Строка [38%] | Как это читать вслух |
 *   | --- | --- |
 *
 * Пометка из заголовка убирается, а колонка получает нужную ширину.
 * Колонки без пометки подстраиваются под содержимое сами.
 */
import { visit } from 'unist-util-visit';

const WIDTH = /\s*\[(\d{1,2})%\]\s*$/;

/** Убирает пометку [38%] из заголовка и возвращает найденную ширину. */
function takeWidth(cell) {
  let found = null;
  visit(cell, 'text', (textNode) => {
    const match = textNode.value.match(WIDTH);
    if (!match) return;
    found = Number(match[1]);
    textNode.value = textNode.value.replace(WIDTH, '');
  });
  return found;
}

function buildColgroup(table) {
  const headRow = table.children
    .find((c) => c.tagName === 'thead')
    ?.children.find((c) => c.tagName === 'tr');
  if (!headRow) return null;

  const cells = headRow.children.filter((c) => c.tagName === 'th' || c.tagName === 'td');
  const widths = cells.map(takeWidth);
  if (widths.every((w) => w === null)) return null;

  return {
    type: 'element',
    tagName: 'colgroup',
    properties: {},
    children: widths.map((w) => ({
      type: 'element',
      tagName: 'col',
      properties: w === null ? {} : { class: `w${w}` },
      children: [],
    })),
  };
}

export function rehypeTables() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'table' || !parent || index === undefined) return;
      if (parent.type === 'element' && parent.properties?.class === 'tw') return;

      const colgroup = buildColgroup(node);
      if (colgroup) node.children.unshift(colgroup);

      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { class: 'tw' },
        children: [node],
      };
      return ['skip'];
    });
  };
}
