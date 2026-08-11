const q = (s) => document.querySelector(s);
const qa = (s) => [...document.querySelectorAll(s)];

const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

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
let referralData = null;

function headers() {
  return {
    "Content-Type": "application/json",
    "X-Telegram-Init-Data": tg?.initData || ""
  };
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers(),
      ...(options.headers || {})
    }
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      "Błąd połączenia"
    );
  }

  return data;
}

function randomSymbol() {
  return SYMBOLS[
    Math.floor(
      Math.random() *
      SYMBOLS.length
    )
  ];
}

function randomBoard() {
  return Array.from(
    { length: 9 },
    randomSymbol
  );
}

function drawReels(
  symbols = randomBoard()
) {
  q("#r").innerHTML =
    symbols
      .map(
        (symbol) =>
          `<i>${symbol}</i>`
      )
      .join("");
}

function renderUser(user) {
  state = user;

  q("#c").textContent =
    Number(
      user.coins || 0
    ).toLocaleString("pl-PL");

  q("#e").textContent =
    `${user.energy}/${user.maxEnergy}`;

  q("#n").textContent =
    Number(
      user.taps || 0
    ).toLocaleString("pl-PL");

  q("#level").textContent =
    user.level || 1;

  q("#xp").textContent =
    Number(
      user.xp || 0
    ).toLocaleString("pl-PL");

  q("#rp").textContent =
    Number(
      user.rewardPoints || 0
    ).toLocaleString("pl-PL");

  q("#free-spins").textContent =
    user.freeSpins || 0;

  q("#reward-balance").textContent =
    `${Number(
      user.rewardPoints || 0
    ).toLocaleString("pl-PL")} RP`;

  const progress =
    Math.min(
      100,
      Math.round(
        (
          user.spinProgress /
          SPIN_TARGET
        ) * 100
      )
    );

  q("#p").value =
    progress;

  q("#spin-progress").textContent =
    `${user.spinProgress}/${SPIN_TARGET}`;

  const boostText = [];

  if (user.x2Active) {
    boostText.push("x2");
  }

  if (user.vipActive) {
    boostText.push("VIP");
  }

  q("#boost").textContent =
    boostText.length
      ? boostText.join(" + ")
      : "—";

  const canSpin =
    user.freeSpins > 0 ||
    user.spinProgress >=
      SPIN_TARGET;

  q("#s").disabled =
    !canSpin || spinning;

  if (user.freeSpins > 0) {
    q("#s").textContent =
      `🎁 LUCKY SPIN — BONUS x${user.freeSpins}`;
  } else if (
    user.spinProgress >=
    SPIN_TARGET
  ) {
    q("#s").textContent =
      "🎰 LUCKY SPIN — GOTOWY!";
  } else {
    q("#s").textContent =
      `🎰 LUCKY SPIN ${user.spinProgress}/${SPIN_TARGET}`;
  }
}

function animateTap() {
  const cells =
    qa("#r i");

  if (!cells.length) return;

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

async function loadUser() {
  try {
    const user =
      await api("/api/me");

    renderUser(user);

    q("#m").textContent =
      user.freeSpins > 0
        ? `🎁 Masz ${user.freeSpins} bonusowych spinów`
        : "Tapnij i naładuj Lucky Spin!";
  } catch (error) {
    console.error(error);

    q("#m").textContent =
      "❌ Nie udało się zalogować";

    q("#t").disabled = true;
    q("#s").disabled = true;
  }
}

async function tap() {
  if (spinning) return;

  animateTap();

  if (navigator.vibrate) {
    navigator.vibrate(18);
  }

  try {
    const user =
      await api(
        "/api/tap",
        {
          method: "POST"
        }
      );

    renderUser(user);

    if (
      user.freeSpins > 0
    ) {
      q("#m").textContent =
        `🎁 Bonusowe spiny: ${user.freeSpins}`;
    } else if (
      user.spinProgress >=
      SPIN_TARGET
    ) {
      q("#m").textContent =
        "🔥 Lucky Spin gotowy!";
    } else {
      q("#m").textContent =
        `Jeszcze ${
          SPIN_TARGET -
          user.spinProgress
        } tapów do spinu`;
    }
  } catch (error) {
    q("#m").textContent =
      `❌ ${error.message}`;
  }
}

async function spin() {
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

  if (!canSpin) return;

  spinning = true;

  q("#t").disabled = true;
  q("#s").disabled = true;

  q("#m").textContent =
    "🎰 Kręcimy...";

  const animation =
    setInterval(
      () =>
        drawReels(
          randomBoard()
        ),
      90
    );

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

    clearInterval(animation);

    drawReels(
      result.reels
    );

    renderUser(
      result
    );

    q("#m").textContent =
      `💰 WYGRANA +${result.win} MONET!`;

    if (navigator.vibrate) {
      navigator.vibrate([
        70,
        40,
        100
      ]);
    }
  } catch (error) {
    clearInterval(animation);

    q("#m").textContent =
      `❌ ${error.message}`;
  } finally {
    spinning = false;

    q("#t").disabled = false;

    if (state) {
      renderUser(state);
    }
  }
}

async function claimDaily() {
  try {
    const result =
      await api(
        "/api/daily/claim",
        {
          method: "POST"
        }
      );

    renderUser(
      result.user
    );

    alert(
      `🎁 Daily Bonus\n\n+${result.reward.coins} Coins\n+${result.reward.rewardPoints} RP\nStreak: ${result.reward.streak}`
    );
  } catch (error) {
    alert(
      error.message
    );
  }
}

async function buyCoinProduct(
  key
) {
  try {
    const result =
      await api(
        `/api/shop/coins/${key}`,
        {
          method: "POST"
        }
      );

    renderUser(
      result.user
    );

    alert(
      "✅ Zakupiony!"
    );
  } catch (error) {
    alert(
      error.message
    );
  }
}

async function buyStarProduct(
  key
) {
  try {
    const result =
      await api(
        `/api/shop/stars/${key}`,
        {
          method: "POST"
        }
      );

    if (!tg) {
      alert(
        "Zakupy Stars działają w Telegramie."
      );

      return;
    }

    tg.openInvoice(
      result.invoiceLink,
      async (status) => {
        if (
          status === "paid"
        ) {
          q("#m").textContent =
            "⭐ Płatność przyjęta...";

          setTimeout(
            async () => {
              await loadUser();

              alert(
                "🎁 Zakup dodany do konta!"
              );
            },
            1500
          );
        }

        if (
          status === "cancelled"
        ) {
          alert(
            "Płatność anulowana."
          );
        }

        if (
          status === "failed"
        ) {
          alert(
            "Płatność nie powiodła się."
          );
        }
      }
    );
  } catch (error) {
    alert(
      error.message
    );
  }
}

async function loadMissions() {
  try {
    const missions =
      await api(
        "/api/missions"
      );

    q("#missions-list").innerHTML =
      missions
        .map(
          (mission) => `
            <div class="list-card">
              <div>
                <strong>
                  ${mission.title}
                </strong>

                <p>
                  ${mission.progress}/${mission.target}
                </p>

                <small>
                  +${mission.reward.coins} Coins ·
                  +${mission.reward.rewardPoints} RP ·
                  +${mission.reward.xp} XP
                </small>
              </div>

              <button
                class="mission-claim"
                data-mission="${mission.key}"
                ${
                  !mission.completed ||
                  mission.claimed
                    ? "disabled"
                    : ""
                }
              >
                ${
                  mission.claimed
                    ? "Odebrane"
                    : "Odbierz"
                }
              </button>
            </div>
          `
        )
        .join("");

    qa(
      ".mission-claim"
    ).forEach(
      (button) => {
        button.onclick =
          async () => {
            try {
              const result =
                await api(
                  `/api/missions/${button.dataset.mission}/claim`,
                  {
                    method:
                      "POST"
                  }
                );

              renderUser(
                result.user
              );

              await loadMissions();

              alert(
                "🎯 Nagroda odebrana!"
              );
            } catch (error) {
              alert(
                error.message
              );
            }
          };
      }
    );
  } catch (error) {
    q("#missions-list").innerHTML =
      `<p>${error.message}</p>`;
  }
}

async function loadLeaderboard() {
  try {
    const list =
      await api(
        "/api/leaderboard"
      );

    q("#leaderboard").innerHTML =
      list
        .map(
          (player) => `
            <div class="list-card leaderboard-row">
              <strong>
                #${player.rank}
              </strong>

              <span>
                ${player.name}
              </span>

              <b>
                ${Number(
                  player.weeklyCoins
                ).toLocaleString("pl-PL")}
              </b>
            </div>
          `
        )
        .join("");
  } catch (error) {
    q("#leaderboard").innerHTML =
      `<p>${error.message}</p>`;
  }
}

async function loadReferrals() {
  try {
    referralData =
      await api(
        "/api/referrals"
      );

    q("#ref-count").textContent =
      `Poleceni: ${referralData.referrals}`;
  } catch (error) {
    console.error(error);
  }
}

async function shareReferral() {
  if (!referralData) {
    await loadReferrals();
  }

  if (!referralData) return;

  const botUsername =
    "ACABBACA_bot";

  const link =
    `https://t.me/${botUsername}?startapp=${referralData.startParam}`;

  const text =
    "🎰 Zagraj w Lucky Tap Slots i odbierz bonus!";

  if (tg?.openTelegramLink) {
    tg.openTelegramLink(
      `https://t.me/share/url?url=${encodeURIComponent(
        link
      )}&text=${encodeURIComponent(
        text
      )}`
    );
  } else {
    navigator.clipboard
      ?.writeText(link);

    alert(
      `Link skopiowany:\n${link}`
    );
  }
}

async function loadRewards() {
  async function loadRewardHistory() {
  try {
    const history =
      await api(
        "/api/rewards/history"
      );

    const box =
      q("#reward-history");

    if (!history.length) {
      box.innerHTML =
        `
        <div class="list-card">
          <small>
            Nie masz jeszcze żadnych zgłoszeń.
          </small>
        </div>
        `;

      return;
    }

    box.innerHTML =
      history
        .map(item => {
          let statusText =
            "⏳ Oczekuje";

          if (
            item.status ===
            "approved"
          ) {
            statusText =
              "✅ Zatwierdzono";
          }

          if (
            item.status ===
            "rejected"
          ) {
            statusText =
              "❌ Odrzucono";
          }

          let extra = "";

          if (
            item.adminNote
          ) {
            extra += `
              <p>
                💬 ${escapeHtml(
                  item.adminNote
                )}
              </p>
            `;
          }

          if (
            item.status ===
              "approved" &&
            item.fulfillmentCode
          ) {
            extra += `
              <div class="reward-code">
                <small>
                  TWÓJ KOD
                </small>

                <strong>
                  ${escapeHtml(
                    item.fulfillmentCode
                  )}
                </strong>

                <button
                  class="copy-reward-code"
                  data-code="${escapeHtml(
                    item.fulfillmentCode
                  )}"
                >
                  📋 KOPIUJ
                </button>
              </div>
            `;
          }

          return `
            <div class="list-card reward-history-card">
              <div>
                <strong>
                  ${escapeHtml(
                    item.label
                  )}
                </strong>

                <p>
                  ${statusText}
                </p>

                <small>
                  ${Number(
                    item.cost
                  ).toLocaleString(
                    "pl-PL"
                  )} RP
                </small>

                ${extra}
              </div>
            </div>
          `;
        })
        .join("");

    qa(
      ".copy-reward-code"
    ).forEach(button => {
      button.onclick =
        async () => {
          const code =
            button.dataset.code;

          try {
            await navigator
              .clipboard
              .writeText(code);

            button.textContent =
              "✅ SKOPIOWANO";

            setTimeout(
              () => {
                button.textContent =
                  "📋 KOPIUJ";
              },
              1500
            );
          } catch {
            alert(
              `Kod: ${code}`
            );
          }
        };
    });
  } catch (error) {
    console.error(
      "Reward history:",
      error
    );

    q("#reward-history").innerHTML =
      `
      <div class="list-card">
        <small>
          Nie udało się pobrać historii.
        </small>
      </div>
      `;
  }
}
  try {
    const data =
      await api(
        "/api/rewards"
      );

    q("#reward-balance").textContent =
      `${Number(
        data.balance
      ).toLocaleString("pl-PL")} RP`;

    q("#rewards-list").innerHTML =
      data.rewards
        .map(
          (reward) => `
            <div class="list-card">
              <div>
                <strong>
                  🎁 ${reward.label}
                </strong>

                <p>
                  ${reward.cost} RP
                </p>

                <small>
                  Wymagany Level ${reward.minLevel}
                </small>
              </div>

              <button
                class="reward-redeem"
                data-reward="${reward.key}"
                ${
                  reward.available
                    ? ""
                    : "disabled"
                }
              >
                Odbierz
              </button>
            </div>
          `
        )
        .join("");

    qa(
      ".reward-redeem"
    ).forEach(
      (button) => {
        button.onclick =
          async () => {
            const confirmed =
              confirm(
                "Wysłać zgłoszenie nagrody?"
              );

            if (!confirmed) {
              return;
            }

            try {
              const result =
                await api(
                  `/api/rewards/${button.dataset.reward}/redeem`,
                  {
                    method:
                      "POST"
                  }
                );

              alert(
                `✅ ${result.message}\nID: ${result.redemptionId}`
              );

              await loadUser();
              await loadRewards();
            } catch (error) {
              alert(
                error.message
              );
            }
          };
      }
    );
  } catch (error) {
    q("#rewards-list").innerHTML =
      `<p>${error.message}</p>`;
  }
}

function showPage(name) {
  qa(".page").forEach(
    (page) =>
      page.classList.remove(
        "active"
      )
  );

  qa(".nav-btn").forEach(
    (button) =>
      button.classList.remove(
        "active"
      )
  );

  q(
    `#page-${name}`
  )?.classList.add(
    "active"
  );

  q(
    `.nav-btn[data-page="${name}"]`
  )?.classList.add(
    "active"
  );

  if (
    name === "missions"
  ) {
    loadMissions();
  }

  if (
    name === "ranking"
  ) {
    loadLeaderboard();
    loadReferrals();
  }

  if (
    name === "rewards"
  ) {
    loadRewards();
  }
}

q("#t").onclick =
  tap;

q("#s").onclick =
  spin;

q("#daily").onclick =
  claimDaily;

q("#share-ref").onclick =
  shareReferral;

qa(".coin-buy").forEach(
  (button) => {
    button.onclick =
      () =>
        buyCoinProduct(
          button.dataset.product
        );
  }
);

qa(".star-buy").forEach(
  (button) => {
    button.onclick =
      () =>
        buyStarProduct(
          button.dataset.starProduct
        );
  }
);

qa(".nav-btn").forEach(
  (button) => {
    button.onclick =
      () =>
        showPage(
          button.dataset.page
        );
  }
);

drawReels([
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

loadUser();;
