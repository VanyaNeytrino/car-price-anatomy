# Выкатка на Vercel

Проект привязан к Vercel (`.vercel/project.json`, проект `car-price-anatomy`).

## Внимание: два репозитория

Vercel собирает из `VanyaNeytrino/car-price-anatomy_001` (приватный, один коммит
от 26.11.2025). Вся работа ведётся в `VanyaNeytrino/car-price-anatomy` (публичный).
Пока Vercel не переключат на второй, деплой будет собирать ноябрьскую версию.

Переключить: Project Settings → Git → Disconnect → подключить `car-price-anatomy`.

## Что нужно до первого деплоя

### 1. База данных

Локальный `DATABASE_URL` смотрит на `localhost:5432` — Vercel до него не достучится.
Нужен внешний PostgreSQL. Подойдёт любой: Vercel Postgres (Neon), Supabase, Neon напрямую.

Если брать Vercel Postgres, переменная `DATABASE_URL` проставится сама при подключении
хранилища к проекту.

### 2. Переменные окружения

В настройках проекта на Vercel (Settings → Environment Variables):

| переменная | зачем |
|---|---|
| `DATABASE_URL` | строка подключения к внешнему PostgreSQL |
| `AUTH_SECRET` | секрет NextAuth. Сгенерировать: `openssl rand -base64 32` |
| `NEXT_PUBLIC_URL` | необязательно. Адрес для сниппета встройки; без него берётся текущий origin |

`AUTH_SECRET` обязателен: без него приложение осознанно падает на старте,
чтобы не подняться с подделываемыми сессиями.

### 3. Миграции и сборка

Отдельные скрипты, потому что на Vercel нужно больше, чем локально:

- `postinstall: prisma generate` — Prisma Client не переживает кэш node_modules на Vercel
- `vercel-build: prisma migrate deploy && next build` — Vercel берёт `vercel-build`,
  если он есть, поэтому локальный `npm run build` остаётся без миграций

### 4. Наполнение базы

Репозиторий публичный, поэтому на проде сид по умолчанию **не создаёт учётки** —
иначе войти в админку смог бы любой, кто открыл `prisma/seed.ts` на гитхабе.
Сеются только машины-шаблоны, а свою учётку владелец заводит через `/register`.

```bash
vercel env pull .env.production.local
DATABASE_URL="<прод>" NODE_ENV=production npx tsx prisma/seed.ts
```

Если демо-учётки всё же нужны, задайте свой пароль (тот, что в коде, не примется):

```bash
DATABASE_URL="<прод>" NODE_ENV=production SEED_ADMIN_PASSWORD="<свой>" npx tsx prisma/seed.ts
```

## Деплой

```bash
vercel login          # интерактивно, через браузер
vercel link           # если проект ещё не привязан
vercel --prod
```

## Проверить после выкатки

- `/` — карточки машин с суммами
- `/car/zeekr-001-ultra` — виджет закрашивает силуэт целиком
- `/embed/zeekr-009?theme=light` — светлая тема для сайтов дилеров
- `/admin/dashboard` без входа — редирект на `/login`

## Известное

Замена файла картинки под тем же именем не подхватывается: кэшируют и оптимизатор
Next (`.next/dev/cache/images` локально), и браузеры посетителей. Пока лечится только
переименованием файла. Если админка научится менять фотографии машин, понадобится
версионирование пути вида `/cars/x.png?v=<метка>`.
