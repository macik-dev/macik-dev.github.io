import { getCollection, type CollectionEntry } from 'astro:content';
import { sectionsInOrder, sectionById } from '../content/sections.mjs';

export type Lesson = CollectionEntry<'lessons'>;

/**
 * Черновики видно только при локальной разработке.
 * В собранном сайте их нет нигде: ни в меню, ни на главной, ни в карте сайта,
 * ни по прямой ссылке — страница просто не создаётся.
 */
export const SHOW_DRAFTS = import.meta.env.DEV;

/** Все уроки, которые попадают на сайт, по порядку. */
export async function getLessons(): Promise<Lesson[]> {
  const all = await getCollection('lessons', ({ data }) => SHOW_DRAFTS || !data.draft);
  return all.sort((a, b) => a.data.order - b.data.order);
}

export const lessonPath = (slug: string) => `/lessons/${slug}/`;

export type SectionGroup = {
  id: string;
  title: string;
  summary?: string;
  lessons: Lesson[];
};

/** Уроки, разложенные по разделам. Порядок разделов — из src/content/sections.mjs */
export async function getSectionGroups(): Promise<SectionGroup[]> {
  const lessons = await getLessons();
  return sectionsInOrder
    .map((section) => ({
      id: section.id,
      title: section.title,
      summary: section.summary,
      lessons: lessons.filter((l) => l.data.section === section.id),
    }))
    .filter((group) => group.lessons.length > 0);
}

/** Предыдущий и следующий урок по полю order — сквозь все разделы. */
export async function getNeighbours(current: Lesson) {
  const lessons = await getLessons();
  const i = lessons.findIndex((l) => l.data.slug === current.data.slug);
  return {
    prev: i > 0 ? lessons[i - 1] : undefined,
    next: i >= 0 && i < lessons.length - 1 ? lessons[i + 1] : undefined,
  };
}

/**
 * Проверка на опечатки в prerequisites: если урок ссылается на несуществующий
 * slug, сборка останавливается с понятным сообщением.
 */
export async function assertPrerequisites(lessons: Lesson[]) {
  const known = new Set(lessons.map((l) => l.data.slug));
  for (const lesson of lessons) {
    for (const need of lesson.data.prerequisites) {
      if (!known.has(need)) {
        throw new Error(
          `Урок «${lesson.data.title}» (файл src/content/lessons/${lesson.id}.mdx):\n` +
            `  в поле "prerequisites" указан урок "${need}", а такого slug нет.\n` +
            `  Есть такие: ${[...known].join(', ')}`
        );
      }
    }
  }
}

/** Проверка на два урока с одинаковым slug или order. */
export async function assertUnique(lessons: Lesson[]) {
  const bySlug = new Map<string, Lesson>();
  const byOrder = new Map<number, Lesson>();
  for (const lesson of lessons) {
    const clash = bySlug.get(lesson.data.slug);
    if (clash) {
      throw new Error(
        `Два урока с одинаковым slug "${lesson.data.slug}":\n` +
          `  src/content/lessons/${clash.id}.mdx\n` +
          `  src/content/lessons/${lesson.id}.mdx\n` +
          `  slug — это адрес урока, он должен быть у каждого свой.`
      );
    }
    bySlug.set(lesson.data.slug, lesson);

    const same = byOrder.get(lesson.data.order);
    if (same) {
      throw new Error(
        `Два урока с одинаковым order ${lesson.data.order}:\n` +
          `  «${same.data.title}» и «${lesson.data.title}».\n` +
          `  Порядок должен быть однозначным, иначе непонятно, какой урок идёт следующим.`
      );
    }
    byOrder.set(lesson.data.order, lesson);
  }
}

export { sectionById, sectionsInOrder };
