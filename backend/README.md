# PHP API · optional deployment

Этот код включён в поставку, но **не развёрнут на текущем Node.js Render**. Для работы облачных аккаунтов нужны PHP 8.2+ (pdo_mysql) и собственная MySQL/MariaDB. Бесплатный Node.js web service не исполняет этот PHP.

## OpenServer / PHP + MySQL
1. Создайте БД и отдельного пользователя с правами только на неё. Импортируйте schema.mysql.sql через phpMyAdmin или mysql CLI.
2. Разместите api.php в PHP-обслуживаемом `/api/` **вне Vite public**. Секреты передавайте переменными окружения PHP:
   - DB_DSN=mysql:host=127.0.0.1;dbname=forest;charset=utf8mb4
   - DB_USER=forest_app
   - DB_PASSWORD=<свой пароль>
   - COOKIE_SECURE=1 (для локального HTTP допускается 0, в интернете только 1)
3. Веб-сервер должен обслуживать клиент и PHP API с одного origin, например `https://game.example/api/api.php`. Отдельный Node.js процесс обрабатывает `/party` через reverse proxy WebSocket. CORS специально не открыт.
4. Сборка клиента: переменная VITE_API_BASE=/api/api.php, затем npm run build. Не задавайте DB_PASSWORD как VITE_*: такие значения попадают в браузер.
5. После развёртывания кнопка «Аккаунт» открывает регистрацию/вход и операции слота. До подключения API игра честно показывает локальный режим.

## API
GET ?action=session — email текущей сессии и CSRF-токен.
POST register / login — email, password, X-CSRF-Token.
GET save — один слот текущего пользователя, revision.
POST save — save, revision; 409 при конкурирующей записи.
POST logout — завершение сессии.

Пароли хешируются password_hash; запросы подготовленные; авторство слота берётся из серверной сессии, а не из user_id запроса. Cookies HttpOnly, SameSite=Lax, Secure в production. Необходимо HTTPS, защита rate-limit на reverse proxy, резервное копирование БД и аудит перед публичным запуском. Нет email verification, password reset, античита или защиты от перебора через новые сессии. Прогресс передаётся клиентом и не является серверно подтверждённой игровой экономикой.

Тестовая SQLite-схема используется только в интеграционном тесте — это не подмена требуемой MySQL в production. MySQL-развёртывание требует проверки на вашем сервере.
