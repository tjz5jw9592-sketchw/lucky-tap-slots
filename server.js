const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");
const {
  registerAdminRoutes
} = require("./admin");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;

const SPIN_TARGET = 25;
const DEFAULT_MAX_ENERGY = 5000;
const ENERGY_REGEN_SECONDS = 10;
const MAX_TAPS_PER_SECOND = 12;

const STORY_CHAPTERS = [
  {
    chapter: 1,
    minLevel: 1,
    title: "Pierwszy Automat",
    subtitle: "Początek Lucky City",
    description:
      "W opuszczonym lokalu znajdujesz stary automat. To od niego zaczyna się Twoja droga do fortuny.",
    objective:
      "Zdobądź Level 2, aby otworzyć Neon Alley.",
    icon: "🎰"
  },
  {
    chapter: 2,
    minLevel: 2,
    title: "Neon Alley",
    subtitle: "Miasto budzi się nocą",
    description:
      "Neony prowadzą Cię do pierwszego prawdziwego klubu. Krążą plotki o ukrytym sejfie pełnym Lucky Coins.",
    objective:
      "Zdobądź Level 3, aby dostać się do magazynu.",
    icon: "🌃"
  },
  {
    chapter: 3,
    minLevel: 3,
    title: "Dzwon Fortuny",
    subtitle: "Sekret starego magazynu",
    description:
      "W magazynie odnajdujesz złoty dzwon. Podobno jego dźwięk przyciąga największe jackpoty w całym Lucky City.",
    objective:
      "Dobij do Levelu 5, aby otworzyć Salę VIP.",
    icon: "🔔"
  },
  {
    chapter: 4,
    minLevel: 5,
    title: "Sala VIP",
    subtitle: "Gra o większą stawkę",
    description:
      "Wchodzisz na piętro, na które zwykli gracze nie mają dostępu. Tutaj zaczyna się prawdziwa rywalizacja.",
    objective:
      "Zdobądź Level 8, aby otworzyć Diamond Casino.",
    icon: "👑"
  },
  {
    chapter: 5,
    minLevel: 8,
    title: "Diamond Casino",
    subtitle: "Serce Lucky City",
    description:
      "Największe kasyno w mieście stoi przed Tobą otworem. Każdy spin przybliża Cię do legendy Lucky City.",
    objective:
      "Zdobądź Level 12, aby wejść do Crypto District.",
    icon: "💎"
  },
  {
    chapter: 6,
    minLevel: 12,
    title: "Crypto District",
    subtitle: "Nowa dzielnica",
    description:
      "Na obrzeżach miasta powstała futurystyczna dzielnica kolekcjonerów, traderów i łowców cyfrowych trofeów.",
    objective:
      "Zdobądź Level 20, aby dotrzeć do TON Tower.",
    icon: "🌐"
  },
  {
    chapter: 7,
    minLevel: 20,
    title: "TON Tower",
    subtitle: "Szczyt Lucky City",
    description:
      "Najwyższa wieża miasta. Tylko najbardziej aktywni gracze mogą wejść na sam szczyt i zdobyć status Legendy.",
    objective:
      "Rozwijaj konto i walcz o pierwsze miejsce w rankingu.",
    icon: "🏙️"
  }
];

const STAR_PRODUCTS = {
  spins5: {
    price: 50,
    title: "5 Lucky Spins",
    description: "5 bonusowych Lucky Spinów.",
    type: "spins",
    value: 5
  },

  energy500: {
    price: 75,
    title: "Full Energy",
    description: "Uzupełnia energię do maksimum.",
    type: "energy",
    value: DEFAULT_MAX_ENERGY
  },

  x2day: {
    price: 150,
    title: "x2 Tap 24H",
    description: "Podwójne monety za tap przez 24 godziny.",
    type: "x2",
    value: 24
  },

  vip30: {
    price: 299,
    title: "VIP 30 dni",
    description: "VIP na 30 dni + 10 Lucky Spinów.",
    type: "vip",
    value: 30
  }
};

const COIN_PRODUCTS = {
  spin1: {
    price: 250,
    type: "spin",
    value: 1
  },

  energy100: {
    price: 1000,
    type: "energy",
    value: 100
  },

  x2_30m: {
    price: 5000,
    type: "x2",
    value: 30
  }
};

const REWARD_CATALOG = {
  coupon5: {
    cost: 5000,
    minLevel: 5,
    label: "Kupon promocyjny 5 PLN",
    type: "coupon"
  },

  coupon10: {
    cost: 10000,
    minLevel: 10,
    label: "Kupon promocyjny 10 PLN",
    type: "coupon"
  },

  giveaway: {
    cost: 3000,
    minLevel: 3,
    label: "Wejście do giveaway Stars",
    type: "giveaway_entry"
  }
};

const MISSIONS = {
  taps100: {
    title: "Rozgrzewka — 100 tapów",
    description:
      "Rozruszaj automat i rozpocznij dzień w Lucky City.",
    field: "taps",
    target: 100,
    coins: 250,
    rp: 10,
    xp: 50,
    difficulty: "easy"
  },

  taps500: {
    title: "Neonowy rytm — 500 tapów",
    description:
      "Utrzymaj tempo i rozświetl Neon Alley.",
    field: "taps",
    target: 500,
    coins: 900,
    rp: 25,
    xp: 100,
    difficulty: "normal"
  },

  taps1000: {
    title: "Łowca Jackpota — 1000 tapów",
    description:
      "Tysiąc tapów dziennie to znak prawdziwego gracza.",
    field: "taps",
    target: 1000,
    coins: 1800,
    rp: 45,
    xp: 180,
    difficulty: "hard"
  },

  taps2500: {
    title: "Król Lucky City — 2500 tapów",
    description:
      "Przejmij kontrolę nad nocą w Lucky City.",
    field: "taps",
    target: 2500,
    coins: 4500,
    rp: 90,
    xp: 350,
    difficulty: "epic"
  },

  taps5000: {
    title: "Legenda Lucky City — 5000 tapów",
    description:
      "Maksymalna dzienna próba dla najbardziej aktywnych graczy.",
    field: "taps",
    target: 5000,
    coins: 10000,
    rp: 200,
    xp: 750,
    difficulty: "legendary"
  },

  spins5: {
    title: "5 Lucky Spinów",
    description:
      "Uruchom maszynę pięć razy.",
    field: "spins",
    target: 5,
    coins: 500,
    rp: 15,
    xp: 75,
    difficulty: "easy"
  },

  spins15: {
    title: "Nocny gracz — 15 spinów",
    description:
      "Rozkręć noc w Lucky City.",
    field: "spins",
    target: 15,
    coins: 1500,
    rp: 40,
    xp: 150,
    difficulty: "normal"
  },

  spins30: {
    title: "Mistrz maszyny — 30 spinów",
    description:
      "Udowodnij, że automat nie ma przed Tobą tajemnic.",
    field: "spins",
    target: 30,
    coins: 3500,
    rp: 80,
    xp: 300,
    difficulty: "hard"
  }
};

const pool = new Pool({
  connectionString: DATABASE_URL
});

registerAdminRoutes({
  app,
  pool,
  adminPassword:
    process.env.ADMIN_PASSWORD,
  signingSecret:
    BOT_TOKEN
});

const tapWindows = new Map();
function allowTap(telegramId) {
  const now = Date.now();
  const key = String(telegramId);

  const old =
    tapWindows.get(key) || [];

  const fresh =
    old.filter(
      (time) =>
        now - time < 1000
    );

  if (
    fresh.length >=
    MAX_TAPS_PER_SECOND
  ) {
    tapWindows.set(
      key,
      fresh
    );

    return false;
  }

  fresh.push(now);

  tapWindows.set(
    key,
    fresh
  );

  return true;
}

function levelFromXp(xp) {
  return (
    Math.floor(
      Number(xp || 0) / 250
    ) + 1
  );
}

function getStoryForLevel(level) {
  const playerLevel =
    Number(level || 1);

  let current =
    STORY_CHAPTERS[0];

  for (
    const chapter
    of STORY_CHAPTERS
  ) {
    if (
      playerLevel >=
      chapter.minLevel
    ) {
      current = chapter;
    }
  }

  const currentIndex =
    STORY_CHAPTERS.findIndex(
      (chapter) =>
        chapter.chapter ===
        current.chapter
    );

  const next =
    STORY_CHAPTERS[
      currentIndex + 1
    ] || null;

  return {
    current: {
      ...current,
      unlocked: true
    },

    next,

    chapters:
      STORY_CHAPTERS.map(
        (chapter) => ({
          ...chapter,

          unlocked:
            playerLevel >=
            chapter.minLevel
        })
      )
  };
}

function referralCodeFor(id) {
  return crypto
    .createHash("sha256")
    .update(
      `${id}:${BOT_TOKEN || "bot"}`
    )
    .digest("hex")
    .slice(0, 10)
    .toUpperCase();
}

async function telegram(
  method,
  body
) {
  if (!BOT_TOKEN) {
    throw new Error(
      "Brak BOT_TOKEN"
    );
  }

  const response =
    await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify(body)
      }
    );

  const data =
    await response.json();

  if (!data.ok) {
    console.error(
      "Telegram API error:",
      data
    );

    throw new Error(
      data.description ||
        "Telegram API error"
    );
  }

  return data.result;
}

function validateTelegramInitData(
  initData
) {
  if (
    !initData ||
    !BOT_TOKEN
  ) {
    return null;
  }

  try {
    const params =
      new URLSearchParams(
        initData
      );

    const receivedHash =
      params.get("hash");

    if (!receivedHash) {
      return null;
    }

    params.delete("hash");

    const authDate =
      Number(
        params.get(
          "auth_date"
        ) || 0
      );

    const now =
      Math.floor(
        Date.now() / 1000
      );

    if (
      !authDate ||
      Math.abs(
        now - authDate
      ) > 86400
    ) {
      return null;
    }

    const dataCheckString =
      [...params.entries()]
        .sort(
          ([a], [b]) =>
            a.localeCompare(b)
        )
        .map(
          ([key, value]) =>
            `${key}=${value}`
        )
        .join("\n");

    const secretKey =
      crypto
        .createHmac(
          "sha256",
          "WebAppData"
        )
        .update(BOT_TOKEN)
        .digest();

    const calculatedHash =
      crypto
        .createHmac(
          "sha256",
          secretKey
        )
        .update(
          dataCheckString
        )
        .digest("hex");

    const calculatedBuffer =
      Buffer.from(
        calculatedHash,
        "hex"
      );

    const receivedBuffer =
      Buffer.from(
        receivedHash,
        "hex"
      );

    if (
      calculatedBuffer.length !==
        receivedBuffer.length ||
      !crypto.timingSafeEqual(
        calculatedBuffer,
        receivedBuffer
      )
    ) {
      return null;
    }

    const rawUser =
      params.get("user");

    if (!rawUser) {
      return null;
    }

    return {
      user:
        JSON.parse(
          rawUser
        ),

      startParam:
        params.get(
          "start_param"
        ) || null
    };
  } catch (error) {
    console.error(
      "InitData validation:",
      error
    );

    return null;
  }
}

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id BIGINT PRIMARY KEY,
      username TEXT,
      first_name TEXT,

      coins BIGINT
        NOT NULL
        DEFAULT 1000,

      energy INTEGER
        NOT NULL
        DEFAULT ${DEFAULT_MAX_ENERGY},

      max_energy INTEGER
        NOT NULL
        DEFAULT ${DEFAULT_MAX_ENERGY},

      taps BIGINT
        NOT NULL
        DEFAULT 0,

      spin_progress INTEGER
        NOT NULL
        DEFAULT 0,

      free_spins INTEGER
        NOT NULL
        DEFAULT 0,

      created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

      updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS
      xp BIGINT
      NOT NULL
      DEFAULT 0
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS
      reward_points BIGINT
      NOT NULL
      DEFAULT 0
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS
      daily_streak INTEGER
      NOT NULL
      DEFAULT 0
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS
      last_daily_claim DATE
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS
      x2_until TIMESTAMPTZ
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS
      vip_until TIMESTAMPTZ
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS
      referral_code TEXT
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS
      referred_by BIGINT
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS
      energy_updated_at
      TIMESTAMPTZ
      NOT NULL
      DEFAULT NOW()
  `);

  /*
   * Migracja starej wersji gry.
   *
   * Gracze, którzy nadal mają stary
   * max_energy = 500, dostają nowy
   * limit 5000 oraz pełny pasek.
   */
  await pool.query(
    `
    UPDATE users
    SET
      max_energy = $1,
      energy = $1,
      energy_updated_at =
        NOW(),
      updated_at =
        NOW()

    WHERE max_energy < $1
    `,
    [
      DEFAULT_MAX_ENERGY
    ]
  );

  /*
   * Zmieniamy również DEFAULT
   * w PostgreSQL, żeby nowe konta
   * zawsze startowały z 5000.
   */
  await pool.query(`
    ALTER TABLE users
    ALTER COLUMN energy
    SET DEFAULT
      ${DEFAULT_MAX_ENERGY}
  `);

  await pool.query(`
    ALTER TABLE users
    ALTER COLUMN max_energy
    SET DEFAULT
      ${DEFAULT_MAX_ENERGY}
  `);

  await pool.query(`
    CREATE UNIQUE INDEX
    IF NOT EXISTS
      users_referral_code_idx

    ON users(
      referral_code
    )
  `);

  await pool.query(`
    CREATE TABLE
    IF NOT EXISTS payments (
      telegram_payment_charge_id
        TEXT PRIMARY KEY,

      telegram_id BIGINT
        NOT NULL,

      payload TEXT
        NOT NULL,

      amount INTEGER
        NOT NULL,

      currency TEXT
        NOT NULL,

      created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE
    IF NOT EXISTS daily_stats (
      telegram_id BIGINT
        NOT NULL,

      day DATE
        NOT NULL
        DEFAULT CURRENT_DATE,

      taps BIGINT
        NOT NULL
        DEFAULT 0,

      spins INTEGER
        NOT NULL
        DEFAULT 0,

      coins_earned BIGINT
        NOT NULL
        DEFAULT 0,

      PRIMARY KEY (
        telegram_id,
        day
      )
    )
  `);

  await pool.query(`
    CREATE TABLE
    IF NOT EXISTS mission_claims (
      telegram_id BIGINT
        NOT NULL,

      day DATE
        NOT NULL,

      mission_key TEXT
        NOT NULL,

      PRIMARY KEY (
        telegram_id,
        day,
        mission_key
      )
    )
  `);

  await pool.query(`
    CREATE TABLE
    IF NOT EXISTS referrals (
      referred_id BIGINT
        PRIMARY KEY,

      referrer_id BIGINT
        NOT NULL,

      created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE
    IF NOT EXISTS reward_redemptions (
      id BIGSERIAL
        PRIMARY KEY,

      telegram_id BIGINT
        NOT NULL,

      reward_key TEXT
        NOT NULL,

      reward_label TEXT
        NOT NULL,

      rp_cost INTEGER
        NOT NULL,

      status TEXT
        NOT NULL
        DEFAULT 'pending',

      created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

      fulfilled_at TIMESTAMPTZ
    )
  `);

  await pool.query(`
    ALTER TABLE
      reward_redemptions

    ADD COLUMN IF NOT EXISTS
      refunded_at TIMESTAMPTZ
  `);

  await pool.query(`
    ALTER TABLE
      reward_redemptions

    ADD COLUMN IF NOT EXISTS
      admin_note TEXT
  `);

  await pool.query(`
    ALTER TABLE
      reward_redemptions

    ADD COLUMN IF NOT EXISTS
      fulfillment_code TEXT
  `);

  await pool.query(`
    CREATE INDEX
    IF NOT EXISTS
      reward_redemptions_user_idx

    ON reward_redemptions(
      telegram_id,
      created_at DESC
    )
  `);

  console.log(
    "✅ Database 4.0 ready"
  );
}

async function refreshEnergy(
  telegramId,
  client = pool
) {
  await client.query(
    `
    WITH regen AS (
      SELECT
        telegram_id,
        energy,
        max_energy,
        energy_updated_at,

        GREATEST(
          0,
          FLOOR(
            EXTRACT(
              EPOCH FROM (
                NOW() -
                energy_updated_at
              )
            ) / $2
          )::INTEGER
        ) AS points

      FROM users

      WHERE
        telegram_id = $1

      FOR UPDATE
    )

    UPDATE users AS u

    SET
      energy =
        LEAST(
          u.max_energy,
          u.energy +
          regen.points
        ),

      energy_updated_at =
        CASE

          /*
           * Jeżeli gracz jest już
           * na pełnej energii,
           * ustawiamy zegar na teraz.
           */
          WHEN
            u.energy >=
            u.max_energy
          THEN
            NOW()

          /*
           * Jeśli po regeneracji
           * dobijamy do maksimum,
           * również kończymy licznik.
           */
          WHEN
            u.energy +
            regen.points >=
            u.max_energy
          THEN
            NOW()

          /*
           * Jeżeli minęło np.
           * 37 sekund przy regeneracji
           * co 10 sekund,
           * dodajemy 3 energii,
           * ale zachowujemy pozostałe
           * 7 sekund.
           */
          WHEN
            regen.points > 0
          THEN
            u.energy_updated_at +
            (
              regen.points *
              $2
            ) *
            INTERVAL '1 second'

          /*
           * Jeśli nie minęło jeszcze
           * pełne 10 sekund,
           * NIE resetujemy zegara.
           */
          ELSE
            u.energy_updated_at

        END

    FROM regen

    WHERE
      u.telegram_id =
      regen.telegram_id
    `,
    [
      String(
        telegramId
      ),
      ENERGY_REGEN_SECONDS
    ]
  );
}

async function applyReferral(
  telegramId,
  startParam
) {
  if (
    !startParam ||
    !startParam.startsWith(
      "ref_"
    )
  ) {
    return;
  }

  const code =
    startParam
      .slice(4)
      .toUpperCase();

  const client =
    await pool.connect();

  try {
    await client.query(
      "BEGIN"
    );

    const current =
      await client.query(
        `
        SELECT
          referred_by

        FROM users

        WHERE
          telegram_id = $1

        FOR UPDATE
        `,
        [
          String(
            telegramId
          )
        ]
      );

    if (
      !current.rows[0] ||
      current.rows[0]
        .referred_by
    ) {
      await client.query(
        "ROLLBACK"
      );

      return;
    }

    const referrer =
      await client.query(
        `
        SELECT
          telegram_id

        FROM users

        WHERE
          referral_code = $1
        `,
        [code]
      );

    if (
      !referrer.rowCount
    ) {
      await client.query(
        "ROLLBACK"
      );

      return;
    }

    const referrerId =
      String(
        referrer.rows[0]
          .telegram_id
      );

    if (
      referrerId ===
      String(telegramId)
    ) {
      await client.query(
        "ROLLBACK"
      );

      return;
    }

    const insert =
      await client.query(
        `
        INSERT INTO referrals (
          referred_id,
          referrer_id
        )

        VALUES (
          $1,
          $2
        )

        ON CONFLICT
          DO NOTHING

        RETURNING
          referred_id
        `,
        [
          String(
            telegramId
          ),
          referrerId
        ]
      );

    if (
      insert.rowCount === 1
    ) {
      /*
       * Bonus dla zaproszonego.
       */
      await client.query(
        `
        UPDATE users
        SET
          referred_by = $2,
          coins =
            coins + 250,
          xp =
            xp + 25,
          updated_at =
            NOW()

        WHERE
          telegram_id = $1
        `,
        [
          String(
            telegramId
          ),
          referrerId
        ]
      );

      /*
       * Bonus dla zapraszającego.
       */
      await client.query(
        `
        UPDATE users
        SET
          coins =
            coins + 500,

          reward_points =
            reward_points + 20,

          xp =
            xp + 50,

          updated_at =
            NOW()

        WHERE
          telegram_id = $1
        `,
        [referrerId]
      );
    }

    await client.query(
      "COMMIT"
    );
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );

    throw error;
  } finally {
    client.release();
  }
}

async function getOrCreateUser(
  telegramUser,
  startParam
) {
  const id =
    String(
      telegramUser.id
    );

  const referralCode =
    referralCodeFor(id);

  await pool.query(
    `
    INSERT INTO users (
      telegram_id,
      username,
      first_name,
      referral_code,
      energy,
      max_energy
    )

    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $5
    )

    ON CONFLICT (
      telegram_id
    )

    DO UPDATE SET
      username =
        EXCLUDED.username,

      first_name =
        EXCLUDED.first_name,

      referral_code =
        COALESCE(
          users.referral_code,
          EXCLUDED.referral_code
        ),

      updated_at =
        NOW()
    `,
    [
      id,

      telegramUser.username ||
        null,

      telegramUser.first_name ||
        null,

      referralCode,

      DEFAULT_MAX_ENERGY
    ]
  );

  await applyReferral(
    id,
    startParam
  );

  await refreshEnergy(id);

  const refreshed =
    await pool.query(
      `
      SELECT *
      FROM users
      WHERE
        telegram_id = $1
      `,
      [id]
    );

  return refreshed.rows[0];
}

function publicUser(row) {
  if (!row) {
    return null;
  }

  const now =
    new Date();

  const x2Active =
    !!row.x2_until &&
    new Date(
      row.x2_until
    ) > now;

  const vipActive =
    !!row.vip_until &&
    new Date(
      row.vip_until
    ) > now;

  const level =
    levelFromXp(
      row.xp
    );

  const story =
    getStoryForLevel(
      level
    );

  return {
    telegramId:
      String(
        row.telegram_id
      ),

    username:
      row.username,

    firstName:
      row.first_name,

    coins:
      Number(
        row.coins || 0
      ),

    energy:
      Number(
        row.energy || 0
      ),

    maxEnergy:
      Number(
        row.max_energy ||
          DEFAULT_MAX_ENERGY
      ),

    taps:
      Number(
        row.taps || 0
      ),

    spinProgress:
      Number(
        row.spin_progress || 0
      ),

    spinTarget:
      SPIN_TARGET,

    freeSpins:
      Number(
        row.free_spins || 0
      ),

    xp:
      Number(
        row.xp || 0
      ),

    level,

    rewardPoints:
      Number(
        row.reward_points || 0
      ),

    dailyStreak:
      Number(
        row.daily_streak || 0
      ),

    referralCode:
      row.referral_code,

    x2Active,

    x2Until:
      row.x2_until,

    vipActive,

    vipUntil:
      row.vip_until,

    storyChapter:
      story.current.chapter,

    storyTitle:
      story.current.title,

    storyIcon:
      story.current.icon,

    nextStoryLevel:
      story.next
        ? story.next.minLevel
        : null
  };
}

async function requireTelegramUser(
  req,
  res,
  next
) {
  const initData =
    req.headers[
      "x-telegram-init-data"
    ];

  const validated =
    validateTelegramInitData(
      initData
    );

  if (!validated) {
    return res
      .status(401)
      .json({
        error:
          "Nieprawidłowa sesja Telegram"
      });
  }

  try {
    req.telegramUser =
      validated.user;

    req.startParam =
      validated.startParam;

    req.dbUser =
      await getOrCreateUser(
        validated.user,
        validated.startParam
      );

    next();
  } catch (error) {
    console.error(
      "User middleware:",
      error
    );

    res
      .status(500)
      .json({
        error:
          "Błąd konta gracza"
      });
  }
}

//
// HEALTH
//

app.get(
  "/health",
  async (req, res) => {
    try {
      await pool.query(
        "SELECT 1"
      );

      res.json({
        ok: true,
        database: true,
        version: "4.0",
        maxEnergy:
          DEFAULT_MAX_ENERGY,
        spinTarget:
          SPIN_TARGET
      });
    } catch (error) {
      console.error(
        "Health:",
        error
      );

      res
        .status(500)
        .json({
          ok: false,
          database: false,
          version: "4.0"
        });
    }
  }
);

//
// USER
//

app.get(
  "/api/me",
  requireTelegramUser,
  async (req, res) => {
    res.json(
      publicUser(
        req.dbUser
      )
    );
  }
);

//
// STORY / LUCKY CITY
//

app.get(
  "/api/story",
  requireTelegramUser,
  async (req, res) => {
    const user =
      publicUser(
        req.dbUser
      );

    const story =
      getStoryForLevel(
        user.level
      );

    res.json({
      level:
        user.level,

      xp:
        user.xp,

      current:
        story.current,

      next:
        story.next,

      chapters:
        story.chapters
    });
  }
);
//
// TAP
//

app.post(
  "/api/tap",
  requireTelegramUser,
  async (req, res) => {
    const telegramId =
      String(
        req.telegramUser.id
      );

    if (
      !allowTap(
        telegramId
      )
    ) {
      return res
        .status(429)
        .json({
          error:
            "Tapujesz za szybko"
        });
    }

    const client =
      await pool.connect();

    try {
      await client.query(
        "BEGIN"
      );

      await refreshEnergy(
        telegramId,
        client
      );

      const locked =
        await client.query(
          `
          SELECT *
          FROM users
          WHERE telegram_id = $1
          FOR UPDATE
          `,
          [telegramId]
        );

      const user =
        locked.rows[0];

      if (!user) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(404)
          .json({
            error:
              "Gracz nie istnieje"
          });
      }

      if (
        Number(
          user.energy
        ) <= 0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res.json(
          publicUser(user)
        );
      }

      const now =
        new Date();

      const x2Active =
        user.x2_until &&
        new Date(
          user.x2_until
        ) > now;

      const vipActive =
        user.vip_until &&
        new Date(
          user.vip_until
        ) > now;

      let tapCoins =
        x2Active
          ? 2
          : 1;

      if (vipActive) {
        tapCoins += 1;
      }

      const updated =
        await client.query(
          `
          UPDATE users
          SET
            energy =
              GREATEST(
                energy - 1,
                0
              ),

            coins =
              coins + $2,

            taps =
              taps + 1,

            xp =
              xp + 1,

            spin_progress =
              LEAST(
                $3,
                spin_progress + 1
              ),

            energy_updated_at =
              NOW(),

            updated_at =
              NOW()

          WHERE telegram_id = $1

          RETURNING *
          `,
          [
            telegramId,
            tapCoins,
            SPIN_TARGET
          ]
        );

      await client.query(
        `
        INSERT INTO daily_stats (
          telegram_id,
          day,
          taps,
          coins_earned
        )

        VALUES (
          $1,
          CURRENT_DATE,
          1,
          $2
        )

        ON CONFLICT (
          telegram_id,
          day
        )

        DO UPDATE SET
          taps =
            daily_stats.taps + 1,

          coins_earned =
            daily_stats.coins_earned +
            EXCLUDED.coins_earned
        `,
        [
          telegramId,
          tapCoins
        ]
      );

      await client.query(
        "COMMIT"
      );

      res.json(
        publicUser(
          updated.rows[0]
        )
      );
    } catch (error) {
      await client.query(
        "ROLLBACK"
      );

      console.error(
        "Tap error:",
        error
      );

      res
        .status(500)
        .json({
          error:
            "Tap failed"
        });
    } finally {
      client.release();
    }
  }
);

//
// SPIN
//

app.post(
  "/api/spin",
  requireTelegramUser,
  async (req, res) => {
    const telegramId =
      String(
        req.telegramUser.id
      );

    const client =
      await pool.connect();

    try {
      await client.query(
        "BEGIN"
      );

      const locked =
        await client.query(
          `
          SELECT *
          FROM users
          WHERE telegram_id = $1
          FOR UPDATE
          `,
          [telegramId]
        );

      const user =
        locked.rows[0];

      if (!user) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(404)
          .json({
            error:
              "Gracz nie istnieje"
          });
      }

      const useBonusSpin =
        Number(
          user.free_spins
        ) > 0;

      const useTapSpin =
        Number(
          user.spin_progress
        ) >=
        SPIN_TARGET;

      if (
        !useBonusSpin &&
        !useTapSpin
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(400)
          .json({
            error:
              "Lucky Spin nie jest gotowy"
          });
      }

      const symbols = [
        "🍒",
        "🍋",
        "💎",
        "7️⃣",
        "⭐",
        "🍀",
        "🔔",
        "🍇"
      ];

      const reels =
        Array.from(
          {
            length: 9
          },
          () =>
            symbols[
              Math.floor(
                Math.random() *
                symbols.length
              )
            ]
        );

      let win = 0;

      for (
        let row = 0;
        row < 3;
        row++
      ) {
        const i =
          row * 3;

        if (
          reels[i] ===
            reels[i + 1] &&
          reels[i] ===
            reels[i + 2]
        ) {
          if (
            reels[i] ===
            "7️⃣"
          ) {
            win += 777;
          } else if (
            reels[i] ===
            "💎"
          ) {
            win += 250;
          } else {
            win += 100;
          }
        }
      }

      if (win === 0) {
        win =
          10 +
          Math.floor(
            Math.random() *
            31
          );
      }

      const updated =
        await client.query(
          `
          UPDATE users
          SET
            coins =
              coins + $2,

            free_spins =
              CASE
                WHEN $3 = TRUE
                THEN
                  GREATEST(
                    free_spins - 1,
                    0
                  )
                ELSE
                  free_spins
              END,

            spin_progress =
              CASE
                WHEN $3 = TRUE
                THEN
                  spin_progress
                ELSE
                  0
              END,

            xp =
              xp + 10,

            updated_at =
              NOW()

          WHERE telegram_id = $1

          RETURNING *
          `,
          [
            telegramId,
            win,
            useBonusSpin
          ]
        );

      await client.query(
        `
        INSERT INTO daily_stats (
          telegram_id,
          day,
          spins,
          coins_earned
        )

        VALUES (
          $1,
          CURRENT_DATE,
          1,
          $2
        )

        ON CONFLICT (
          telegram_id,
          day
        )

        DO UPDATE SET
          spins =
            daily_stats.spins + 1,

          coins_earned =
            daily_stats.coins_earned +
            EXCLUDED.coins_earned
        `,
        [
          telegramId,
          win
        ]
      );

      await client.query(
        "COMMIT"
      );

      res.json({
        ...publicUser(
          updated.rows[0]
        ),
        reels,
        win
      });
    } catch (error) {
      await client.query(
        "ROLLBACK"
      );

      console.error(
        "Spin:",
        error
      );

      res
        .status(500)
        .json({
          error:
            "Spin failed"
        });
    } finally {
      client.release();
    }
  }
);

//
// COIN SHOP
//

app.get(
  "/api/shop/coins",
  requireTelegramUser,
  (req, res) => {
    res.json(
      COIN_PRODUCTS
    );
  }
);

app.post(
  "/api/shop/coins/:key",
  requireTelegramUser,
  async (req, res) => {
    const product =
      COIN_PRODUCTS[
        req.params.key
      ];

    if (!product) {
      return res
        .status(404)
        .json({
          error:
            "Produkt nie istnieje"
        });
    }

    const telegramId =
      String(
        req.telegramUser.id
      );

    const client =
      await pool.connect();

    try {
      await client.query(
        "BEGIN"
      );

      const locked =
        await client.query(
          `
          SELECT *
          FROM users
          WHERE telegram_id = $1
          FOR UPDATE
          `,
          [telegramId]
        );

      const user =
        locked.rows[0];

      if (!user) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(404)
          .json({
            error:
              "Gracz nie istnieje"
          });
      }

      if (
        Number(
          user.coins
        ) <
        product.price
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(400)
          .json({
            error:
              "Za mało Coins"
          });
      }

      if (
        product.type ===
        "spin"
      ) {
        await client.query(
          `
          UPDATE users
          SET
            coins =
              coins - $2,

            free_spins =
              free_spins + $3,

            updated_at =
              NOW()

          WHERE telegram_id = $1
          `,
          [
            telegramId,
            product.price,
            product.value
          ]
        );
      }

      if (
        product.type ===
        "energy"
      ) {
        await client.query(
          `
          UPDATE users
          SET
            coins =
              coins - $2,

            energy =
              LEAST(
                max_energy,
                energy + $3
              ),

            updated_at =
              NOW()

          WHERE telegram_id = $1
          `,
          [
            telegramId,
            product.price,
            product.value
          ]
        );
      }

      if (
        product.type ===
        "x2"
      ) {
        await client.query(
          `
          UPDATE users
          SET
            coins =
              coins - $2,

            x2_until =
              GREATEST(
                COALESCE(
                  x2_until,
                  NOW()
                ),
                NOW()
              ) +
              ($3 || ' minutes')::INTERVAL,

            updated_at =
              NOW()

          WHERE telegram_id = $1
          `,
          [
            telegramId,
            product.price,
            product.value
          ]
        );
      }

      const refreshed =
        await client.query(
          `
          SELECT *
          FROM users
          WHERE telegram_id = $1
          `,
          [telegramId]
        );

      await client.query(
        "COMMIT"
      );

      res.json({
        ok: true,
        user:
          publicUser(
            refreshed.rows[0]
          )
      });
    } catch (error) {
      await client.query(
        "ROLLBACK"
      );

      console.error(
        "Coin shop:",
        error
      );

      res
        .status(500)
        .json({
          error:
            "Zakup nieudany"
        });
    } finally {
      client.release();
    }
  }
);

//
// DAILY BONUS
//

app.post(
  "/api/daily/claim",
  requireTelegramUser,
  async (req, res) => {
    const telegramId =
      String(
        req.telegramUser.id
      );

    const client =
      await pool.connect();

    try {
      await client.query(
        "BEGIN"
      );

      const result =
        await client.query(
          `
          SELECT *
          FROM users
          WHERE telegram_id = $1
          FOR UPDATE
          `,
          [telegramId]
        );

      const user =
        result.rows[0];

      if (!user) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(404)
          .json({
            error:
              "Gracz nie istnieje"
          });
      }

      const last =
        user.last_daily_claim;

      if (
        last &&
        new Date(last)
          .toISOString()
          .slice(0, 10) ===
        new Date()
          .toISOString()
          .slice(0, 10)
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(400)
          .json({
            error:
              "Daily Bonus już odebrany"
          });
      }

      let streak = 1;

      if (last) {
        const previous =
          new Date(last);

        const yesterday =
          new Date();

        yesterday.setUTCDate(
          yesterday.getUTCDate() -
          1
        );

        if (
          previous
            .toISOString()
            .slice(0, 10) ===
          yesterday
            .toISOString()
            .slice(0, 10)
        ) {
          streak =
            Math.min(
              Number(
                user.daily_streak
              ) + 1,
              7
            );
        }
      }

      const coinReward =
        100 +
        streak * 50;

      const rpReward =
        5 +
        streak * 2;

      const energyReward =
        250 +
        streak * 50;

      const updated =
        await client.query(
          `
          UPDATE users
          SET
            coins =
              coins + $2,

            reward_points =
              reward_points + $3,

            xp =
              xp + 25,

            energy =
              LEAST(
                max_energy,
                energy + $5
              ),

            daily_streak =
              $4,

            last_daily_claim =
              CURRENT_DATE,

            updated_at =
              NOW()

          WHERE telegram_id = $1

          RETURNING *
          `,
          [
            telegramId,
            coinReward,
            rpReward,
            streak,
            energyReward
          ]
        );

      await client.query(
        "COMMIT"
      );

      res.json({
        ok: true,

        reward: {
          coins:
            coinReward,

          rewardPoints:
            rpReward,

          energy:
            energyReward,

          streak
        },

        user:
          publicUser(
            updated.rows[0]
          )
      });
    } catch (error) {
      await client.query(
        "ROLLBACK"
      );

      console.error(
        "Daily:",
        error
      );

      res
        .status(500)
        .json({
          error:
            "Daily claim failed"
        });
    } finally {
      client.release();
    }
  }
);

//
// MISSIONS
//

app.get(
  "/api/missions",
  requireTelegramUser,
  async (req, res) => {
    const telegramId =
      String(
        req.telegramUser.id
      );

    try {
      const stats =
        await pool.query(
          `
          SELECT *
          FROM daily_stats
          WHERE
            telegram_id = $1
            AND day =
              CURRENT_DATE
          `,
          [telegramId]
        );

      const claimed =
        await pool.query(
          `
          SELECT
            mission_key
          FROM mission_claims
          WHERE
            telegram_id = $1
            AND day =
              CURRENT_DATE
          `,
          [telegramId]
        );

      const stat =
        stats.rows[0] || {
          taps: 0,
          spins: 0,
          coins_earned: 0
        };

      const claimedSet =
        new Set(
          claimed.rows.map(
            (row) =>
              row.mission_key
          )
        );

      const missions =
        Object.entries(
          MISSIONS
        ).map(
          (
            [
              key,
              mission
            ]
          ) => {
            const progress =
              Number(
                stat[
                  mission.field
                ] || 0
              );

            return {
              key,

              title:
                mission.title,

              description:
                mission.description,

              difficulty:
                mission.difficulty,

              progress,

              target:
                mission.target,

              completed:
                progress >=
                mission.target,

              claimed:
                claimedSet.has(
                  key
                ),

              reward: {
                coins:
                  mission.coins,

                rewardPoints:
                  mission.rp,

                xp:
                  mission.xp
              }
            };
          }
        );

      res.json(
        missions
      );
    } catch (error) {
      console.error(
        "Missions list:",
        error
      );

      res
        .status(500)
        .json({
          error:
            "Nie udało się pobrać misji"
        });
    }
  }
);

app.post(
  "/api/missions/:key/claim",
  requireTelegramUser,
  async (req, res) => {
    const mission =
      MISSIONS[
        req.params.key
      ];

    if (!mission) {
      return res
        .status(404)
        .json({
          error:
            "Misja nie istnieje"
        });
    }

    const telegramId =
      String(
        req.telegramUser.id
      );

    const client =
      await pool.connect();

    try {
      await client.query(
        "BEGIN"
      );

      const stats =
        await client.query(
          `
          SELECT *
          FROM daily_stats
          WHERE
            telegram_id = $1
            AND day =
              CURRENT_DATE
          FOR UPDATE
          `,
          [telegramId]
        );

      const progress =
        Number(
          stats.rows[0]?.[
            mission.field
          ] || 0
        );

      if (
        progress <
        mission.target
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(400)
          .json({
            error:
              `Misja nieukończona: ${progress}/${mission.target}`
          });
      }

      const claim =
        await client.query(
          `
          INSERT INTO mission_claims (
            telegram_id,
            day,
            mission_key
          )

          VALUES (
            $1,
            CURRENT_DATE,
            $2
          )

          ON CONFLICT
            DO NOTHING

          RETURNING
            mission_key
          `,
          [
            telegramId,
            req.params.key
          ]
        );

      if (!claim.rowCount) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(400)
          .json({
            error:
              "Nagroda już odebrana"
          });
      }

      const updated =
        await client.query(
          `
          UPDATE users
          SET
            coins =
              coins + $2,

            reward_points =
              reward_points + $3,

            xp =
              xp + $4,

            updated_at =
              NOW()

          WHERE telegram_id = $1

          RETURNING *
          `,
          [
            telegramId,
            mission.coins,
            mission.rp,
            mission.xp
          ]
        );

      await client.query(
        "COMMIT"
      );

      res.json({
        ok: true,

        mission: {
          key:
            req.params.key,

          title:
            mission.title
        },

        reward: {
          coins:
            mission.coins,

          rewardPoints:
            mission.rp,

          xp:
            mission.xp
        },

        user:
          publicUser(
            updated.rows[0]
          )
      });
    } catch (error) {
      await client.query(
        "ROLLBACK"
      );

      console.error(
        "Mission:",
        error
      );

      res
        .status(500)
        .json({
          error:
            "Mission claim failed"
        });
    } finally {
      client.release();
    }
  }
);
//
// LEADERBOARD
//

app.get(
  "/api/leaderboard",
  requireTelegramUser,
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          SELECT
            u.telegram_id,
            u.username,
            u.first_name,

            COALESCE(
              SUM(
                d.coins_earned
              ),
              0
            ) AS weekly_coins

          FROM users u

          LEFT JOIN daily_stats d
            ON
              d.telegram_id =
              u.telegram_id

            AND d.day >=
              DATE_TRUNC(
                'week',
                CURRENT_DATE
              )::DATE

          GROUP BY
            u.telegram_id,
            u.username,
            u.first_name

          ORDER BY
            weekly_coins DESC,
            u.telegram_id ASC

          LIMIT 50
          `
        );

      res.json(
        result.rows.map(
          (
            row,
            index
          ) => ({
            rank:
              index + 1,

            telegramId:
              String(
                row.telegram_id
              ),

            name:
              row.username
                ? `@${row.username}`
                : row.first_name ||
                  "Gracz",

            weeklyCoins:
              Number(
                row.weekly_coins
              )
          })
        )
      );
    } catch (error) {
      console.error(
        "Leaderboard:",
        error
      );

      res
        .status(500)
        .json({
          error:
            "Nie udało się pobrać rankingu"
        });
    }
  }
);

//
// REFERRALS
//

app.get(
  "/api/referrals",
  requireTelegramUser,
  async (req, res) => {
    const telegramId =
      String(
        req.telegramUser.id
      );

    try {
      const count =
        await pool.query(
          `
          SELECT
            COUNT(*)::INTEGER
              AS count

          FROM referrals

          WHERE
            referrer_id = $1
          `,
          [telegramId]
        );

      res.json({
        referralCode:
          req.dbUser
            .referral_code,

        startParam:
          `ref_${req.dbUser.referral_code}`,

        referrals:
          Number(
            count.rows[0]
              .count || 0
          ),

        rewards: {
          referrerCoins:
            500,

          referrerRP:
            20,

          invitedCoins:
            250
        }
      });
    } catch (error) {
      console.error(
        "Referrals:",
        error
      );

      res
        .status(500)
        .json({
          error:
            "Nie udało się pobrać poleceń"
        });
    }
  }
);

//
// REWARD CENTER
//

app.get(
  "/api/rewards",
  requireTelegramUser,
  (req, res) => {
    const user =
      publicUser(
        req.dbUser
      );

    res.json({
      balance:
        user.rewardPoints,

      level:
        user.level,

      rewards:
        Object.entries(
          REWARD_CATALOG
        ).map(
          (
            [
              key,
              reward
            ]
          ) => ({
            key,
            ...reward,

            available:
              user.rewardPoints >=
                reward.cost &&
              user.level >=
                reward.minLevel
          })
        )
    });
  }
);

//
// HISTORIA NAGRÓD
//

app.get(
  "/api/rewards/history",
  requireTelegramUser,
  async (req, res) => {
    try {
      const telegramId =
        String(
          req.telegramUser.id
        );

      const result =
        await pool.query(
          `
          SELECT
            id,
            reward_key,
            reward_label,
            rp_cost,
            status,
            created_at,
            fulfilled_at,
            admin_note,
            fulfillment_code

          FROM reward_redemptions

          WHERE
            telegram_id = $1

          ORDER BY
            created_at DESC

          LIMIT 50
          `,
          [telegramId]
        );

      res.json(
        result.rows.map(
          (row) => ({
            id:
              String(
                row.id
              ),

            rewardKey:
              row.reward_key,

            label:
              row.reward_label,

            cost:
              Number(
                row.rp_cost
              ),

            status:
              row.status,

            createdAt:
              row.created_at,

            fulfilledAt:
              row.fulfilled_at,

            adminNote:
              row.admin_note ||
              null,

            fulfillmentCode:
              row.status ===
                "approved"
                ? row.fulfillment_code
                : null
          })
        )
      );
    } catch (error) {
      console.error(
        "Reward history:",
        error
      );

      res
        .status(500)
        .json({
          error:
            "Nie udało się pobrać historii nagród"
        });
    }
  }
);

//
// ODBIERANIE NAGRODY
//

app.post(
  "/api/rewards/:key/redeem",
  requireTelegramUser,
  async (req, res) => {
    const reward =
      REWARD_CATALOG[
        req.params.key
      ];

    if (!reward) {
      return res
        .status(404)
        .json({
          error:
            "Nagroda nie istnieje"
        });
    }

    const telegramId =
      String(
        req.telegramUser.id
      );

    const client =
      await pool.connect();

    try {
      await client.query(
        "BEGIN"
      );

      const locked =
        await client.query(
          `
          SELECT *
          FROM users

          WHERE
            telegram_id = $1

          FOR UPDATE
          `,
          [telegramId]
        );

      const user =
        locked.rows[0];

      if (!user) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(404)
          .json({
            error:
              "Gracz nie istnieje"
          });
      }

      const level =
        levelFromXp(
          user.xp
        );

      if (
        level <
        reward.minLevel
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(400)
          .json({
            error:
              `Wymagany Level ${reward.minLevel}`
          });
      }

      if (
        Number(
          user.reward_points
        ) <
        reward.cost
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(400)
          .json({
            error:
              "Za mało Reward Points"
          });
      }

      const existing =
        await client.query(
          `
          SELECT id

          FROM reward_redemptions

          WHERE
            telegram_id = $1
            AND reward_key = $2
            AND status =
              'pending'

          LIMIT 1
          `,
          [
            telegramId,
            req.params.key
          ]
        );

      if (
        existing.rowCount >
        0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(400)
          .json({
            error:
              "Masz już oczekujące zgłoszenie tej nagrody"
          });
      }

      await client.query(
        `
        UPDATE users

        SET
          reward_points =
            reward_points - $2,

          updated_at =
            NOW()

        WHERE
          telegram_id = $1
        `,
        [
          telegramId,
          reward.cost
        ]
      );

      const redemption =
        await client.query(
          `
          INSERT INTO reward_redemptions (
            telegram_id,
            reward_key,
            reward_label,
            rp_cost,
            status
          )

          VALUES (
            $1,
            $2,
            $3,
            $4,
            'pending'
          )

          RETURNING *
          `,
          [
            telegramId,
            req.params.key,
            reward.label,
            reward.cost
          ]
        );

      await client.query(
        "COMMIT"
      );

      res.json({
        ok: true,

        status:
          "pending",

        redemptionId:
          String(
            redemption
              .rows[0]
              .id
          ),

        message:
          "Nagroda została zarezerwowana i oczekuje na zatwierdzenie."
      });
    } catch (error) {
      await client.query(
        "ROLLBACK"
      );

      console.error(
        "Reward redeem:",
        error
      );

      res
        .status(500)
        .json({
          error:
            "Nie udało się utworzyć zgłoszenia"
        });
    } finally {
      client.release();
    }
  }
);

//
// STARS SHOP
//

app.get(
  "/api/shop/stars",
  requireTelegramUser,
  (req, res) => {
    res.json(
      Object.entries(
        STAR_PRODUCTS
      ).map(
        (
          [
            key,
            product
          ]
        ) => ({
          key,

          price:
            product.price,

          title:
            product.title,

          description:
            product.description
        })
      )
    );
  }
);

app.post(
  "/api/shop/stars/:key",
  requireTelegramUser,
  async (req, res) => {
    const key =
      req.params.key;

    const product =
      STAR_PRODUCTS[
        key
      ];

    if (!product) {
      return res
        .status(404)
        .json({
          error:
            "Produkt Stars nie istnieje"
        });
    }

    try {
      const telegramId =
        String(
          req.telegramUser.id
        );

      const payload =
        `shop:${key}:${telegramId}`;

      const invoiceLink =
        await telegram(
          "createInvoiceLink",
          {
            title:
              product.title,

            description:
              product.description,

            payload,

            currency:
              "XTR",

            prices: [
              {
                label:
                  product.title,

                amount:
                  product.price
              }
            ]
          }
        );

      res.json({
        ok: true,
        invoiceLink
      });
    } catch (error) {
      console.error(
        "Stars invoice:",
        error
      );

      res
        .status(500)
        .json({
          error:
            "Nie udało się utworzyć faktury"
        });
    }
  }
);

//
// PRZYZNAWANIE PRODUKTÓW STARS
//

async function applyStarProduct(
  client,
  telegramId,
  product
) {
  if (
    product.type ===
    "spins"
  ) {
    await client.query(
      `
      UPDATE users

      SET
        free_spins =
          free_spins + $2,

        updated_at =
          NOW()

      WHERE
        telegram_id = $1
      `,
      [
        telegramId,
        product.value
      ]
    );
  }

  if (
    product.type ===
    "energy"
  ) {
    await client.query(
      `
      UPDATE users

      SET
        energy =
          max_energy,

        energy_updated_at =
          NOW(),

        updated_at =
          NOW()

      WHERE
        telegram_id = $1
      `,
      [
        telegramId
      ]
    );
  }

  if (
    product.type ===
    "x2"
  ) {
    await client.query(
      `
      UPDATE users

      SET
        x2_until =
          GREATEST(
            COALESCE(
              x2_until,
              NOW()
            ),
            NOW()
          ) +
          ($2 || ' hours')::INTERVAL,

        updated_at =
          NOW()

      WHERE
        telegram_id = $1
      `,
      [
        telegramId,
        product.value
      ]
    );
  }

  if (
    product.type ===
    "vip"
  ) {
    await client.query(
      `
      UPDATE users

      SET
        vip_until =
          GREATEST(
            COALESCE(
              vip_until,
              NOW()
            ),
            NOW()
          ) +
          ($2 || ' days')::INTERVAL,

        free_spins =
          free_spins + 10,

        updated_at =
          NOW()

      WHERE
        telegram_id = $1
      `,
      [
        telegramId,
        product.value
      ]
    );
  }
}

//
// TELEGRAM WEBHOOK
//

app.post(
  "/telegram/webhook",
  async (req, res) => {
    const update =
      req.body;

    try {
      //
      // PRE-CHECKOUT
      //

      if (
        update
          .pre_checkout_query
      ) {
        const query =
          update
            .pre_checkout_query;

        const parts =
          String(
            query.invoice_payload
          ).split(":");

        const product =
          parts[0] ===
          "shop"
            ? STAR_PRODUCTS[
                parts[1]
              ]
            : null;

        const valid =
          !!product &&
          query.currency ===
            "XTR" &&
          Number(
            query.total_amount
          ) ===
            product.price;

        await telegram(
          "answerPreCheckoutQuery",
          {
            pre_checkout_query_id:
              query.id,

            ok:
              valid,

            ...(valid
              ? {}
              : {
                  error_message:
                    "Nieprawidłowy zakup."
                })
          }
        );

        return res
          .sendStatus(200);
      }

      //
      // SUCCESSFUL PAYMENT
      //

      const payment =
        update.message
          ?.successful_payment;

      if (!payment) {
        return res
          .sendStatus(200);
      }

      const parts =
        String(
          payment.invoice_payload
        ).split(":");

      if (
        parts[0] !==
        "shop"
      ) {
        return res
          .sendStatus(200);
      }

      const productKey =
        parts[1];

      const telegramId =
        parts[2];

      const product =
        STAR_PRODUCTS[
          productKey
        ];

      if (!product) {
        return res
          .sendStatus(200);
      }

      if (
        payment.currency !==
          "XTR" ||
        Number(
          payment.total_amount
        ) !==
          product.price
      ) {
        console.error(
          "Payment amount mismatch"
        );

        return res
          .sendStatus(200);
      }

      const payerId =
        String(
          update.message
            ?.from?.id
        );

      if (
        payerId !==
        String(
          telegramId
        )
      ) {
        console.error(
          "Payment user mismatch"
        );

        return res
          .sendStatus(200);
      }

      const chargeId =
        payment
          .telegram_payment_charge_id;

      const client =
        await pool.connect();

      try {
        await client.query(
          "BEGIN"
        );

        const insert =
          await client.query(
            `
            INSERT INTO payments (
              telegram_payment_charge_id,
              telegram_id,
              payload,
              amount,
              currency
            )

            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5
            )

            ON CONFLICT
              DO NOTHING

            RETURNING
              telegram_payment_charge_id
            `,
            [
              chargeId,
              telegramId,
              payment.invoice_payload,
              payment.total_amount,
              payment.currency
            ]
          );

        if (
          insert.rowCount ===
          1
        ) {
          await applyStarProduct(
            client,
            telegramId,
            product
          );

          console.log(
            `⭐ ${productKey} kupione przez ${telegramId}`
          );
        } else {
          console.log(
            `ℹ️ Płatność ${chargeId} była już obsłużona`
          );
        }

        await client.query(
          "COMMIT"
        );
      } catch (error) {
        await client.query(
          "ROLLBACK"
        );

        throw error;
      } finally {
        client.release();
      }

      res.sendStatus(200);
    } catch (error) {
      console.error(
        "Webhook:",
        error
      );

      /*
       * Telegram powinien dostać 200,
       * żeby nie wysyłał w kółko
       * tego samego update.
       */
      res.sendStatus(200);
    }
  }
);

//
// FRONTEND
//

app.use(
  express.static(
    __dirname
  )
);

app.get(
  "/admin",
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        "admin.html"
      )
    );
  }
);

app.get(
  "*",
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        "index.html"
      )
    );
  }
);

//
// START
//

async function start() {
  try {
    await initDatabase();

    app.listen(
      PORT,
      "0.0.0.0",
      async () => {
        console.log(
          `🎰 Lucky Tap Slots 4.0 działa na porcie ${PORT}`
        );

        try {
          const domain =
            process.env
              .RAILWAY_PUBLIC_DOMAIN ||
            "lucky-tap-slots-production.up.railway.app";

          const webhookUrl =
            `https://${domain}/telegram/webhook`;

          await telegram(
            "setWebhook",
            {
              url:
                webhookUrl
            }
          );

          console.log(
            "✅ Telegram webhook:",
            webhookUrl
          );
        } catch (error) {
          console.error(
            "Webhook setup:",
            error
          );
        }
      }
    );
  } catch (error) {
    console.error(
      "❌ Startup:",
      error
    );

    process.exit(1);
  }
}

start();
