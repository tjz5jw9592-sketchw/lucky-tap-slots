const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const SPIN_TARGET = 25;

let user = {
  coins: 1000,
  energy: 500,
  maxEnergy: 500,
  taps: 0,
  spinProgress: 0,
  freeSpins: 0
};

const processedPayments = new Set();

async function telegram(method, body) {
  if (!BOT_TOKEN) {
    throw new Error("Brak BOT_TOKEN w Railway");
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
    console.error("Telegram API:", data);
    throw new Error(data.description || "Telegram API error");
  }

  return data.result;
}

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "lucky-tap-slots"
  });
});

app.get("/api/me", (req, res) => {
  res.json(user);
});

app.post("/api/tap", (req, res) => {
  if (user.energy > 0) {
    user.energy -= 1;
    user.coins += 1;
    user.taps += 1;

    user.spinProgress = Math.min(
      SPIN_TARGET,
      user.spinProgress + 1
    );
  }

  res.json(user);
});

app.post("/api/spin", (req, res) => {
  const hasFreeSpin = user.freeSpins > 0;
  const hasNormalSpin =
    user.spinProgress >= SPIN_TARGET;

  if (!hasFreeSpin && !hasNormalSpin) {
    return res.status(400).json({
      error: "Lucky Spin nie jest jeszcze gotowy"
    });
  }

  if (hasFreeSpin) {
    user.freeSpins -= 1;
  } else {
    user.spinProgress = 0;
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

  const reels = Array.from(
    { length: 9 },
    () =>
      symbols[
        Math.floor(Math.random() * symbols.length)
      ]
  );

  let win = 0;

  for (let row = 0; row < 3; row++) {
    const i = row * 3;

    if (
      reels[i] === reels[i + 1] &&
      reels[i] === reels[i + 2]
    ) {
      if (reels[i] === "7️⃣") {
        win += 777;
      } else if (reels[i] === "💎") {
        win += 250;
      } else {
        win += 100;
      }
    }
  }

  if (win === 0) {
    win = 10 + Math.floor(Math.random() * 31);
  }

  user.coins += win;

  res.json({
    ...user,
    reels,
    win
  });
});

//
// ⭐ TELEGRAM STARS
//

app.post("/api/shop/stars/spins", async (req, res) => {
  try {
    const invoiceLink = await telegram(
      "createInvoiceLink",
      {
        title: "5 Lucky Spins",
        description:
          "Pakiet 5 bonusowych Lucky Spinów w Lucky Tap Slots.",
        payload: "lucky_5_spins",
        currency: "XTR",
        prices: [
          {
            label: "5 Lucky Spins",
            amount: 50
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
      "Invoice creation error:",
      error
    );

    res.status(500).json({
      ok: false,
      error:
        "Nie udało się utworzyć płatności Stars"
    });
  }
});

//
// TELEGRAM WEBHOOK
//

app.post(
  "/telegram/webhook",
  async (req, res) => {
    const update = req.body;

    try {
      if (update.pre_checkout_query) {
        await telegram(
          "answerPreCheckoutQuery",
          {
            pre_checkout_query_id:
              update.pre_checkout_query.id,
            ok: true
          }
        );

        return res.sendStatus(200);
      }

      const payment =
        update.message?.successful_payment;

      if (payment) {
        const chargeId =
          payment.telegram_payment_charge_id;

        const validPayment =
          payment.currency === "XTR" &&
          payment.invoice_payload ===
            "lucky_5_spins" &&
          payment.total_amount === 50;

        if (
          validPayment &&
          !processedPayments.has(chargeId)
        ) {
          processedPayments.add(chargeId);

          user.freeSpins += 5;

          console.log(
            `Stars payment OK. Added 5 spins. Charge: ${chargeId}`
          );
        }
      }

      res.sendStatus(200);
    } catch (error) {
      console.error(
        "Telegram webhook error:",
        error
      );

      res.sendStatus(200);
    }
  }
);

app.use(express.static(__dirname));

app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});

app.listen(PORT, "0.0.0.0", async () => {
  console.log(
    `Lucky Tap Slots działa na porcie ${PORT}`
  );

  try {
    const webhookUrl =
      "https://lucky-tap-slots-production.up.railway.app/telegram/webhook";

    await telegram("setWebhook", {
      url: webhookUrl
    });

    console.log(
      "✅ Telegram webhook ustawiony:",
      webhookUrl
    );
  } catch (error) {
    console.error(
      "❌ Nie udało się ustawić webhooka:",
      error
    );
  }
});
