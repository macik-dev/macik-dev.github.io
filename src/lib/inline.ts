const ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (ch) => ESCAPE[ch]!);

/**
 * Мини-разметка для заголовка и вступления урока:
 *   `score += 10`  → моноширинный шрифт
 *   |              → перенос строки
 * Больше ничего не понимает, поэтому вставить сюда чужую разметку нельзя.
 */
export const inlineMarkup = (text: string) =>
  escapeHtml(text)
    .replace(/`([^`]+)`/g, '<span class="mono">$1</span>')
    .split('|')
    .join('<br>');

/** Убирает мини-разметку: для мест, где нужен просто текст (карточки, описания). */
export const plainText = (text: string) => text.split('`').join('');
