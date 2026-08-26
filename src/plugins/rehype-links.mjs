/**
 * Ссылки наружу открываются в новой вкладке и без утечки адреса страницы.
 *
 * rel="noopener" не даёт чужой странице дотянуться до нашей через window.opener,
 * rel="noreferrer" не сообщает чужому сайту, откуда пришёл ребёнок.
 * Автору урока об этом думать не нужно — ссылка пишется как обычно.
 */
import { visit } from 'unist-util-visit';

export function rehypeLinks() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'a') return;
      const href = node.properties?.href;
      if (typeof href !== 'string' || !/^https?:\/\//i.test(href)) return;

      node.properties.rel = 'noopener noreferrer';
      node.properties.target = '_blank';
    });
  };
}
