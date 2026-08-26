/**
 * Русский заголовок → короткий латинский якорь для ссылки.
 * «Сначала — коробка» → «snachala-korobka»
 *
 * Один и тот же код используют компонент Section (когда ставит id заголовку)
 * и плагин сборки (когда собирает оглавление), поэтому ссылки всегда сходятся.
 */
const MAP = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

/**
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .split('')
    .map((ch) => (ch in MAP ? MAP[/** @type {keyof MAP} */ (ch)] : ch))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'razdel';
}
