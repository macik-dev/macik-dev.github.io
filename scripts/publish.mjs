/**
 * Публикация сайта одной командой.
 *
 *   npm run publish
 *   npm run publish -- "добавил урок про циклы"
 *
 * По шагам: проверка на секреты → проверка типов → пробная сборка →
 * коммит → отправка на GitHub. Дальше GitHub сам соберёт сайт и выложит его.
 *
 * Если что-то ломается, скрипт останавливается и пишет, что именно чинить.
 */
import { spawnSync } from 'node:child_process';

const red = (t) => `\x1b[31m${t}\x1b[0m`;
const green = (t) => `\x1b[32m${t}\x1b[0m`;
const dim = (t) => `\x1b[2m${t}\x1b[0m`;
const bold = (t) => `\x1b[1m${t}\x1b[0m`;

let step = 0;
const say = (text) => console.log(`\n${bold(`[${++step}]`)} ${text}`);

function stop(title, advice) {
  console.error('\n' + red('Остановился: ') + title + '\n');
  for (const line of advice) console.error('  ' + line);
  console.error();
  process.exit(1);
}

// npx и npm на Windows — это .cmd, их нужно запускать через оболочку.
// git и node — обычные программы, им оболочка только мешает кавычками.
const NEEDS_SHELL = new Set(['npx', 'npm']);

/** Запускает команду, показывая её вывод. Возвращает код возврата. */
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: NEEDS_SHELL.has(command),
    ...options,
  });
  return result.status ?? 1;
}

/** Запускает команду молча и отдаёт её вывод. */
function capture(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', shell: NEEDS_SHELL.has(command) });
  return { code: result.status ?? 1, out: (result.stdout ?? '').trim(), err: (result.stderr ?? '').trim() };
}

// ─────────────────────────────────────────────────────────────
//  0. Это вообще репозиторий?
// ─────────────────────────────────────────────────────────────
if (capture('git', ['rev-parse', '--is-inside-work-tree']).code !== 0) {
  stop('эта папка ещё не подключена к git', [
    'Сайт публикуется через git, поэтому папку нужно один раз настроить.',
    'Как это сделать — написано в README.md, раздел «Первая публикация».',
  ]);
}

// ─────────────────────────────────────────────────────────────
//  1. Секреты
// ─────────────────────────────────────────────────────────────
say('Проверяю, не попал ли в проект пароль или токен');
if (run('node', ['scripts/check-secrets.mjs']) !== 0) {
  stop('в файлах нашлось что-то похожее на секрет', [
    'Выше написано, в каком файле и в какой строке.',
    'Репозиторий публичный: опубликованный секрет увидят все.',
    'Убери его из файла, а сам секрет отзови и выпусти заново.',
  ]);
}

// ─────────────────────────────────────────────────────────────
//  2. Проверка типов и схемы уроков
// ─────────────────────────────────────────────────────────────
say('Проверяю уроки и код');
if (run('npx', ['astro', 'check']) !== 0) {
  stop('проверка не прошла', [
    'Выше написано, в каком файле и что не так.',
    'Чаще всего это опечатка в шапке урока: пропущено поле или не тот тип.',
    'Например, draft пишется без кавычек: ' + bold('draft: false') + ', а не "false".',
  ]);
}

// ─────────────────────────────────────────────────────────────
//  3. Пробная сборка
// ─────────────────────────────────────────────────────────────
say('Собираю сайт начисто');
if (run('npx', ['astro', 'build']) !== 0) {
  stop('сборка не прошла', [
    'Публиковать нечего: на GitHub она сломается ровно так же.',
    'Выше написана причина. Почини и запусти ' + bold('npm run publish') + ' ещё раз.',
  ]);
}

// ─────────────────────────────────────────────────────────────
//  4. Что изменилось
// ─────────────────────────────────────────────────────────────
say('Смотрю, что изменилось');
const status = capture('git', ['status', '--porcelain']);
if (!status.out) {
  console.log('\n' + green('Менять нечего: ') + 'все файлы уже опубликованы.');
  console.log(dim('Если ждал изменений — проверь, что сохранил файл в редакторе.\n'));
  process.exit(0);
}
console.log(status.out.split('\n').map((l) => '  ' + l).join('\n'));

// ─────────────────────────────────────────────────────────────
//  5. Коммит
// ─────────────────────────────────────────────────────────────
const custom = process.argv.slice(2).join(' ').trim();
const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
const message = custom || `обновление материалов — ${today}`;

say(`Сохраняю изменения: ${bold(message)}`);
if (run('git', ['add', '-A']) !== 0) stop('не удалось добавить файлы в коммит', ['Попробуй ещё раз.']);

const commit = capture('git', ['commit', '-m', message]);
if (commit.code !== 0) {
  const text = commit.out + commit.err;
  if (/please tell me who you are|user\.email|user\.name/i.test(text)) {
    stop('git не знает, кто ты', [
      'Выполни один раз, подставив свои данные:',
      '  ' + bold('git config --global user.name "Имя Фамилия"'),
      '  ' + bold('git config --global user.email "почта@example.com"'),
      'Потом снова ' + bold('npm run publish') + '.',
    ]);
  }
  stop('не удалось сохранить изменения', [text || 'Причина не ясна, покажи этот вывод тому, кто настраивал сайт.']);
}
console.log(commit.out);

// ─────────────────────────────────────────────────────────────
//  6. Отправка
// ─────────────────────────────────────────────────────────────
const branch = capture('git', ['rev-parse', '--abbrev-ref', 'HEAD']).out || 'main';
say(`Отправляю на GitHub (ветка ${bold(branch)})`);

if (capture('git', ['remote']).out === '') {
  stop('не указано, куда отправлять', [
    'Репозиторий на GitHub ещё не привязан. Один раз выполни:',
    '  ' + bold('git remote add origin https://github.com/ЛОГИН/ЛОГИН.github.io.git'),
    'Подробнее — в README.md, раздел «Первая публикация».',
  ]);
}

const push = capture('git', ['push', '-u', 'origin', branch]);
if (push.code !== 0) {
  const text = push.out + push.err;
  if (/authentication|could not read Username|permission denied|403/i.test(text)) {
    stop('GitHub не пустил', [
      'Скорее всего, нужно заново войти в аккаунт.',
      'Проще всего — установить GitHub CLI и выполнить ' + bold('gh auth login') + ',',
      'либо войти через приложение GitHub Desktop.',
      '',
      dim(text.split('\n').slice(0, 4).join('\n')),
    ]);
  }
  if (/rejected|non-fast-forward|fetch first/i.test(text)) {
    stop('на GitHub есть изменения, которых нет у тебя', [
      'Так бывает, если правил с другого компьютера. Выполни:',
      '  ' + bold('git pull --rebase'),
      'а потом снова ' + bold('npm run publish') + '.',
    ]);
  }
  stop('не удалось отправить', [text || 'Причина не ясна.']);
}
console.log(push.out || push.err);

console.log('\n' + green('Опубликовано.'));
console.log('GitHub соберёт сайт сам, это занимает 1–2 минуты.');
console.log('Как идёт сборка, видно на вкладке ' + bold('Actions') + ' в репозитории.\n');
