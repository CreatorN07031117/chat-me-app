# Chat Me

Веб-приложение для переписки через WhatsApp API GREEN-API. Пользователь вводит credentials инстанса, выбирает номер собеседника, отправляет сообщения из приложения и получает ответы из WhatsApp в том же чате.

## Что использовано

- React 19 и TypeScript.
- Vite 8 для разработки и production-сборки.
- CSS Modules и CSS custom properties для стилизации и светлой/тёмной темы.
- GREEN-API WhatsApp HTTP API:
  - `getStateInstance` — проверка credentials;
  - `sendMessage` — отправка текстовых сообщений;
  - `receiveNotification` — long polling входящих уведомлений;
  - `deleteNotification` — подтверждение обработки уведомления.
- Нативный `fetch` без дополнительного HTTP-клиента.
- ESLint для проверки исходников.

Документация API: [GREEN-API WhatsApp](https://green-api.com/docs/api/).

## Архитектура

Структура проекта:

```text
src/
├── app/                    # Точка сборки приложения, провайдер темы и глобальные стили
├── features/
│   └── auth/               # Форма credentials и проверка авторизации инстанса
├── widgets/
│   └── chat/               # Экран чата и редактор сообщения
├── shared/
│   ├── api/                # Клиент GREEN-API и типы API-моделей
│   ├── config/theme/       # Контекст и переключение темы
│   └── ui/                 # Переиспользуемые UI-компоненты, включая Modal
└── assets/                 # Изображения, SVG и фоновые ресурсы
```

Основной сценарий:

1. `AuthorizationScreen` получает `idInstance` и `apiTokenInstance` из формы.
2. `getInstanceState` отправляет запрос на `https://7201.api.green-api.com`.
3. При состоянии `authorized` пользователь вводит номер собеседника.
4. `Chat` отправляет текст через `sendMessage` с `chatId` в формате `7XXXXXXXXXX@c.us`.
5. Параллельно `Chat` получает уведомления через `receiveNotification`, оставляет только входящие текстовые сообщения выбранного номера и подтверждает каждое уведомление через `deleteNotification`.

Credentials хранятся только в памяти приложения и не записываются в `localStorage` или файлы.

## Настройка GREEN-API

Для получения сообщений через HTTP API у инстанса должны быть настроены входящие уведомления:

- `webhookUrl` должен быть пустым;
- входящие уведомления должны быть включены (`incomingWebhook`).

Настроить это можно в личном кабинете GREEN-API или через настройки инстанса. Если у инстанса задан custom webhook, `receiveNotification` не сможет получать сообщения из очереди.

Полезные разделы документации:

- [Проверка состояния инстанса](https://green-api.com/docs/api/account/GetStateInstance/)
- [Отправка текста](https://green-api.com/docs/api/sending/SendMessage/)
- [Получение уведомления](https://green-api.com/docs/api/receiving/technology-http-api/ReceiveNotification/)
- [Удаление уведомления](https://green-api.com/docs/api/receiving/technology-http-api/DeleteNotification/)

## Запуск

Требуется Node.js и npm.

```bash
npm install
npm run dev
```

После запуска приложение будет доступно по адресу, который выведет Vite, обычно `http://localhost:5173`.

## Команды проекта

```bash
npm run dev       # запуск dev-сервера с HMR
npm run build     # проверка TypeScript и production-сборка
npm run lint      # проверка ESLint
npm run preview   # локальный просмотр production-сборки
```

## Копирайтинг и иконки

Копирайтинг иконок: [laterunlabs](https://www.flaticon.com/ru/authors/laterunlabs).
