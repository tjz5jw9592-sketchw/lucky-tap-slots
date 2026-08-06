# Lucky Tap Slots — Telegram Tap-to-Earn MVP

Mobilna gra Tap-to-Earn w klimacie neonowych automatów. Jest to **social casino na wirtualne punkty**: bez wpłat, wypłat i gry o prawdziwe pieniądze.

## Funkcje

- tapowanie generujące monety i ładujące darmowy Lucky Spin,
- automat 3×3 z ośmioma liniami,
- progresywny wirtualny jackpot,
- energia, combo, ulepszenia i pasywny dochód,
- dzienna nagroda, ranking i historia wygranych,
- wyniki spinów generowane na backendzie,
- kontrola szybkości tapowania,
- walidacja Telegram `initData`,
- responsywny interfejs i Haptic Feedback,
- brak zewnętrznych zależności npm.

## Lokalny start

Wymagany Node.js 20+.

```bash
node server/index.js
```

Otwórz `http://localhost:3001`. Lokalnie domyślnie działa konto demonstracyjne.

## Start produkcyjny

```bash
BOT_TOKEN=TOKEN_Z_BOTFATHER ALLOW_DEV_AUTH=false node server/index.js
```

## Telefon i Telegram

Pełna instrukcja publikacji znajduje się w pliku:

```text
DEPLOY-TELEGRAM.md
```

Projekt zawiera także:

- `render.yaml` — wdrożenie przez Render Blueprint,
- `Dockerfile` — alternatywne wdrożenie kontenerowe,
- `.env.example` — lista zmiennych środowiskowych,
- `/health` — endpoint kontroli działania serwera.

## Przed większą publikacją

- zastąp plik JSON bazą PostgreSQL,
- użyj Redis do rozproszonego rate limitingu i blokad,
- dodaj testy, monitoring, kopie zapasowe, regulamin i politykę prywatności,
- sprawdź wymogi wiekowe i prawne dla stylistyki kasynowej,
- nie dodawaj wymienialnych nagród ani płatnych stawek bez analizy prawnej.
