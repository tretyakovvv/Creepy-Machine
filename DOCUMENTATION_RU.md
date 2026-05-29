# Creepy Machine — полная документация (RU)

## 1. О проекте

Creepy Machine — веб-приложение для генерации хоррор-историй (creepypasta) с:

- генерацией текста через AI-провайдеров (OpenRouter / DeepSeek / кастомный OpenAI-compatible),
- авторизацией (Google, Guest, Dev/Test),
- подписками и лимитами генераций,
- админ-панелью для настройки контента и AI-провайдеров,
- локальной SQLite-базой.

Текущий стек:

- Frontend: Vanilla JS + HTML + CSS
- Backend: Node.js + Express
- DB: SQLite (`better-sqlite3`)
- Auth: Google ID token + локальные сессии

## 2. Структура проекта

- `index.html` — главная страница
- `subscription.html` — страница подписок (планы, FAQ, реквизиты)
- `privacy.html`, `terms.html` — юридические страницы
- `admin.html` — админ-панель
- `js/` — фронтенд-логика
- `server/` — backend API и работа с БД
- `data/` — SQLite файлы БД
- `.env` — переменные окружения
- `.env.example` — шаблон переменных окружения

## 3. Требования

- Node.js 22 LTS (рекомендуется)
- npm 10+
- Linux/macOS/Windows

Проверка:

```bash
node -v
npm -v
```

## 4. Локальный запуск

### 4.1 Установка

```bash
npm install
cp .env.example .env
```

### 4.2 Обязательная настройка `.env`

Минимально:

- `PORT=3000`
- `SESSION_SECRET=<длинный-случайный-секрет>`
- `DB_ENCRYPTION_KEY=<64 hex символа>`

Сгенерировать ключ шифрования:

```bash
openssl rand -hex 32
```

### 4.3 Старт

```bash
npm start
```

Откроется на:

- `http://localhost:3000`
- админка: `http://localhost:3000/admin.html`

## 5. Конфигурация окружения (.env)

Ключевые переменные:

- `PORT` — порт backend
- `SESSION_SECRET` — секрет подписи/защиты сессий
- `DATABASE_PATH` — путь к SQLite
- `DB_ENCRYPTION_KEY` — шифрование чувствительных данных в БД
- `OPENROUTER_API_KEY` — ключ OpenRouter
- `DEEPSEEK_API_KEY` — ключ DeepSeek
- `GOOGLE_CLIENT_ID` — OAuth клиент Google
- `TEMP_GOOGLE_AUTH_ENABLED` — временный тестовый вход (в production `false`)
- `DEV_AUTH_ENABLED` — dev-вход (в production `false`)
- `ADMIN_PASSWORD` — пароль админ API
- `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY` — платежи
- `SITE_URL` — публичный адрес сайта для возврата из ЮKassa и Google OAuth

## 6. Авторизация и режимы

- **Google Auth**: включается при заполненном `GOOGLE_CLIENT_ID`.
- **Guest Auth**: доступен для быстрого входа.
- **Dev/Test login**: только для разработки, отключить на хостинге.

Для production:

- `TEMP_GOOGLE_AUTH_ENABLED=false`
- `DEV_AUTH_ENABLED=false`
- `ADMIN_PASSWORD` заменить на сложный уникальный.

## 7. Подписки, FAQ, реквизиты

Источник данных:

- дефолтно: `js/config.js`
- при наличии серверных настроек: таблица `settings` в SQLite

Редактирование без деплоя:

1. Открыть `admin.html`
2. Вкладка `Legal & FAQ` / `Subscription Page`
3. Обновить JSON поля:
   - `FAQ (JSON)`
   - `Business details / requisites (JSON)`
   - `Subscription page content (JSON)`
4. Нажать `Save all`

Примечание: FAQ и реквизиты поддерживают как обычные строки, так и мультиязычный формат вида `{ "ru": "...", "en": "..." }`.

## 8. Backend API (основное)

- `GET /api/health` — проверка состояния сервера
- `GET /api/content` — контент (fandoms/genres/faq/requisites/legal)
- `POST /api/auth/google` — вход через Google
- `POST /api/auth/guest` — гостевой вход
- `GET /api/auth/me` — текущий пользователь
- `DELETE /api/auth/account` — удаление аккаунта
- `POST /api/generate` — генерация текста
- `POST /api/payments/create` — создание платежа / mock-активация
- `GET /api/admin/settings` — чтение админ-настроек
- `PUT /api/admin/settings` — сохранение админ-настроек

## 9. Проверка перед загрузкой на хост

Чеклист:

1. `.env` заполнен боевыми значениями.
2. `SESSION_SECRET` и `DB_ENCRYPTION_KEY` заданы.
3. `ADMIN_PASSWORD` изменён со стандартного.
4. Dev/temporary auth отключены.
5. Сайт запускается без ошибок (`npm start`).
6. `GET /api/health` возвращает `ok: true`.
7. Проверены страницы: главная, подписка, privacy, terms, admin.
8. Проверено сохранение настроек через админку.

## 10. Деплой на хост (Node.js + PM2 + Nginx)

### 10.1 Подготовка сервера (Ubuntu)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx certbot python3-certbot-nginx git
```

Установите Node.js 22 LTS, затем проверьте:

```bash
node -v
npm -v
```

### 10.2 Развёртывание проекта

```bash
sudo mkdir -p /var/www/creepy-machine
sudo chown $USER:$USER /var/www/creepy-machine
cd /var/www/creepy-machine
# git clone <repo> .
npm install
cp .env.example .env
```

Отредактируйте `.env` под прод.

### 10.3 Запуск через PM2

```bash
sudo npm i -g pm2
pm2 start npm --name creepy-machine -- start
pm2 save
pm2 startup
```

Проверка:

```bash
pm2 status
pm2 logs creepy-machine --lines 100
curl http://127.0.0.1:3000/api/health
```

### 10.4 Nginx reverse proxy

Файл `/etc/nginx/sites-available/creepy-machine`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Активация:

```bash
sudo ln -s /etc/nginx/sites-available/creepy-machine /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 10.5 HTTPS (Let's Encrypt)

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
sudo certbot renew --dry-run
```

## 11. Обновление на проде

```bash
cd /var/www/creepy-machine
# git pull
npm install
pm2 restart creepy-machine
pm2 logs creepy-machine --lines 100
```

Если обновлялся Node.js:

```bash
npm rebuild better-sqlite3
pm2 restart creepy-machine
```

## 12. Резервное копирование

Бэкапить:

- `.env`
- `data/` (SQLite)

Пример:

```bash
tar -czf backup-creepy-machine-$(date +%F).tar.gz .env data
```

## 13. Типовые проблемы

1. Не создаётся платёж ЮKassa
- Проверьте `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`, `SITE_URL` и webhook `/api/payments/yookassa/webhook` в кабинете ЮKassa. Без ключей локально используется тестовая активация.

2. Ошибка AI-генерации
- Проверьте `OPENROUTER_API_KEY`/`DEEPSEEK_API_KEY` и настройки провайдеров в админке.

3. Не работает Google вход
- Проверьте `GOOGLE_CLIENT_ID`, origin/redirect в Google Cloud Console.

4. Не читаются старые зашифрованные данные
- Проверьте корректность `DB_ENCRYPTION_KEY` и что ключ не менялся после записи данных.

## 14. Рекомендации по безопасности

- Всегда меняйте `ADMIN_PASSWORD` и `SESSION_SECRET`.
- Держите `.env` вне публичных репозиториев.
- Включайте HTTPS в production.
- Отключайте тестовые режимы авторизации.
- Ограничьте доступ к серверу (firewall, fail2ban, минимальные открытые порты).

## 15. Краткая команда для локального теста

```bash
npm start
# затем откройте http://localhost:3000
```
