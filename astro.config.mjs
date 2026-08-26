// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified, rehypeShiki } from '@astrojs/markdown-remark';

import { remarkLesson } from './src/plugins/remark-lesson.mjs';
import { rehypeTables } from './src/plugins/rehype-tables.mjs';
import { rehypeLinks } from './src/plugins/rehype-links.mjs';
import { studioTheme, studioTransformer } from './src/plugins/shiki-studio.mjs';

// адрес сайта живёт в site.config.mjs — это единственное, что нужно поменять
import { SITE } from './site.config.mjs';

/**
 * Админка живёт только при локальной разработке.
 *
 * Это не «скрыта» и не «закрыта паролем» — на собранном сайте её страницы
 * физически нет: маршрут добавляется только при npm run dev. Значит, и попасть
 * туда через интернет нельзя, и токен для неё нигде не нужен.
 */
/** @type {import('astro').AstroIntegration} */
const adminOnlyInDev = {
  name: 'admin-only-in-dev',
  hooks: {
    'astro:config:setup': ({ command, injectRoute }) => {
      if (command !== 'dev') return;
      injectRoute({ pattern: '/admin', entrypoint: './src/admin/index.astro' });
    },
  },
};

export default defineConfig({
  site: SITE,
  base: '/',
  trailingSlash: 'always',
  integrations: [mdx(), sitemap(), adminOnlyInDev],
  build: {
    // стили отдельными файлами, а не внутри HTML: так их проще кэшировать
    inlineStylesheets: 'never',
  },

  // ─────────────────────────────────────────────────────────────
  //  Политика безопасности страницы (CSP).
  //  Astro сам добавляет в неё script-src и style-src с хешами своих
  //  скриптов, а тут дописано всё остальное: default-src 'none' значит
  //  «по умолчанию нельзя ничего». Никаких сторонних скриптов, шрифтов,
  //  картинок и запросов на чужие адреса. eval запрещён.
  // ─────────────────────────────────────────────────────────────
  security: {
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'none'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
        "frame-ancestors 'none'",
      ],
    },
  },
  markdown: {
    // Встроенная подсветка выключена, и вместо неё тот же самый Shiki подключён
    // вручную ниже. Причина: встроенная оставляет в HTML атрибуты style, из-за
    // которых пришлось бы ослабить политику безопасности. Наш трансформер
    // меняет их на классы, и политика остаётся строгой.
    syntaxHighlight: false,
    processor: unified({
      remarkPlugins: [remarkLesson],
      rehypePlugins: [
        [rehypeShiki, { theme: studioTheme, transformers: [studioTransformer] }],
        rehypeTables,
        rehypeLinks,
      ],
    }),
  },
});
