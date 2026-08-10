const q = (s) => document.querySelector(s);
const R = q("#r");

const SYMBOLS = ["🍒", "🍋", "💎", "7️⃣", "⭐", "🍀", "🔔", "🍇"];
const SPIN_TARGET = 25;

let state = null;
let spinning = false;

function randomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function randomBoard() {
  return Array.from({ length: 9 }, randomSymbol);
}

function draw(symbols = randomBoard()) {
  R.innerHTML = symbols.map((x) => `<i>${x}</i>`).join("");
}

function render(u) {
  state = u;

  q("#c").textContent = Number(u.coins || 0).toLocaleString("pl-PL");
  q("#e").textContent = `${u.energy}/${u.maxEnergy}`;
  q("#n").textContent = u.taps;

  const percent = Math.min(
    100,
    Math.round((u.spinProgress / SPIN_TARGET) * 100)
  );

  q("#p").value = percent;

  q("#s").disabled =
    u.spinProgress < SPIN_TARGET || spinning;

  q("#s").textContent =
    u.spinProgress >= SPIN_TARGET
      ? "🎰 LUCKY SPIN — GOTOWY!"
      : `🎰 LUCKY SPIN ${u.spinProgress}/${SPIN_TARGET}`;
}

function animateTap() {
  const cells = [...R.querySelectorAll("i")];

  if (!cells.length) return;

  const amount = 2 + Math.floor(Math.random() * 3);

  for (let i = 0; i < amount; i++) {
    const cell =
      cells[Math.floor(Math.random() * cells.length)];

    cell.textContent = randomSymbol();

    cell.style.transform = "scale(1.12)";
    setTimeout(() => {
      cell.style.transform = "scale(1)";
    }, 120);
  }
}

async function load() {
  const response = await fetch("/api/me");
  const u = await response.json();

  render(u);
}

q("#t").onclick = async () => {
  if (spinning) return;

  animateTap();

  if (navigator.vibrate) {
    navigator.vibrate(20);
  }

  const response = await fetch("/api/tap", {
    method: "POST"
  });

  const u = await response.json();

  render(u);

  if (u.spinProgress >= SPIN_TARGET) {
    q("#m").textContent =
      "🔥 Lucky Spin gotowy — kręć!";
  } else {
    q("#m").textContent =
      `Jeszcze ${SPIN_TARGET - u.spinProgress} tapów do spinu`;
  }
};

q("#s").onclick = async () => {
  if (
    spinning ||
    !state ||
    state.spinProgress < SPIN_TARGET
  ) {
    return;
  }

  spinning = true;

  q("#s").disabled = true;
  q("#t").disabled = true;

  q("#m").textContent = "🎰 Kręcimy...";

  if (navigator.vibrate) {
    navigator.vibrate([40, 40, 40]);
  }

  const animation = setInterval(() => {
    draw(randomBoard());
  }, 90);

  const response = await fetch("/api/spin", {
    method: "POST"
  });

  const result = await response.json();

  setTimeout(() => {
    clearInterval(animation);

    if (!response.ok) {
      q("#m").textContent =
        result.error || "Spin niedostępny";

      spinning = false;
      q("#t").disabled = false;

      return;
    }

    draw(result.reels);

    render(result);

    q("#m").textContent =
      `💰 WYGRANA +${result.win} MONET!`;

    if (navigator.vibrate) {
      navigator.vibrate([70, 50, 100]);
    }

    spinning = false;
    q("#t").disabled = false;
  }, 1200);
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
