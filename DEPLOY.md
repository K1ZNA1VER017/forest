# Бесплатное размещение на Render

Проект подготовлен к размещению; файл render.yaml описывает бесплатный Node.js web service. Сам сервис ещё не создан.

1. Создайте аккаунт Render: https://dashboard.render.com/ . Пароли и секреты в чат не отправляйте.
2. Загрузите файлы этого каталога в Git-репозиторий (например, GitHub), не добавляя node_modules. Файлы package.json, server.mjs и render.yaml должны быть в корне репозитория.
3. В Render выберите New → Blueprint, подключите репозиторий и примените render.yaml. Проверьте, что выбран тариф Free, а не платный.
4. Если используете New → Web Service вместо Blueprint, задайте:
   - Runtime: Node
   - Build command: npm ci --include=dev && npm run build
   - Start command: npm start
   - Plan: Free
   - Environment: NODE_ENV=production, NODE_VERSION=22
   - Health check: /healthz
5. После успешного деплоя Render покажет HTTPS-адрес. Это и будет ссылка на игру; придумывать её до создания сервиса нельзя.
6. Проверьте вход, создание комнаты и подключение друга по тому же адресу и коду комнаты.

Ограничения: тариф Free засыпает после 15 минут без входящего HTTP/WebSocket трафика; пробуждение занимает примерно минуту. 750 бесплатных часов в месяц делятся между сервисами workspace. Условия: https://render.com/docs/free . Комнаты живут в памяти и пропадают при перезапуске/деплое. Сохранения игроков находятся в браузере, база данных не требуется. Это тестовый прототип, не защищённый production-сервис.

В production сервер раздаёт собранный dist и WebSocket на одном порту process.env.PORT, без Vite dev middleware.
