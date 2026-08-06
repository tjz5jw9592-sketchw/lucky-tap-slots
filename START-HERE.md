# Zacznij tutaj — Lucky Tap Slots

## Test na komputerze

Wymagany jest Node.js 20 lub nowszy.

```bash
node server/index.js
```

Otwórz `http://localhost:3001`.

## Wrzucenie na GitHub z telefonu

1. Rozpakuj ZIP w aplikacji Pliki.
2. Otwórz repozytorium GitHub w przeglądarce i włącz „Witryna na komputer”.
3. Wybierz **Add file → Upload files**.
4. Prześlij zawartość folderu `lucky-tap-slots` — nie sam folder nadrzędny.
5. Kliknij **Commit changes**.

W katalogu głównym repo powinny znaleźć się m.in. `package.json`, `render.yaml`, `Dockerfile`, `client` i `server`.

## Wdrożenie

Pełna instrukcja znajduje się w `DEPLOY-TELEGRAM.md`.

Najważniejsze zmienne środowiskowe:

```env
BOT_TOKEN=token_z_BotFather
ALLOW_DEV_AUTH=false
DATA_DIR=/var/data
```

Nigdy nie publikuj tokena bota w repozytorium.
