const q = (s) => document.querySelector(s);
const R = q("#r");

const SYMBOLS = [
  "🍒",
  "🍋",
  "💎",
  "7️⃣",
  "⭐",
  "🍀",
  "🔔",
  "🍇"
];

const SPIN_TARGET = 25;

let state = null;
let spinning = false;

const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

function telegramHeaders() {
  return {
    "Content-Type": "application/json",
    "X-Telegram-Init-Data": tg?.initData || ""
  };
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...telegramHeaders(),
      ...(options.headers || {})
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "Błąd API"
    );
  }

  return data;
}

function randomSymbol() {
  return SYMBOLS[
    Math.floor(
      Math.random() * SYMBOLS.length
    )
  ];
}

function randomBoard() {
  return Array.from(
    { length: 9 },
    randomSymbol
  );
}

function draw(symbols = randomBoard()) {
  R.innerHTML = symbols
    .map(
      (x) => `<i>${x}</i>`
    )
    .join("");
}

function render(u) {
  state = u;

  q("#c").textContent =
    Number(
      u.coins || 0
    ).toLocaleString("pl-PL");

  q("#e").textContent =
    `${u.energy}/${u.maxEnergy}`;

  q("#n").textContent =
    u.taps;

  const percent =
    Math.min(
      100,
      Math.round(
        (u.spinProgress /
          SPIN_TARGET) *
          100
      )
    );

  q("#p").value = percent;

  const canSpin =
    u.freeSpins > 0 ||
    u.spinProgress >=
      SPIN_TARGET;

  q("#s").disabled =
    !canSpin || spinning;

  if (u.freeSpins > 0) {
    q("#s").textContent =
      `🎁 LUCKY SPIN — BONUS x${u.freeSpins}`;
  } else if (
    u.spinProgress >=
    SPIN_TARGET
  ) {
    q("#s").textContent =
      "🎰 LUCKY SPIN — GOTOWY!";
  } else {
    q("#s").textContent =
      `🎰 LUCKY SPIN ${u.spinProgress}/${SPIN_TARGET}`;
  }
}

function animateTap() {
  const cells = [
    ...R.querySelectorAll("i")
  ];

  if (!cells.length) {
    return;
  }

  const amount =
    2 +
    Math.floor(
      Math.random() * 3
    );

  for (
    let i = 0;
    i < amount;
    i++
  ) {
    const cell =
      cells[
        Math.floor(
          Math.random() *
            cells.length
        )
      ];

    cell.textContent =
      randomSymbol();

    cell.style.transform =
      "scale(1.12)";

    setTimeout(() => {
      cell.style.transform =
        "scale(1)";
    }, 120);
  }
}

async function load() {
  try {
    const user =
      await api("/api/me");

    render(user);

    if (user.freeSpins > 0) {
      q("#m").textContent =
        `🎁 Masz ${user.freeSpins} bonusowych Lucky Spinów`;
    }
  } catch (error) {
    console.error(error);

    q("#m").textContent =
      "❌ Nie udało się zalogować przez Telegram";

    q("#t").disabled = true;
    q("#s").disabled = true;
    q("#shop").disabled = true;
  }
}

q("#t").onclick =
  async () => {
    if (spinning) {
      return;
    }

    animateTap();

    if (navigator.vibrate) {
      navigator.vibrate(20);
    }

    try {
      const user =
        await api(
          "/api/tap",
          {
            method: "POST"
          }
        );

      render(user);

      if (
        user.freeSpins > 0
      ) {
        q("#m").textContent =
          `🎁 Masz ${user.freeSpins} bonusowych spinów`;
      } else if (
        user.spinProgress >=
        SPIN_TARGET
      ) {
        q("#m").textContent =
          "🔥 Lucky Spin gotowy — kręć!";
      } else {
        q("#m").textContent =
          `Jeszcze ${
            SPIN_TARGET -
            user.spinProgress
          } tapów do spinu`;
      }
    } catch (error) {
      console.error(error);

      q("#m").textContent =
        "❌ Tap nie został zapisany";
    }
  };

q("#s").onclick =
  async () => {
    if (
      spinning ||
      !state
    ) {
      return;
    }

    const canSpin =
      state.freeSpins > 0 ||
      state.spinProgress >=
        SPIN_TARGET;

    if (!canSpin) {
      return;
    }

    spinning = true;

    q("#s").disabled = true;
    q("#t").disabled = true;

    q("#m").textContent =
      "🎰 Kręcimy...";

    if (navigator.vibrate) {
      navigator.vibrate([
        40,
        40,
        40
      ]);
    }

    const animation =
      setInterval(() => {
        draw(
          randomBoard()
        );
      }, 90);

    try {
      const result =
        await api(
          "/api/spin",
          {
            method: "POST"
          }
        );

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            1200
          )
      );

      clearInterval(
        animation
      );

      draw(
        result.reels
      );

      render(
        result
      );

      q("#m").textContent =
        `💰 WYGRANA +${result.win} MONET!`;

      if (
        navigator.vibrate
      ) {
        navigator.vibrate([
          70,
          50,
          100
        ]);
      }
    } catch (error) {
      clearInterval(
        animation
      );

      console.error(error);

      q("#m").textContent =
        `❌ ${error.message}`;
    } finally {
      spinning = false;

      q("#t").disabled =
        false;

      if (state) {
        render(state);
      }
    }
  };

q("#shop").onclick =
  async () => {
    const shopBtn =
      q("#shop");

    shopBtn.disabled = true;

    try {
      const data =
        await api(
          "/api/shop/stars/spins",
          {
            method: "POST"
          }
        );

      if (!tg) {
        alert(
          "Zakupy Stars działają tylko wewnątrz Telegrama."
        );

        return;
      }

      tg.openInvoice(
        data.invoiceLink,
        async (status) => {
          if (
            status === "paid"
          ) {
            q("#m").textContent =
              "⭐ Płatność przyjęta! Sprawdzam bonus...";

            setTimeout(
              async () => {
                await load();
              },
              1500
            );
          }

          if (
            status ===
            "cancelled"
          ) {
            q("#m").textContent =
              "Płatność anulowana.";
          }

          if (
            status ===
            "failed"
          ) {
            q("#m").textContent =
              "Płatność nie powiodła się.";
          }
        }
      );
    } catch (error) {
      console.error(error);

      alert(
        error.message ||
          "Błąd płatności"
      );
    } finally {
      shopBtn.disabled =
        false;
    }
  };

draw([
  "🍒",
  "🍋",
  "💎",
  "7️⃣",
  "⭐",
  "🍀",
  "🔔",
  "🍇",
  "🍒"
]);

load();
