import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { sectionIds, sections } from './content/sections.mjs';

const list = sections.map((s) => `"${s.id}" — ${s.title}`).join(', ');

/**
 * Сообщение об ошибке поля: одно для «поле пропущено», другое для «не тот тип».
 * Обёртка нужна, чтобы преподаватель видел человеческий текст, а не
 * «Invalid input: expected boolean, received undefined».
 */
const err = (missing: string, wrongType?: string) => (issue: { input: unknown }) =>
  issue.input === undefined ? missing : (wrongType ?? missing);

/**
 * Схема урока. Если в .mdx пропущено обязательное поле или у поля не тот тип —
 * сборка останавливается и пишет по-русски, какой файл и что чинить.
 */
const lessons = defineCollection({
  loader: glob({ base: './src/content/lessons', pattern: '**/*.mdx' }),
  schema: z.object({
    title: z
      .string({
        error: err(
          'поле "title" обязательно — это название урока в меню и во вкладке браузера',
          'поле "title" — нужен текст в кавычках'
        ),
      })
      .min(3, 'поле "title" слишком короткое, напиши название урока целиком'),

    slug: z
      .string({
        error: err(
          'поле "slug" обязательно — это адрес урока на сайте',
          'поле "slug" — нужен текст, например: sostavnye-operatory'
        ),
      })
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'поле "slug" — только латинские буквы в нижнем регистре, цифры и дефис. Например: sostavnye-operatory'
      ),

    order: z
      .number({
        error: err(
          'поле "order" обязательно — по нему уроки идут по порядку и связываются «предыдущий → следующий»',
          'поле "order" — нужно число без кавычек, например: 3'
        ),
      })
      .int('поле "order" — целое число, без дробной части')
      .positive('поле "order" — число больше нуля'),

    section: z.enum(sectionIds as [string, ...string[]], {
      error: err(
        `поле "section" обязательно. Доступные разделы: ${list}`,
        `поле "section" — такого раздела нет. Доступные: ${list}. Новый раздел добавляется в src/content/sections.mjs`
      ),
    }),

    summary: z
      .string({
        error: err(
          'поле "summary" обязательно — это вступление под заголовком и подпись на карточке урока',
          'поле "summary" — нужен текст в кавычках'
        ),
      })
      .min(10, 'поле "summary" слишком короткое, напиши предложение целиком'),

    draft: z.boolean({
      error: err(
        'поле "draft" обязательно. true — черновик, урока нет на сайте. false — урок опубликован',
        'поле "draft" — только true или false, без кавычек'
      ),
    }),

    // ─────────── необязательные ───────────

    /** Заголовок на самой странице: | делает перенос строки, `бэктики` — моноширинный синий */
    headline: z.string().optional(),

    /** Строчка над заголовком. По умолчанию — «Roblox Studio · Luau · урок N» */
    eyebrow: z.string().optional(),

    tags: z.array(z.string()).default([]),

    readingMinutes: z
      .number({ error: 'поле "readingMinutes" — число минут без кавычек' })
      .int('поле "readingMinutes" — целое число минут')
      .positive('поле "readingMinutes" — число больше нуля')
      .optional(),

    taskCount: z
      .number({ error: 'поле "taskCount" — число без кавычек' })
      .int('поле "taskCount" — целое число')
      .nonnegative('поле "taskCount" — число от нуля')
      .optional(),

    /** Дополнительные метки в шапке урока, например ["10 разборов"] */
    chips: z.array(z.string()).default([]),

    updated: z.coerce.date({ error: 'поле "updated" — дата в виде 2026-08-23' }).optional(),

    /** slug'и уроков, которые стоит пройти раньше. Проверяются на существование */
    prerequisites: z.array(z.string()).default([]),
  }),
});

export const collections = { lessons };
