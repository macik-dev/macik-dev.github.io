/**
 * Подсветка Luau в стиле редактора Roblox Studio.
 *
 * Работает на сборке, в браузер не попадает ни строчки. Тема раскрашивает
 * токены семью цветами-метками, а transformer тут же меняет эти цвета на
 * короткие классы (.k .n .s .c .o .f) — те же самые, что в образце урока.
 * Заодно это убирает из HTML атрибуты style, из-за которых пришлось бы
 * ослаблять политику безопасности страницы.
 */

const K = '#7FA8FF'; // ключевые слова: local, for, do, end, if
const N = '#F0B265'; // числа
const S = '#86D6A5'; // строки
const C = '#7D8A9E'; // комментарии (темнее образца ради контраста, см. global.css)
const O = '#FF9E8A'; // операторы: = += .. ==
const F = '#C9A5F0'; // вызовы функций: print, task.wait
const ID = '#DCE3ED'; // всё остальное — имена переменных

const CLASS_BY_COLOR = { [K]: 'k', [N]: 'n', [S]: 's', [C]: 'c', [O]: 'o', [F]: 'f' };

/** @type {any} */
export const studioTheme = {
  name: 'roblox-studio',
  type: 'dark',
  colors: { 'editor.background': '#1B2330', 'editor.foreground': ID },
  settings: [
    { settings: { foreground: ID, background: '#1B2330' } },
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: C } },
    { scope: ['string', 'punctuation.definition.string', 'constant.character'], settings: { foreground: S } },
    { scope: ['constant.numeric', 'constant.other'], settings: { foreground: N } },
    // script, workspace и прочие «встроенные имена» — обычным цветом, как в образце
    { scope: ['constant.language'], settings: { foreground: ID } },
    {
      scope: ['keyword', 'storage', 'storage.modifier', 'keyword.control', 'variable.language.self'],
      settings: { foreground: K },
    },
    // а true, false и nil — всё-таки ключевые слова
    {
      scope: ['constant.language.boolean', 'constant.language.nil'],
      settings: { foreground: K },
    },
    { scope: ['keyword.operator', 'punctuation.separator.key-value'], settings: { foreground: O } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call'], settings: { foreground: F } },
    { scope: ['variable', 'variable.other', 'variable.parameter', 'entity.name'], settings: { foreground: ID } },
  ],
};

/** Разбирает «шапку» блока кода: ```luau title="Script" plain */
function parseMeta(raw) {
  const meta = String(raw ?? '');
  const title = meta.match(/title="([^"]*)"/);
  return {
    title: title ? title[1] : 'Script',
    plain: /(^|\s)plain(\s|$)/.test(meta),
  };
}

const el = (tagName, properties, children = []) => ({
  type: 'element',
  tagName,
  properties,
  children,
});

/**
 * Общая часть трансформера. options — либо {} (тогда заголовок берётся из
 * «шапки» блока кода), либо явные {title, plain} для компонента <Code>.
 * @returns {any}
 */
function makeTransformer(options) {
  return {
  name: 'roblox-studio-classes',

  // цвет токена → короткий класс, атрибут style удаляется
  span(node) {
    const style = node.properties?.style;
    if (typeof style !== 'string') return;
    delete node.properties.style;
    const hex = style.match(/color\s*:\s*(#[0-9a-fA-F]{6})/);
    const cls = hex && CLASS_BY_COLOR[hex[1].toUpperCase()];
    if (cls) node.properties.class = cls;
  },

  pre(node) {
    delete node.properties.style;
    node.properties.class = undefined;
    delete node.properties.class;
    delete node.properties.tabindex;
  },

  code(node) {
    delete node.properties.style;
  },

  // оборачиваем <pre> в «окно редактора» с полоской-заголовком
  root(node) {
    const pre = node.children.find((c) => c.type === 'element' && c.tagName === 'pre');
    if (!pre) return;
    const fromMeta = parseMeta(this.options?.meta?.__raw);
    const title = options?.title ?? fromMeta.title;
    const plain = options?.plain ?? fromMeta.plain;
    const bar = plain
      ? []
      : [el('div', { class: 'ed-bar' }, [el('span', { class: 'dot' }, []), { type: 'text', value: ' ' + title }])];
    node.children = [el('div', { class: 'ed' }, [...bar, pre])];
  },
  };
}

/** Для блоков кода в Markdown: заголовок берётся из ```luau title="Script" */
export const studioTransformer = makeTransformer(undefined);

/** Для компонента <Code file="Script" />, где заголовок задан пропсом. */
export const makeStudioTransformer = (options) => makeTransformer(options);
