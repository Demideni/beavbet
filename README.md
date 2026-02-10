# BeavBet (MVP UI)

Темное лобби казино (структура 1:1 как референс): Sidebar + Topbar + Hero Carousel + Promo tiles.

## Запуск локально
```bash
npm i
npm run dev
```
Открой: http://localhost:3000

## Где менять баннеры
- Картинки: `public/banners/*`
- Контент: `app/content/banners.ts`

## Деплой на Render
1) Залей репозиторий на GitHub.
2) Render → New → Web Service → подключи репо.
3) Build Command:
```bash
npm ci && npm run build
```
4) Start Command:
```bash
npm run start
```
5) Environment:
- `NODE_VERSION` (например 20)
- (позже) `PASSIMPAY_*`, `DATABASE_URL` и т.д.

## Дальше по плану
- Каталог игр /casino
- Auth
- Касса /payments + PassimPay (create + webhook)


## Render (important)
If you deploy to Render and use the built-in SQLite DB, you must attach a **Persistent Disk** and set the DB path to the disk (otherwise the DB resets on every deploy).

Recommended:
- Mount path: `/var/data`
- Env: `DB_PATH=/var/data/beavbet.db`

