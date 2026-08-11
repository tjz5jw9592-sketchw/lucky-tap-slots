const crypto = require("crypto");

function registerAdminRoutes({
  app,
  pool,
  adminPassword,
  signingSecret
}) {
  const SECRET =
    signingSecret || adminPassword;

  function safeEqual(a, b) {
    const aa = Buffer.from(String(a || ""));
    const bb = Buffer.from(String(b || ""));

    return (
      aa.length === bb.length &&
      crypto.timingSafeEqual(aa, bb)
    );
  }

  function signToken() {
    const payload = {
      exp: Date.now() + 12 * 60 * 60 * 1000
    };

    const body = Buffer.from(
      JSON.stringify(payload)
    ).toString("base64url");

    const sig = crypto
      .createHmac("sha256", SECRET)
      .update(body)
      .digest("base64url");

    return `${body}.${sig}`;
  }

  function verifyToken(token) {
    if (!token) return false;

    const [body, sig] = token.split(".");

    if (!body || !sig) return false;

    const expected = crypto
      .createHmac("sha256", SECRET)
      .update(body)
      .digest("base64url");

    if (!safeEqual(sig, expected)) {
      return false;
    }

    try {
      const payload = JSON.parse(
        Buffer.from(
          body,
          "base64url"
        ).toString("utf8")
      );

      return payload.exp > Date.now();
    } catch {
      return false;
    }
  }

  function getCookie(req, name) {
    const cookies =
      String(req.headers.cookie || "")
        .split(";")
        .map(x => x.trim());

    for (const cookie of cookies) {
      const index = cookie.indexOf("=");

      if (index === -1) continue;

      const key =
        cookie.slice(0, index);

      const value =
        cookie.slice(index + 1);

      if (key === name) {
        return decodeURIComponent(value);
      }
    }

    return null;
  }

  function requireAdmin(req, res, next) {
    const token =
      getCookie(
        req,
        "admin_session"
      );

    if (!verifyToken(token)) {
      return res
        .status(401)
        .json({
          error: "Brak dostępu"
        });
    }

    next();
  }

  app.post(
    "/api/admin/login",
    (req, res) => {
      if (!adminPassword) {
        return res.status(500).json({
          error:
            "ADMIN_PASSWORD nie ustawione"
        });
      }

      if (
        !safeEqual(
          req.body?.password,
          adminPassword
        )
      ) {
        return res.status(401).json({
          error:
            "Nieprawidłowe hasło"
        });
      }

      const token =
        signToken();

      res.setHeader(
        "Set-Cookie",
        `admin_session=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`
      );

      res.json({
        ok: true
      });
    }
  );

  app.post(
    "/api/admin/logout",
    requireAdmin,
    (req, res) => {
      res.setHeader(
        "Set-Cookie",
        "admin_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0"
      );

      res.json({
        ok: true
      });
    }
  );

  app.get(
    "/api/admin/me",
    requireAdmin,
    (req, res) => {
      res.json({
        ok: true
      });
    }
  );

  app.get(
    "/api/admin/stats",
    requireAdmin,
    async (req, res) => {
      try {
        const result =
          await pool.query(`
            SELECT
              (SELECT COUNT(*)
               FROM users)
               AS users,

              (SELECT COALESCE(
                SUM(taps), 0
               )
               FROM users)
               AS taps,

              (SELECT COALESCE(
                SUM(coins), 0
               )
               FROM users)
               AS coins,

              (SELECT COUNT(*)
               FROM payments)
               AS payments,

              (SELECT COALESCE(
                SUM(amount), 0
               )
               FROM payments
               WHERE currency = 'XTR')
               AS stars,

              (SELECT COUNT(*)
               FROM reward_redemptions
               WHERE status = 'pending')
               AS pending_rewards
          `);

        const row =
          result.rows[0];

        res.json({
          users:
            Number(row.users),

          taps:
            Number(row.taps),

          coins:
            Number(row.coins),

          payments:
            Number(row.payments),

          stars:
            Number(row.stars),

          pendingRewards:
            Number(
              row.pending_rewards
            )
        });
      } catch (error) {
        console.error(
          "Admin stats:",
          error
        );

        res.status(500).json({
          error:
            "Błąd statystyk"
        });
      }
    }
  );

  app.get(
    "/api/admin/users",
    requireAdmin,
    async (req, res) => {
      try {
        const result =
          await pool.query(`
            SELECT
              telegram_id,
              username,
              first_name,
              coins,
              energy,
              taps,
              free_spins,
              xp,
              reward_points,
              vip_until,
              x2_until,
              created_at

            FROM users

            ORDER BY
              created_at DESC

            LIMIT 200
          `);

        res.json(
          result.rows.map(
            user => ({
              telegramId:
                String(
                  user.telegram_id
                ),

              username:
                user.username,

              firstName:
                user.first_name,

              coins:
                Number(
                  user.coins
                ),

              energy:
                Number(
                  user.energy
                ),

              taps:
                Number(
                  user.taps
                ),

              spins:
                Number(
                  user.free_spins
                ),

              xp:
                Number(
                  user.xp
                ),

              rewardPoints:
                Number(
                  user.reward_points
                ),

              vipUntil:
                user.vip_until,

              x2Until:
                user.x2_until
            })
          )
        );
      } catch (error) {
        console.error(
          "Admin users:",
          error
        );

        res.status(500).json({
          error:
            "Błąd użytkowników"
        });
      }
    }
  );

  app.post(
    "/api/admin/users/:id/adjust",
    requireAdmin,
    async (req, res) => {
      const telegramId =
        req.params.id;

      const coins =
        Number(req.body?.coins || 0);

      const rp =
        Number(req.body?.rewardPoints || 0);

      const spins =
        Number(req.body?.spins || 0);

      if (
        !Number.isInteger(coins) ||
        !Number.isInteger(rp) ||
        !Number.isInteger(spins) ||
        Math.abs(coins) > 1000000 ||
        Math.abs(rp) > 100000 ||
        Math.abs(spins) > 10000
      ) {
        return res.status(400).json({
          error:
            "Nieprawidłowe wartości"
        });
      }

      try {
        const result =
          await pool.query(
            `
            UPDATE users

            SET
              coins =
                GREATEST(
                  coins + $2,
                  0
                ),

              reward_points =
                GREATEST(
                  reward_points + $3,
                  0
                ),

              free_spins =
                GREATEST(
                  free_spins + $4,
                  0
                ),

              updated_at =
                NOW()

            WHERE telegram_id = $1

            RETURNING
              telegram_id,
              coins,
              reward_points,
              free_spins
            `,
            [
              telegramId,
              coins,
              rp,
              spins
            ]
          );

        if (!result.rowCount) {
          return res
            .status(404)
            .json({
              error:
                "Gracz nie istnieje"
            });
        }

        res.json({
          ok: true,
          user:
            result.rows[0]
        });
      } catch (error) {
        console.error(
          "Admin adjustment:",
          error
        );

        res.status(500).json({
          error:
            "Zmiana nieudana"
        });
      }
    }
  );

  app.get(
    "/api/admin/payments",
    requireAdmin,
    async (req, res) => {
      try {
        const result =
          await pool.query(`
            SELECT
              telegram_payment_charge_id,
              telegram_id,
              payload,
              amount,
              currency,
              created_at

            FROM payments

            ORDER BY
              created_at DESC

            LIMIT 200
          `);

        res.json(
          result.rows
        );
      } catch (error) {
        console.error(
          "Admin payments:",
          error
        );

        res.status(500).json({
          error:
            "Błąd płatności"
        });
      }
    }
  );

  app.get(
    "/api/admin/rewards",
    requireAdmin,
    async (req, res) => {
      try {
        const result =
          await pool.query(`
            SELECT
              r.id,
              r.telegram_id,
              r.reward_key,
              r.reward_label,
              r.rp_cost,
              r.status,
              r.created_at,
              u.username,
              u.first_name

            FROM reward_redemptions r

            LEFT JOIN users u
              ON
                u.telegram_id =
                r.telegram_id

            ORDER BY
              CASE
                WHEN r.status =
                  'pending'
                THEN 0
                ELSE 1
              END,
              r.created_at DESC

            LIMIT 200
          `);

        res.json(
          result.rows
        );
      } catch (error) {
        console.error(
          "Admin rewards:",
          error
        );

        res.status(500).json({
          error:
            "Błąd nagród"
        });
      }
    }
  );

app.post(
  function registerAdminRoutes({ ... }) {
  "/api/admin/rewards/:id/status",
  requireAdmin,
  async (req, res) => {
    const status =
      req.body?.status;

    const fulfillmentCode =
      String(
        req.body?.fulfillmentCode || ""
      ).trim();

    const adminNote =
      String(
        req.body?.adminNote || ""
      ).trim();

    if (
      ![
        "approved",
        "rejected"
      ].includes(status)
    ) {
      return res
        .status(400)
        .json({
          error:
            "Nieprawidłowy status"
        });
    }

    if (
      status === "approved" &&
      !fulfillmentCode
    ) {
      return res
        .status(400)
        .json({
          error:
            "Podaj kod nagrody lub kuponu"
        });
    }

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
          FROM reward_redemptions
          WHERE id = $1
          FOR UPDATE
          `,
          [
            req.params.id
          ]
        );

      if (!locked.rowCount) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(404)
          .json({
            error:
              "Zgłoszenie nie istnieje"
          });
      }

      const reward =
        locked.rows[0];

      if (
        reward.status !==
        "pending"
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(400)
          .json({
            error:
              "To zgłoszenie zostało już obsłużone"
          });
      }

      if (
        status ===
        "rejected"
      ) {
        await client.query(
          `
          UPDATE users

          SET
            reward_points =
              reward_points + $2,

            updated_at =
              NOW()

          WHERE telegram_id = $1
          `,
          [
            String(
              reward.telegram_id
            ),

            Number(
              reward.rp_cost
            )
          ]
        );

        await client.query(
          `
          UPDATE reward_redemptions

          SET
            status =
              'rejected',

            refunded_at =
              NOW(),

            admin_note =
              $2

          WHERE id = $1
          `,
          [
            req.params.id,
            adminNote ||
              "Zgłoszenie odrzucone — RP zwrócone."
          ]
        );
      }

      if (
        status ===
        "approved"
      ) {
        await client.query(
          `
          UPDATE reward_redemptions

          SET
            status =
              'approved',

            fulfilled_at =
              NOW(),

            fulfillment_code =
              $2,

            admin_note =
              $3

          WHERE id = $1
          `,
          [
            req.params.id,
            fulfillmentCode,
            adminNote ||
              "Nagroda zatwierdzona."
          ]
        );
      }

      const result =
        await client.query(
          `
          SELECT *
          FROM reward_redemptions
          WHERE id = $1
          `,
          [
            req.params.id
          ]
        );

      await client.query(
        "COMMIT"
      );

      res.json({
        ok: true,
        reward:
          result.rows[0]
      });
    } catch (error) {
      await client.query(
        "ROLLBACK"
      );

      console.error(
        "Admin reward status:",
        error
      );

      res
        .status(500)
        .json({
          error:
            "Nie udało się obsłużyć nagrody"
        });
    } finally {
      client.release();
    }
  }
);

}

module.exports = {
  registerAdminRoutes
};
