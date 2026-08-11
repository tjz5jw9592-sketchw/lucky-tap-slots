const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;

const SPIN_TARGET = 25;
const STAR_PRICE = 50;
const STAR_SPINS = 5;

const pool = new Pool({
  connectionString: DATABASE_URL
});

async function telegram(method, body) {
  if (!BOT_TOKEN) {
    throw new Error("Brak BOT_TOKEN");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  const data = await response.json();

  if (!data.ok) {
    console.error("Telegram API error:", data);
    throw new Error(
      data.description || "Telegram API error"
    );
  }

  return data.result;
}

function validateTelegramInitData(initData) {
  if (!initData || !BOT_TOKEN) {
    return null;
  }

  try {
    const params = new URLSearchParams(initData);

    const receivedHash = params.get("hash");

    if (!receivedHash) {
      return null;
    }

    params.delete("hash");

    const authDate = Number(
      params.get("auth_date") || 0
    );

    const now =
      Math.floor(Date.now() / 1000);

    if (
      !authDate ||
      Math.abs(now - authDate) > 86400
    ) {
      return null;
    }

    const dataCheckString =
      [...params.entries()]
        .sort(([a], [b]) =>
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
        .update(dataCheckString)
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
      receivedBuffer.length
    ) {
      return null;
    }

    if (
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

    return JSON.parse(rawUser);
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

      coins BIGINT NOT NULL DEFAULT 1000,

      energy INTEGER
        NOT NULL DEFAULT 500,

      max_energy INTEGER
        NOT NULL DEFAULT 500,

      taps BIGINT
        NOT NULL DEFAULT 0,

      spin_progress INTEGER
        NOT NULL DEFAULT 0,

      free_spins INTEGER
        NOT NULL DEFAULT 0,

      created_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

      updated_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      telegram_payment_charge_id
        TEXT PRIMARY KEY,

      telegram_id BIGINT NOT NULL,

      payload TEXT NOT NULL,

      amount INTEGER NOT NULL,

      currency TEXT NOT NULL,

      created_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW()
    )
  `);

  console.log(
    "✅ PostgreSQL tables ready"
  );
}

async function getOrCreateUser(
  telegramUser
) {
  const result =
    await pool.query(
      `
      INSERT INTO users (
        telegram_id,
        username,
        first_name
      )
      VALUES ($1, $2, $3)

      ON CONFLICT (telegram_id)
      DO UPDATE SET

        username =
          EXCLUDED.username,

        first_name =
          EXCLUDED.first_name,

        updated_at = NOW()

      RETURNING *
      `,
      [
        String(telegramUser.id),

        telegramUser.username ||
          null,

        telegramUser.first_name ||
          null
      ]
    );

  return result.rows[0];
}

function publicUser(row) {
  return {
    telegramId:
      String(row.telegram_id),

    username:
      row.username,

    firstName:
      row.first_name,

    coins:
      Number(row.coins),

    energy:
      row.energy,

    maxEnergy:
      row.max_energy,

    taps:
      Number(row.taps),

    spinProgress:
      row.spin_progress,

    freeSpins:
      row.free_spins
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

  const telegramUser =
    validateTelegramInitData(
      initData
    );

  if (!telegramUser) {
    return res
      .status(401)
      .json({
        error:
          "Nieprawidłowa sesja Telegram"
      });
  }

  try {
    req.telegramUser =
      telegramUser;

    req.dbUser =
      await getOrCreateUser(
        telegramUser
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
          "Błąd bazy danych"
      });
  }
}

//
// HEALTHCHECK
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
        database: true
      });
    } catch (error) {
      console.error(
        "Health database:",
        error
      );

      res
        .status(500)
        .json({
          ok: false,
          database: false
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
// TAP
//

app.post(
  "/api/tap",
  requireTelegramUser,
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          UPDATE users

          SET

            energy =
              GREATEST(
                energy - 1,
                0
              ),

            coins =
              coins +
              CASE
                WHEN energy > 0
                THEN 1
                ELSE 0
              END,

            taps =
              taps +
              CASE
                WHEN energy > 0
                THEN 1
                ELSE 0
              END,

            spin_progress =
              CASE

                WHEN energy > 0
                THEN LEAST(
                  $2,
                  spin_progress + 1
                )

                ELSE spin_progress

              END,

            updated_at =
              NOW()

          WHERE
            telegram_id = $1

          RETURNING *
          `,
          [
            String(
              req.telegramUser.id
            ),

            SPIN_TARGET
          ]
        );

      res.json(
        publicUser(
          result.rows[0]
        )
      );
    } catch (error) {
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
          [
            String(
              req.telegramUser.id
            )
          ]
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
              "User not found"
          });
      }

      const usePaidSpin =
        user.free_spins > 0;

      const useTapSpin =
        user.spin_progress >=
        SPIN_TARGET;

      if (
        !usePaidSpin &&
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

      const result =
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

            updated_at =
              NOW()

          WHERE
            telegram_id = $1

          RETURNING *
          `,
          [
            String(
              req.telegramUser.id
            ),

            win,

            usePaidSpin
          ]
        );

      await client.query(
        "COMMIT"
      );

      res.json({
        ...publicUser(
          result.rows[0]
        ),

        reels,
        win
      });
    } catch (error) {
      await client.query(
        "ROLLBACK"
      );

      console.error(
        "Spin error:",
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
// ⭐ STARS SHOP
//

app.post(
  "/api/shop/stars/spins",
  requireTelegramUser,
  async (req, res) => {
    try {
      const telegramId =
        String(
          req.telegramUser.id
        );

      const payload =
        `lucky_5_spins:${telegramId}`;

      const invoiceLink =
        await telegram(
          "createInvoiceLink",
          {
            title:
              "5 Lucky Spins",

            description:
              "Pakiet 5 bonusowych Lucky Spinów w Lucky Tap Slots.",

            payload,

            currency:
              "XTR",

            prices: [
              {
                label:
                  "5 Lucky Spins",

                amount:
                  STAR_PRICE
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
        "Invoice:",
        error
      );

      res
        .status(500)
        .json({
          ok: false,
          error:
            "Nie udało się utworzyć płatności"
        });
    }
  }
);

//
// TELEGRAM WEBHOOK
//

app.post(
  "/telegram/webhook",
  async (req, res) => {
    const update =
      req.body;

    try {
      if (
        update.pre_checkout_query
      ) {
        const query =
          update.pre_checkout_query;

        const valid =
          query.currency ===
            "XTR" &&

          query.total_amount ===
            STAR_PRICE &&

          query.invoice_payload
            .startsWith(
              "lucky_5_spins:"
            );

        await telegram(
          "answerPreCheckoutQuery",
          {
            pre_checkout_query_id:
              query.id,

            ok: valid,

            ...(
              valid
                ? {}
                : {
                    error_message:
                      "Nieprawidłowy zakup."
                  }
            )
          }
        );

        return res
          .sendStatus(200);
      }

      const payment =
        update.message
          ?.successful_payment;

      if (!payment) {
        return res
          .sendStatus(200);
      }

      if (
        payment.currency !==
          "XTR" ||

        payment.total_amount !==
          STAR_PRICE
      ) {
        return res
          .sendStatus(200);
      }

      const payload =
        payment.invoice_payload;

      if (
        !payload.startsWith(
          "lucky_5_spins:"
        )
      ) {
        return res
          .sendStatus(200);
      }

      const telegramId =
        payload.split(":")[1];

      const messageUserId =
        update.message
          ?.from?.id;

      if (
        String(
          messageUserId
        ) !==
        String(
          telegramId
        )
      ) {
        console.error(
          "Payment Telegram ID mismatch"
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

        const paymentInsert =
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
              (
                telegram_payment_charge_id
              )

            DO NOTHING

            RETURNING
              telegram_payment_charge_id
            `,
            [
              chargeId,
              telegramId,
              payload,
              payment.total_amount,
              payment.currency
            ]
          );

        if (
          paymentInsert.rowCount ===
          1
        ) {
          await client.query(
            `
            UPDATE users

            SET

              free_spins =
                free_spins +
                $2,

              updated_at =
                NOW()

            WHERE
              telegram_id =
                $1
            `,
            [
              telegramId,
              STAR_SPINS
            ]
          );

          console.log(
            `⭐ Payment OK for ${telegramId}. +${STAR_SPINS} spins`
          );
        } else {
          console.log(
            "Duplicate payment ignored:",
            chargeId
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
          `🎰 Lucky Tap Slots działa na porcie ${PORT}`
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
      "❌ Startup failed:",
      error
    );

    process.exit(1);
  }
}

start();
