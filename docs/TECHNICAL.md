# Техническая документация: Сервис записи на консультации МФТИ

## 1. Стек технологий

| Компонент | Технология | Версия |
|-----------|-----------|--------|
| Фреймворк | Next.js (App Router) | 16.1.6 |
| Язык | TypeScript | 5.x |
| ORM | Prisma | 7.4.2 |
| Адаптер БД | @prisma/adapter-pg | 7.4.2 |
| СУБД | PostgreSQL | 16 |
| Email | Nodemailer | 8.x |
| Рантайм | Node.js | 20+ |

---

## 2. Структура проекта

```
consultations/
├── docs/                          # Документация
│   ├── SPECIFICATION.md           # Спецификация продукта
│   └── TECHNICAL.md               # Техническая документация
├── prisma/
│   ├── schema.prisma              # Схема БД
│   ├── seed.ts                    # Сидирование тестовых данных
│   └── migrations/                # Миграции
├── prisma.config.ts               # Конфигурация Prisma 7
├── public/
│   └── experts/                   # Загруженные фото экспертов
├── scripts/
│   ├── send-reminders.ts          # Cron-скрипт отправки напоминаний
│   └── telegram-bot.ts            # Telegram-бот (long polling)
├── src/
│   ├── proxy.ts                   # HTTP Basic Auth (Next.js 16 proxy)
│   ├── generated/prisma/          # Сгенерированный Prisma Client
│   ├── lib/
│   │   ├── prisma.ts              # Синглтон Prisma Client
│   │   ├── mail.ts                # Email-шаблоны и отправка
│   │   ├── calendar-links.ts      # Генерация ссылок Google/Yandex Calendar
│   │   └── ics.ts                 # Генератор ICS (не используется)
│   └── app/
│       ├── layout.tsx             # Корневой layout с хедером
│       ├── layout.module.css
│       ├── globals.css            # Глобальные стили и CSS-переменные
│       ├── page.tsx               # Главная: каталог программ
│       ├── page.module.css
│       ├── programs/
│       │   └── [id]/
│       │       ├── page.tsx       # Серверный компонент программы
│       │       ├── ProgramClient.tsx  # Клиентский компонент (выбор, форма)
│       │       └── page.module.css
│       ├── admin/
│       │   ├── page.tsx           # Обёртка админки
│       │   ├── AdminClient.tsx    # Клиентский компонент админки
│       │   └── admin.module.css
│       └── api/
│           ├── bookings/
│           │   ├── route.ts           # POST /api/bookings
│           │   └── [id]/ics/route.ts  # GET .ics файл для букинга
│           └── admin/
│               ├── programs/route.ts   # CRUD программ
│               ├── experts/route.ts    # CRUD экспертов
│               ├── slots/
│               │   ├── route.ts        # CRUD слотов
│               │   └── import/route.ts # CSV-импорт
│               ├── bookings/route.ts   # Записи (GET, DELETE)
│               ├── upload/route.ts     # Загрузка фото
│               └── settings/route.ts   # Настройки (GET, PUT)
│           └── expert/
│               ├── route.ts             # GET данные эксперта
│               ├── login/route.ts       # POST вход
│               ├── logout/route.ts      # POST выход
│               └── attendance/route.ts  # PATCH отметка присутствия
├── .env                           # Переменные окружения
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## 3. Переменные окружения

| Переменная | Описание | Пример |
|-----------|----------|--------|
| `DATABASE_URL` | Строка подключения PostgreSQL | `postgresql://user:pass@host:port/db` |
| `SMTP_HOST` | SMTP-сервер | `smtp.yandex.ru` |
| `SMTP_PORT` | Порт SMTP | `465` |
| `SMTP_USER` | Email отправителя | `digital@phystech.edu` |
| `SMTP_PASS` | Пароль приложения | `***` |
| `ADMIN_USER` | Логин администратора | `admin` |
| `ADMIN_PASS` | Пароль администратора | `***` |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram-бота | `***` |

---

## 4. База данных

### Подключение

Prisma 7 использует driver adapter (`@prisma/adapter-pg`) вместо встроенного подключения. Конфигурация datasource URL задаётся в `prisma.config.ts`, а не в `schema.prisma`.

```typescript
// src/lib/prisma.ts
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
```

### PostgreSQL в Docker (локальная разработка)

```bash
docker run -d \
  --name consultations-postgres \
  -e POSTGRES_DB=consultations \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5433:5432 \
  postgres:16
```

### Миграции

```bash
npx prisma migrate dev      # Создание и применение миграции
npx prisma migrate deploy   # Применение миграций (продакшен)
npx prisma db seed          # Сидирование данных
npx prisma generate         # Генерация клиента
```

---

## 5. Аутентификация

Используется HTTP Basic Auth через Next.js 16 proxy (`src/proxy.ts`).

- Защищённые пути: `/admin*`, `/api/admin/*`
- Публичные пути: всё остальное
- Механизм: проверка заголовка `Authorization: Basic <base64(user:pass)>`
- При отсутствии/некорректности — ответ `401` с заголовком `WWW-Authenticate: Basic realm="Admin"`

> В Next.js 16 файл `middleware.ts` заменён на `proxy.ts` с экспортом `export default function proxy`.

---

## 6. Email-подсистема

### Транспорт

- Yandex SMTP: `smtp.yandex.ru:465` (SSL/TLS)
- Отправитель: `digital@phystech.edu`
- Библиотека: `nodemailer`

### Шаблоны

1. **sendBookingConfirmation** — HTML-письмо с таблицей деталей + кнопки календарей
2. **sendCancellation** — HTML-письмо об отмене консультации
3. **sendReminder** — HTML-письмо с кнопкой «Перейти на встречу»

Все шаблоны используют общий wrapper (`emailWrapper`) с хедером и футером.

### Ссылки на календари

- **Google Calendar**: `https://calendar.google.com/calendar/render?action=TEMPLATE&...`
- **Скачать .ics**: `/api/bookings/[id]/ics` — универсальный формат для Яндекс Календаря, Apple Calendar и др.

Продолжительность события по умолчанию: 60 минут.

### Cron-скрипт напоминаний

```bash
npm run reminders
# или
npx tsx scripts/send-reminders.ts
```

Логика:
1. Проверяет настройку `reminder_enabled` (по умолчанию включено — отсутствие настройки трактуется как `"true"`, только явное `"false"` отключает)
2. Вычисляет окно: `now < dateTime ≤ now + reminder_minutes_before`
3. Находит записи без `reminderSentAt` в этом окне
4. Отправляет email, помечает `reminderSentAt`

Рекомендуемый запуск через cron:
```cron
*/5 * * * * cd /path/to/app && npm run reminders
```

---

## 7. Telegram-бот

### Общая информация
- Бот: `@mipt_consultation_bot`
- Скрипт: `scripts/telegram-bot.ts`
- Метод работы: long polling (не webhook)
- PM2 процесс: `telegram-bot`

### Модель данных

#### TelegramSub
| Поле | Тип | Описание |
|------|-----|----------|
| id | Int, PK | Идентификатор |
| chatId | String | Telegram chat ID |
| bookingId | Int, unique, FK | Связанный букинг |
| createdAt | DateTime | Дата подписки |

### Логика работы

1. Абитуриент нажимает «Напоминание в Telegram» на сайте → открывается deep link `https://t.me/mipt_consultation_bot?start=booking_{id}`
2. Бот получает `/start booking_{id}`, находит букинг в БД
3. Проверяет: букинг существует, не прошёл, нет дублирующей подписки
4. Создаёт запись `TelegramSub`, отправляет подтверждение с деталями и кнопками (встреча, Google Календарь, .ics)
5. Cron-скрипт `send-reminders.ts` проверяет подписки и отправляет напоминание за час до встречи
6. При удалении букинга админом — отправляется сообщение об отмене в Telegram

### Защита от спама
Бот реагирует **только** на `/start` с deep link. Все остальные сообщения игнорируются.

### Запуск
```bash
pm2 start npx --name telegram-bot -- tsx scripts/telegram-bot.ts
```

---

## 8. CSV-импорт слотов

### Формат

```csv
Эксперт;Программа;Дата и время (ГГГГ-ММ-ДД ЧЧ:ММ);Макс. участников
Иванов Иван Иванович;Цифровой продукт 1;2026-03-20 10:00;5
```

### Алгоритм

1. Парсинг файла (UTF-8, разделитель `;` или `,`)
2. Пропуск заголовка и строк с `#`
3. Маппинг эксперта/программы по имени (case-insensitive) или по ID
4. Валидация: наличие 4 колонок, корректная дата, maxParticipants ≥ 1
5. Создание слотов поштучно, сбор ошибок
6. Ответ: `{ created: number, errors: string[] }`

### Endpoint

`POST /api/admin/slots/import` — multipart/form-data, поле `file`

---

## 9. Деплой

### Целевой сервер

- IP: `195.209.219.226`
- Порт приложения: `3001`
- Процесс-менеджер: PM2
- Реверс-прокси: Nginx

### Команды сборки и запуска

```bash
# Установка зависимостей
npm ci

# Генерация Prisma Client
npx prisma generate

# Применение миграций
npx prisma migrate deploy

# Сборка
npm run build

# Запуск через PM2
pm2 start npm --name consultations -- start -- -p 3001

# Или напрямую
PORT=3001 npm start
```

### Nginx (пример конфигурации)

```nginx
server {
    listen 80;
    server_name 195.209.219.226;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Cron для напоминаний

```bash
crontab -e
# Добавить:
*/5 * * * * cd /path/to/consultations && npm run reminders >> /var/log/reminders.log 2>&1
```

---

## 10. Локальная разработка

```bash
# 1. Запуск PostgreSQL
docker start consultations-postgres

# 2. Установка зависимостей
npm install

# 3. Генерация Prisma Client
npx prisma generate

# 4. Применение миграций
npx prisma migrate dev

# 5. Сидирование (опционально)
npx prisma db seed

# 6. Запуск dev-сервера
npm run dev -- -p 3001
```

Сервис доступен: `http://localhost:3001`
Админка: `http://localhost:3001/admin`

---

## 11. Зависимости

### Production
- `next` 16.1.6 — фреймворк
- `react`, `react-dom` 19.2.3 — UI
- `@prisma/client` 7.4.2 — ORM клиент
- `@prisma/adapter-pg` 7.4.2 — PostgreSQL адаптер для Prisma
- `pg` 8.20.0 — PostgreSQL драйвер
- `prisma` 7.4.2 — CLI и миграции
- `nodemailer` 8.x — отправка email

### Development
- `typescript` 5.x
- `tsx` 4.21.0 — запуск TS-скриптов (seed, reminders)
- `@types/node`, `@types/react`, `@types/react-dom`, `@types/nodemailer`, `@types/pg`
- `eslint`, `eslint-config-next`
