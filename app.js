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

function randomSymbol() {
  return SYMBOLS[
    Math.floor(Math.random() * SYMBOLS.length)
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
    .map((x) => `<i>${x}</i>`)
    .join("");
}

function render(u) {
  state = u;

  q("#c").textContent =
    Number(u.coins || 0).toLocaleString("pl-PL");

  q("#e").textContent =
    `${u.energy}/${u.maxEnergy}`;

  q("#n").textContent = u.taps;

  const percent = Math.min(
    100,
    Math.round(
      (u.spinProgress / SPIN_TARGET) * 100
    )
  );

  q("#p").value = percent;

  const canSpin =
    u.freeSpins > 0 ||
    u.spinProgress >= SPIN_TARGET;

  q("#s").disabled =
    !canSpin || spinning;

  if (u.freeSpins > 0) {
    q("#s").textContent =
      `🎁 LUCKY SPIN — BONUS x${u.freeSpins}`;
  } else if (
    u.spinProgress >= SPIN_TARGET
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

  if (!cells.length) return;

  const amount =
    2 + Math.floor(Math.random() * 3);

  for (let i = 0; i < amount; i++) {
    const cell =
      cells[
        Math.floor(
          Math.random() * cells.length
        )
      ];

    cell.textContent = randomSymbol();

    cell.style.transform =
      "scale(1.12)";

    setTimeout(() => {
      cell.style.transform =
        "scale(1)";
    }, 120);
  }
}

async function load() {
  const response =
    await fetch("/api/me");

  const u =
    await response.json();

  render(u);
}

q("#t").onclick = async () => {
  if (spinning) return;

  animateTap();

  if (navigator.vibrate) {
    navigator.vibrate(20);
  }

  const response =
    await fetch("/api/tap", {
      method: "POST"
    });

  const u =
    await response.json();

  render(u);

  if (
    u.freeSpins > 0
  ) {
    q("#m").textContent =
      `🎁 Masz ${u.freeSpins} bonusowych spinów`;
  } else if (
    u.spinProgress >= SPIN_TARGET
  ) {
    q("#m").textContent =
      "🔥 Lucky Spin gotowy — kręć!";
  } else {
    q("#m").textContent =
      `Jeszcze ${
        SPIN_TARGET -
        u.spinProgress
      } tapów do spinu`;
  }
};

q("#s").onclick = async () => {
  if (
    spinning ||
    !state
  ) {
    return;
  }

  const canSpin =
    state.freeSpins > 0 ||
    state.spinProgress >= SPIN_TARGET;

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
      draw(randomBoard());
    }, 90);

  try {
    const response =
      await fetch(
        "/api/spin",
        {
          method: "POST"
        }
      );

    const result =
      await response.json();

    await new Promise(
      (resolve) =>
        setTimeout(resolve, 1200)
    );

    clearInterval(animation);

    if (!response.ok) {
      q("#m").textContent =
        result.error ||
        "Spin niedostępny";

      return;
    }

    draw(result.reels);
    render(result);

    q("#m").textContent =
      `💰 WYGRANA +${result.win} MONET!`;

    if (navigator.vibrate) {
      navigator.vibrate([
        70,
        50,
        100
      ]);
    }
  } catch (error) {
    clearInterval(animation);

    q("#m").textContent =
      "Błąd spinu.";
  } finally {
    spinning = false;
    q("#t").disabled = false;

    if (state) {
      render(state);
    }
  }
};

q("#shop").onclick = async () => {
  const shopBtn =
    q("#shop");

  shopBtn.disabled = true;

  try {
    const response =
      await fetch(
        "/api/shop/stars/spins",
        {
          method: "POST"
        }
      );

    const data =
      await response.json();

    if (!data.ok) {
      alert(
        "Nie udało się utworzyć płatności Stars."
      );
      return;
    }

    const tg =
      window.Telegram?.WebApp;

    if (!tg) {
      alert(
        "Zakupy Stars działają po otwarciu gry w Telegramie."
      );
      return;
    }

    tg.ready();
    tg.expand();

    tg.openInvoice(
      data.invoiceLink,
      async (status) => {
        if (status === "paid") {
          q("#m").textContent =
            "⭐ Płatność przyjęta! Sprawdzam bonus...";

          setTimeout(
            async () => {
              await load();

              q("#m").textContent =
                "🎁 5 Lucky Spinów dodane!";
            },
            1500
          );
        }

        if (status === "cancelled") {
          q("#m").textContent =
            "Płatność anulowana.";
        }

        if (status === "failed") {
          q("#m").textContent =
            "Płatność nie powiodła się.";
        }
      }
    );
  } catch (error) {
    alert(
      "Błąd połączenia z płatnością."
    );
  } finally {
    shopBtn.disabled = false;
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
