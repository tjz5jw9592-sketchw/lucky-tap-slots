# Uruchomienie Lucky Tap Slots na telefonie w Telegramie

## Co będzie potrzebne

- konto Telegram,
- konto GitHub,
- konto Render,
- token bota z `@BotFather`.

## 1. Utwórz bota

1. W Telegramie otwórz `@BotFather`.
2. Wyślij `/newbot`.
3. Ustaw nazwę i unikalny username kończący się na `bot`.
4. Skopiuj token. Nie publikuj go i nie wpisuj do plików projektu.

## 2. Umieść projekt na GitHubie

1. Rozpakuj ZIP.
2. Utwórz nowe prywatne repozytorium na GitHubie.
3. Wgraj całą zawartość folderu `tap-empire`, łącznie z `render.yaml`.

Przykład z terminala:

```bash
git init
git add .
git commit -m "Lucky Tap Slots"
git branch -M main
git remote add origin ADRES_TWOJEGO_REPO
git push -u origin main
```

## 3. Wdróż na Render

### Sposób najprostszy — Blueprint

1. Zaloguj się do Render.
2. Wybierz **New → Blueprint**.
3. Połącz repozytorium GitHub.
4. Render odczyta `render.yaml`.
5. Przy zmiennej `BOT_TOKEN` wklej token z BotFather.
6. Uruchom wdrożenie.
7. Po zakończeniu skopiuj adres HTTPS, np. `https://lucky-tap-slots.onrender.com`.

Konfiguracja używa płatnego planu Starter z trwałym dyskiem 1 GB, ponieważ lokalny plik JSON musi przetrwać restarty i wdrożenia. Do większej wersji gry należy przejść na PostgreSQL.

### Test

Otwórz w przeglądarce:

```text
https://TWOJ-ADRES.onrender.com/health
```

Powinna pojawić się odpowiedź ze statusem `ok`.

## 4. Podepnij Mini App do Telegrama

1. Otwórz `@BotFather`.
2. Wybierz `/mybots` i swojego bota.
3. Wejdź w **Bot Settings → Configure Mini App** lub ustaw **Main Mini App**.
4. Wklej publiczny adres HTTPS z Render.
5. Ustaw nazwę aplikacji, krótki opis i ikonę.

Możesz także ustawić przycisk menu:

1. `/mybots` → bot → **Bot Settings → Menu Button**.
2. Wybierz konfigurację Web App.
3. Podaj ten sam adres HTTPS.
4. Ustaw tekst, np. `🎰 Zagraj`.

## 5. Uruchom na telefonie

1. Otwórz swojego bota w aplikacji Telegram na telefonie.
2. Kliknij przycisk **Launch app** albo `🎰 Zagraj`.
3. Gra otworzy się wewnątrz Telegrama i zaloguje użytkownika przez `initData`.

## Ważne ustawienia produkcyjne

Na Render muszą być ustawione:

```text
BOT_TOKEN=token z BotFather
ALLOW_DEV_AUTH=false
DATA_DIR=/var/data
```

`ALLOW_DEV_AUTH=false` blokuje konto demonstracyjne i wymaga prawidłowego uruchomienia z Telegrama.

## Aktualizowanie gry

Po zmianach:

```bash
git add .
git commit -m "Aktualizacja gry"
git push
```

Render automatycznie wdroży nową wersję.

## Bezpieczeństwo

- Nigdy nie publikuj tokena bota.
- Używaj wyłącznie adresu HTTPS.
- Nie dodawaj wpłat, wypłat ani wymienialnych nagród bez analizy prawnej.
- Obecny zapis JSON jest odpowiedni dla MVP i pojedynczej instancji. Dla większego ruchu użyj PostgreSQL oraz Redis.
