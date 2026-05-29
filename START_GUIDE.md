# Простой гайд по запуску и хостингу Creepy Machine

Этот гайд актуален на 28 мая 2026 года.

## Очень коротко

Тебе нужен не обычный «файловый» хостинг, а `VPS/VDS`, где можно запускать `Node.js`.

Схема такая:

1. Кладём проект на сервер.
2. Ставим `Node.js`.
3. Прописываем секреты в `.env`.
4. Запускаем сайт.
5. Подключаем домен и `HTTPS`.

## Что нужно

- Сервер на Linux, лучше `Ubuntu 22.04` или `Ubuntu 24.04`
- `Node.js 22 LTS`
- `Git`
- `Nginx`
- Домен, если сайт должен открываться красиво, а не по IP

Если у тебя обычный shared hosting без Node.js, этот проект там не взлетит.

## Как положить проект на сервер

### Вариант 1. Через Git

```bash
cd /var/www
git clone <URL-репозитория> creepy-machine
cd creepy-machine
```

### Вариант 2. Через архив

1. Залей папку проекта на сервер.
2. Распакуй её.
3. Открой папку в терминале.

## Как поставить зависимости

```bash
npm install
```

Если сервер ругается на `better-sqlite3`, попробуй:

```bash
npm rebuild better-sqlite3
```

## Как сделать файл настроек

Скопируй пример:

```bash
cp .env.example .env
```

Открой `.env` и заполни главное:

```env
PORT=3000
SESSION_SECRET=put-a-long-random-secret-here
DB_ENCRYPTION_KEY=put-a-long-random-secret-here-too

GOOGLE_CLIENT_ID=
TEMP_GOOGLE_AUTH_ENABLED=false
DEV_AUTH_ENABLED=false

OPENROUTER_API_KEY=
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=
ADMIN_PASSWORD=creepy2024
```

Что важно помнить:

- `SESSION_SECRET` и `DB_ENCRYPTION_KEY` должны быть длинными и случайными
- Для генерации ключа можно использовать:

```bash
openssl rand -hex 32
```

- Если ты ещё тестируешь сайт, можно временно оставить `DEV_AUTH_ENABLED=true`
- Для настоящего запуска лучше выключить `DEV_AUTH_ENABLED`

## Как запустить сайт

Самый простой запуск:

```bash
npm start
```

Проверка:

- Сайт: `http://SERVER_IP:3000`
- Админка: `http://SERVER_IP:3000/admin.html`

Если хочется, чтобы сайт не падал после закрытия терминала, используй `pm2`:

```bash
npm i -g pm2
pm2 start npm --name creepy-machine -- start
pm2 save
```

## Как открыть сайт по домену

### 1. Поставь Nginx

```bash
sudo apt update
sudo apt install -y nginx
```

### 2. Сделай прокси на Node.js

Создай файл, например:

`/etc/nginx/sites-available/creepy-machine`

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Включи сайт:

```bash
sudo ln -s /etc/nginx/sites-available/creepy-machine /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Подключи HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## Как проверить, что всё живое

Открой в браузере:

1. Главную страницу
2. Страницу подписки
3. `Конфиденциальность`
4. `Условия`
5. `Админку`

Проверь, что:

- Футер выглядит нормально
- FAQ на подписке показывает нормальные ответы
- Контакты ведут на `tretyaaakov@gmail.com`
- Сайт открывается и не показывает ошибки

## Как обновить сайт позже

Если проект уже стоит на сервере:

```bash
cd /var/www/creepy-machine
git pull
npm install
pm2 restart creepy-machine
```

Если ты не используешь `pm2`, просто останови старый процесс и запусти `npm start` снова.

## Что обязательно хранить в запасе

- `.env`
- `data/creepy-machine.db`

Сделай копию на всякий случай:

```bash
mkdir -p /var/backups/creepy-machine
cp .env /var/backups/creepy-machine/.env.backup
cp data/creepy-machine.db /var/backups/creepy-machine/creepy-machine.db.backup
```

## Если что-то сломалось

- Если не работает вход через Google, проверь `GOOGLE_CLIENT_ID`
- Если не работают оплаты, проверь `YOOKASSA_SHOP_ID` и `YOOKASSA_SECRET_KEY`
- Если сайт не запускается, посмотри логи:

```bash
pm2 logs creepy-machine
```

- Если SQLite ругается после обновления Node.js, попробуй:

```bash
npm rebuild better-sqlite3
```

