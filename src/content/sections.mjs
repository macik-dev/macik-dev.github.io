/**
 * Разделы курса.
 *
 * Это единственное место, где они перечислены. Порядок разделов в меню и на
 * главной берётся отсюда, а не из алфавита. Чтобы добавить раздел — допиши
 * строчку. Чтобы переставить — поменяй order.
 *
 * В уроке пишется id раздела:  section: "osnovy"
 * Если написать раздел, которого здесь нет, сборка остановится и скажет об этом.
 *
 * @typedef {{ id: string, title: string, order: number, summary?: string }} Section
 */

/** @type {Section[]} */
export const sections = [
  { id: 'osnovy', title: 'Основы', order: 1, summary: 'С чего начинается любой скрипт' },
];

export const sectionIds = sections.map((s) => s.id);

/** @param {string} id */
export const sectionById = (id) => sections.find((s) => s.id === id);

export const sectionsInOrder = [...sections].sort((a, b) => a.order - b.order);
