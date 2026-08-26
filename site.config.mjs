// ═══════════════════════════════════════════════════════════════
//  ЕДИНСТВЕННАЯ СТРОЧКА, КОТОРУЮ НУЖНО ПОМЕНЯТЬ ПЕРЕД ПЕРВОЙ ПУБЛИКАЦИЕЙ
//
//  Впиши сюда адрес своего сайта на GitHub Pages.
//  Он же — название репозитория: если тут https://ivanov.github.io,
//  то репозиторий должен называться ivanov.github.io
// ═══════════════════════════════════════════════════════════════
export const SITE = 'https://macik-dev.github.io';

// ——— дальше ничего менять не нужно, всё считается само ———

/** Логин на GitHub: из ivanov.github.io получается ivanov */
export const OWNER = new URL(SITE).hostname.replace(/\.github\.io$/, '');

/** Полное имя репозитория для админки: ivanov/ivanov.github.io */
export const REPO = `${OWNER}/${new URL(SITE).hostname}`;

/** Ветка, из которой публикуется сайт */
export const BRANCH = 'main';
