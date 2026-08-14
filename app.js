const q = (selector) =>
  document.querySelector(selector);

const qa = (selector) =>
  [...document.querySelectorAll(selector)];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const tg =
  window.Telegram?.WebApp;

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
const STORY_CHAPTERS_COUNT = 7;

let state = null;
let spinning = false;
let referralData = null;
let storyData = null;

/* =========================
   API
   ========================= */

function headers() {
  return {
    "Content-Type":
      "application/json",

    "X-Telegram-Init-Data":
      tg?.initData || ""
  };
}

async function api(
  url,
  options = {}
) {
  const response =
    await fetch(
      url,
      {
        ...options,

        headers: {
          ...headers(),
          ...(options.headers || {})
        }
      }
    );

  let data = {};

  try {
    data =
      await response.json();
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

/* =========================
   SLOT MACHINE
   ========================= */

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
  const reels =
    q("#r");

  if (!reels) {
    return;
  }

  reels.innerHTML =
    symbols
      .map(
        (symbol) =>
          `<i>${symbol}</i>`
      )
      .join("");
}

function animateTap() {
  const cells =
    qa("#r i");

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

    setTimeout(
      () => {
        cell.style.transform =
          "scale(1)";
      },
      120
    );
  }
}

/* =========================
   USER
   ========================= */

function renderUser(user) {
  if (!user) {
    return;
  }

  state = user;

  const coins =
    Number(
      user.coins || 0
    );

  const energy =
    Number(
      user.energy || 0
    );

  const maxEnergy =
    Number(
      user.maxEnergy || 5000
    );

  const taps =
    Number(
      user.taps || 0
    );

  const xp =
    Number(
      user.xp || 0
    );

  const rp =
    Number(
      user.rewardPoints || 0
    );

  const freeSpins =
    Number(
      user.freeSpins || 0
    );

  const spinProgress =
    Number(
      user.spinProgress || 0
    );

  const spinTarget =
    Number(
      user.spinTarget ||
      SPIN_TARGET
    );

  if (q("#c")) {
    q("#c").textContent =
      coins.toLocaleString(
        "pl-PL"
      );
  }

  if (q("#e")) {
    q("#e").textContent =
      `${energy.toLocaleString(
        "pl-PL"
      )}/${maxEnergy.toLocaleString(
        "pl-PL"
      )}`;
  }

  const energyProgress =
    q("#energy-progress");

  if (energyProgress) {
    energyProgress.max =
      maxEnergy;

    energyProgress.value =
      Math.min(
        energy,
        maxEnergy
      );
  }

  if (q("#n")) {
    q("#n").textContent =
      taps.toLocaleString(
        "pl-PL"
      );
  }

  if (q("#level")) {
    q("#level").textContent =
      Number(
        user.level || 1
      ).toLocaleString(
        "pl-PL"
      );
  }

  if (q("#xp")) {
    q("#xp").textContent =
      xp.toLocaleString(
        "pl-PL"
      );
  }

  if (q("#rp")) {
    q("#rp").textContent =
      rp.toLocaleString(
        "pl-PL"
      );
  }

  if (q("#free-spins")) {
    q("#free-spins")
      .textContent =
      freeSpins.toLocaleString(
        "pl-PL"
      );
  }

  if (q("#reward-balance")) {
    q("#reward-balance")
      .textContent =
      `${rp.toLocaleString(
        "pl-PL"
      )} RP`;
  }

  const progress =
    spinTarget > 0
      ? Math.min(
          100,
          Math.round(
            (
              spinProgress /
              spinTarget
            ) *
            100
          )
        )
      : 0;

  if (q("#p")) {
    q("#p").value =
      progress;
  }

  if (q("#spin-progress")) {
    q("#spin-progress")
      .textContent =
      `${spinProgress}/${spinTarget}`;
  }

  const boosts = [];

  if (user.x2Active) {
    boosts.push("x2");
  }

  if (user.vipActive) {
    boosts.push("VIP");
  }

  if (q("#boost")) {
    q("#boost").textContent =
      boosts.length
        ? boosts.join(" + ")
        : "—";
  }

  const currentChapter =
    Math.max(
      1,
      Math.min(
        STORY_CHAPTERS_COUNT,
        Number(
          user.storyChapter || 1
        )
      )
    );

  if (q("#city-progress")) {
    q("#city-progress")
      .textContent =
      `${currentChapter}/${STORY_CHAPTERS_COUNT}`;
  }

  if (q("#story-icon")) {
    q("#story-icon")
      .textContent =
      user.storyIcon ||
      "🎰";
  }

  if (q("#story-title")) {
    q("#story-title")
      .textContent =
      `Rozdział ${currentChapter} — ${
        user.storyTitle ||
        "Pierwszy Automat"
      }`;
  }

  const canSpin =
    freeSpins > 0 ||
    spinProgress >=
      spinTarget;

  if (q("#s")) {
    q("#s").disabled =
      !canSpin ||
      spinning;

    if (
      freeSpins > 0
    ) {
      q("#s").textContent =
        `🎁 LUCKY SPIN — BONUS x${freeSpins}`;
    } else if (
      spinProgress >=
      spinTarget
    ) {
      q("#s").textContent =
        "🎰 LUCKY SPIN — GOTOWY!";
    } else {
      q("#s").textContent =
        `🎰 LUCKY SPIN ${spinProgress}/${spinTarget}`;
    }
  }
}

async function loadUser() {
  try {
    const user =
      await api(
        "/api/me"
      );

    renderUser(user);

    if (q("#m")) {
      q("#m").textContent =
        user.freeSpins > 0
          ? `🎁 Masz ${user.freeSpins} bonusowych spinów`
          : "Tapnij i naładuj Lucky Spin!";
    }
  } catch (error) {
    console.error(
      "Load user:",
      error
    );

    if (q("#m")) {
      q("#m").textContent =
        "❌ Nie udało się zalogować";
    }

    if (q("#t")) {
      q("#t").disabled =
        true;
    }

    if (q("#s")) {
      q("#s").disabled =
        true;
    }
  }
}

/* =========================
   STORY
   ========================= */

async function loadStory() {
  try {
    storyData =
      await api(
        "/api/story"
      );

    const current =
      storyData.current;

    if (!current) {
      return;
    }

    if (q("#story-icon")) {
      q("#story-icon")
        .textContent =
        current.icon;
    }

    if (q("#story-title")) {
      q("#story-title")
        .textContent =
        `Rozdział ${current.chapter} — ${current.title}`;
    }

    if (
      q(
        "#story-description"
      )
    ) {
      q(
        "#story-description"
      ).textContent =
        current.subtitle ||
        current.description;
    }

    if (
      q(
        "#story-detail-title"
      )
    ) {
      q(
        "#story-detail-title"
      ).textContent =
        `${current.icon} ${current.title}`;
    }

    if (
      q(
        "#story-detail-description"
      )
    ) {
      q(
        "#story-detail-description"
      ).textContent =
        current.description;
    }

    if (
      q(
        "#story-detail-objective"
      )
    ) {
      q(
        "#story-detail-objective"
      ).textContent =
        current.objective;
    }

    if (
      q(
        "#city-progress"
      )
    ) {
      q(
        "#city-progress"
      ).textContent =
        `${current.chapter}/${STORY_CHAPTERS_COUNT}`;
    }

    const box =
      q(
        "#story-chapters"
      );

    if (!box) {
      return;
    }

    box.innerHTML =
      storyData.chapters
        .map(
          (chapter) => `
            <article
              class="story-card ${
                chapter.unlocked
                  ? "unlocked"
                  : "locked"
              }"
            >
              <strong>
                ${escapeHtml(
                  chapter.icon
                )}
                Rozdział
                ${Number(
                  chapter.chapter
                )}
                —
                ${escapeHtml(
                  chapter.title
                )}
              </strong>

              <p>
                ${escapeHtml(
                  chapter.subtitle
                )}
              </p>

              <small>
                ${
                  chapter.unlocked
                    ? "✅ Odblokowany"
                    : `🔒 Level ${Number(
                        chapter.minLevel
                      )}`
                }
              </small>
            </article>
          `
        )
        .join("");
  } catch (error) {
    console.error(
      "Story:",
      error
    );

    const box =
      q(
        "#story-chapters"
      );

    if (box) {
      box.innerHTML =
        `
        <div class="list-card">
          <small>
            Nie udało się pobrać Lucky City.
          </small>
        </div>
        `;
    }
  }
}

/* =========================
   TAP
   ========================= */

async function tap() {
  if (spinning) {
    return;
  }

  animateTap();

  if (
    navigator.vibrate
  ) {
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

    const message =
      q("#m");

    if (!message) {
      return;
    }

    const target =
      Number(
        user.spinTarget ||
        SPIN_TARGET
      );

    if (
      Number(
        user.energy
      ) <= 0
    ) {
      message.textContent =
        "⚡ Brak energii — poczekaj na regenerację.";
    } else if (
      Number(
        user.freeSpins
      ) > 0
    ) {
      message.textContent =
        `🎁 Bonusowe spiny: ${user.freeSpins}`;
    } else if (
      Number(
        user.spinProgress
      ) >=
      target
    ) {
      message.textContent =
        "🔥 Lucky Spin gotowy!";
    } else {
      message.textContent =
        `Jeszcze ${
          target -
          Number(
            user.spinProgress
          )
        } tapów do spinu`;
    }
  } catch (error) {
    if (q("#m")) {
      q("#m").textContent =
        `❌ ${error.message}`;
    }
  }
}

/* =========================
   SPIN
   ========================= */

async function spin() {
  if (
    spinning ||
    !state
  ) {
    return;
  }

  const target =
    Number(
      state.spinTarget ||
      SPIN_TARGET
    );

  const canSpin =
    Number(
      state.freeSpins
    ) > 0 ||
    Number(
      state.spinProgress
    ) >=
      target;

  if (!canSpin) {
    return;
  }

  spinning = true;

  if (q("#t")) {
    q("#t").disabled =
      true;
  }

  if (q("#s")) {
    q("#s").disabled =
      true;
  }

  if (q("#m")) {
    q("#m").textContent =
      "🎰 Kręcimy...";
  }

  const animation =
    setInterval(
      () => {
        drawReels(
          randomBoard()
        );
      },
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
          1100
        )
    );

    clearInterval(
      animation
    );

    drawReels(
      result.reels
    );

    renderUser(
      result
    );

    if (q("#m")) {
      q("#m").textContent =
        `💰 WYGRANA +${Number(
          result.win || 0
        ).toLocaleString(
          "pl-PL"
        )} MONET!`;
    }

    if (
      navigator.vibrate
    ) {
      navigator.vibrate(
        [
          70,
          40,
          100
        ]
      );
    }

    await loadStory();
  } catch (error) {
    clearInterval(
      animation
    );

    if (q("#m")) {
      q("#m").textContent =
        `❌ ${error.message}`;
    }
  } finally {
    spinning =
      false;

    if (q("#t")) {
      q("#t").disabled =
        false;
    }

    if (state) {
      renderUser(
        state
      );
    }
  }
}

/* =========================
   DAILY
   ========================= */

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

    await loadStory();

    alert(
      `🎁 Daily Bonus\n\n` +
      `+${Number(
        result.reward.coins
      ).toLocaleString(
        "pl-PL"
      )} Coins\n` +
      `+${Number(
        result.reward.rewardPoints
      ).toLocaleString(
        "pl-PL"
      )} RP\n` +
      `+${Number(
        result.reward.energy || 0
      ).toLocaleString(
        "pl-PL"
      )} Energii\n` +
      `🔥 Streak: ${result.reward.streak}`
    );
  } catch (error) {
    alert(
      error.message
    );
  }
}

/* =========================
   COIN SHOP
   ========================= */

async function buyCoinProduct(
  key
) {
  try {
    const result =
      await api(
        `/api/shop/coins/${encodeURIComponent(
          key
        )}`,
        {
          method: "POST"
        }
      );

    renderUser(
      result.user
    );

    alert(
      "✅ Zakup zakończony!"
    );
  } catch (error) {
    alert(
      error.message
    );
  }
}

/* =========================
   STARS
   ========================= */

async function buyStarProduct(
  key
) {
  try {
    const result =
      await api(
        `/api/shop/stars/${encodeURIComponent(
          key
        )}`,
        {
          method: "POST"
        }
      );

    if (
      !tg ||
      typeof tg.openInvoice !==
        "function"
    ) {
      alert(
        "Zakupy Telegram Stars działają wewnątrz Telegrama."
      );

      return;
    }

    tg.openInvoice(
      result.invoiceLink,
      (status) => {
        if (
          status ===
          "paid"
        ) {
          if (q("#m")) {
            q("#m").textContent =
              "⭐ Płatność przyjęta...";
          }

          setTimeout(
            async () => {
              await loadUser();
              await loadStory();

              alert(
                "🎁 Zakup dodany do konta!"
              );
            },
            1500
          );
        }

        if (
          status ===
          "cancelled"
        ) {
          alert(
            "Płatność anulowana."
          );
        }

        if (
          status ===
          "failed"
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

/* =========================
   MISSIONS
   ========================= */

function difficultyName(
  difficulty
) {
  const names = {
    easy:
      "ŁATWA",

    normal:
      "NORMALNA",

    hard:
      "TRUDNA",

    epic:
      "EPICKA",

    legendary:
      "LEGENDARNA"
  };

  return (
    names[difficulty] ||
    String(
      difficulty ||
      ""
    ).toUpperCase()
  );
}

async function loadMissions() {
  const box =
    q("#missions-list");

  if (!box) {
    return;
  }

  try {
    const missions =
      await api(
        "/api/missions"
      );

    box.innerHTML =
      missions
        .map(
          (mission) => {
            const progress =
              Number(
                mission.progress || 0
              );

            const target =
              Number(
                mission.target || 1
              );

            const percent =
              Math.min(
                100,
                Math.round(
                  (
                    progress /
                    target
                  ) *
                  100
                )
              );

            return `
              <article
                class="list-card mission-card"
              >
                <div class="mission-content">

                  <div class="mission-header">
                    <strong>
                      ${escapeHtml(
                        mission.title
                      )}
                    </strong>

                    <span
                      class="mission-difficulty"
                    >
                      ${escapeHtml(
                        difficultyName(
                          mission.difficulty
                        )
                      )}
                    </span>
                  </div>

                  <p>
                    ${escapeHtml(
                      mission.description ||
                      ""
                    )}
                  </p>

                  <div
                    class="mission-progress-row"
                  >
                    <span>
                      Postęp
                    </span>

                    <strong>
                      ${progress.toLocaleString(
                        "pl-PL"
                      )}/${target.toLocaleString(
                        "pl-PL"
                      )}
                    </strong>
                  </div>

                  <progress
                    class="mission-progress"
                    max="100"
                    value="${percent}"
                  ></progress>

                  <small>
                    🪙 +${Number(
                      mission.reward.coins
                    ).toLocaleString(
                      "pl-PL"
                    )} Coins
                    · 🎁 +${Number(
                      mission.reward.rewardPoints
                    ).toLocaleString(
                      "pl-PL"
                    )} RP
                    · ⭐ +${Number(
                      mission.reward.xp
                    ).toLocaleString(
                      "pl-PL"
                    )} XP
                  </small>

                </div>

                <button
                  type="button"
                  class="mission-claim"
                  data-mission="${escapeHtml(
                    mission.key
                  )}"
                  ${
                    !mission.completed ||
                    mission.claimed
                      ? "disabled"
                      : ""
                  }
                >
                  ${
                    mission.claimed
                      ? "✅ ODEBRANE"
                      : mission.completed
                        ? "🎁 ODBIERZ"
                        : "🔒 W TRAKCIE"
                  }
                </button>

              </article>
            `;
          }
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
                  `/api/missions/${encodeURIComponent(
                    button.dataset.mission
                  )}/claim`,
                  {
                    method:
                      "POST"
                  }
                );

              renderUser(
                result.user
              );

              await loadMissions();
              await loadStory();

              alert(
                `🎯 Misja ukończona!\n\n` +
                `+${Number(
                  result.reward.coins
                ).toLocaleString(
                  "pl-PL"
                )} Coins\n` +
                `+${Number(
                  result.reward.rewardPoints
                ).toLocaleString(
                  "pl-PL"
                )} RP\n` +
                `+${Number(
                  result.reward.xp
                ).toLocaleString(
                  "pl-PL"
                )} XP`
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
    box.innerHTML =
      `
      <div class="list-card">
        <small>
          ${escapeHtml(
            error.message
          )}
        </small>
      </div>
      `;
  }
}

/* =========================
   LEADERBOARD
   ========================= */

async function loadLeaderboard() {
  const box =
    q("#leaderboard");

  if (!box) {
    return;
  }

  try {
    const list =
      await api(
        "/api/leaderboard"
      );

    if (!list.length) {
      box.innerHTML =
        `
        <div class="list-card">
          <small>
            Ranking jest jeszcze pusty.
          </small>
        </div>
        `;

      return;
    }

    box.innerHTML =
      list
        .map(
          (player) => {
            let medal =
              `#${player.rank}`;

            if (
              player.rank === 1
            ) {
              medal = "🥇";
            }

            if (
              player.rank === 2
            ) {
              medal = "🥈";
            }

            if (
              player.rank === 3
            ) {
              medal = "🥉";
            }

            return `
              <div
                class="list-card leaderboard-row"
              >
                <strong
                  class="leaderboard-rank"
                >
                  ${medal}
                </strong>

                <span
                  class="leaderboard-name"
                >
                  ${escapeHtml(
                    player.name
                  )}
                </span>

                <b
                  class="leaderboard-score"
                >
                  ${Number(
                    player.weeklyCoins
                  ).toLocaleString(
                    "pl-PL"
                  )}
                </b>
              </div>
            `;
          }
        )
        .join("");
  } catch (error) {
    box.innerHTML =
      `
      <div class="list-card">
        <small>
          ${escapeHtml(
            error.message
          )}
        </small>
      </div>
      `;
  }
}

/* =========================
   REFERRALS
   ========================= */

async function loadReferrals() {
  try {
    referralData =
      await api(
        "/api/referrals"
      );

    const count =
      Number(
        referralData.referrals ||
        0
      );

    const coinsPerRef =
      Number(
        referralData.rewards
          ?.referrerCoins ||
        0
      );

    const rpPerRef =
      Number(
        referralData.rewards
          ?.referrerRP ||
        0
      );

    if (q("#ref-code")) {
      q("#ref-code")
        .textContent =
        referralData.referralCode ||
        "—";
    }

    if (q("#ref-count")) {
      q("#ref-count")
        .textContent =
        `Poleceni: ${count}`;
    }

    if (
      q(
        "#ref-my-reward"
      )
    ) {
      q(
        "#ref-my-reward"
      ).textContent =
        `🪙 ${coinsPerRef.toLocaleString(
          "pl-PL"
        )} Coins + 🎁 ${rpPerRef.toLocaleString(
          "pl-PL"
        )} RP`;
    }

    if (
      q(
        "#ref-friend-reward"
      )
    ) {
      q(
        "#ref-friend-reward"
      ).textContent =
        `🪙 ${Number(
          referralData.rewards
            ?.invitedCoins ||
          0
        ).toLocaleString(
          "pl-PL"
        )} Coins`;
    }

    if (
      q(
        "#ref-total-earned"
      )
    ) {
      q(
        "#ref-total-earned"
      ).textContent =
        `${(
          count *
          coinsPerRef
        ).toLocaleString(
          "pl-PL"
        )} Coins + ${(
          count *
          rpPerRef
        ).toLocaleString(
          "pl-PL"
        )} RP`;
    }
  } catch (error) {
    console.error(
      "Referrals:",
      error
    );

    if (q("#ref-code")) {
      q("#ref-code")
        .textContent =
        "Błąd";
    }
  }
}

function referralLink() {
  if (!referralData) {
    return null;
  }

  const botUsername =
    "ACABBACA_bot";

  return (
    `https://t.me/${botUsername}?startapp=` +
    encodeURIComponent(
      referralData.startParam
    )
  );
}

async function shareReferral() {
  if (!referralData) {
    await loadReferrals();
  }

  const link =
    referralLink();

  if (!link) {
    alert(
      "Nie udało się pobrać linku polecającego."
    );

    return;
  }

  const text =
    `🎰 Zagraj w Lucky Tap Slots!\n` +
    `Rozwijaj Lucky City, wykonuj misje i zdobywaj nagrody.\n\n` +
    link;

  try {
    if (
      navigator.share
    ) {
      await navigator.share(
        {
          title:
            "Lucky Tap Slots",

          text
        }
      );

      return;
    }

    await navigator
      .clipboard
      .writeText(link);

    alert(
      "✅ Link polecający został skopiowany."
    );
  } catch {
    alert(
      `Twój link polecający:\n\n${link}`
    );
  }
}

async function copyReferral() {
  if (!referralData) {
    await loadReferrals();
  }

  const link =
    referralLink();

  if (!link) {
    alert(
      "Nie udało się pobrać linku."
    );

    return;
  }

  try {
    await navigator
      .clipboard
      .writeText(link);

    const button =
      q("#copy-ref");

    if (button) {
      const original =
        button.textContent;

      button.textContent =
        "✅ SKOPIOWANO";

      setTimeout(
        () => {
          button.textContent =
            original;
        },
        1500
      );
    }
  } catch {
    alert(
      `Twój link:\n\n${link}`
    );
  }
}

/* =========================
   REWARD CENTER
   ========================= */

async function loadRewards() {
  const box =
    q("#rewards-list");

  if (!box) {
    return;
  }

  try {
    const data =
      await api(
        "/api/rewards"
      );

    if (
      q(
        "#reward-balance"
      )
    ) {
      q(
        "#reward-balance"
      ).textContent =
        `${Number(
          data.balance || 0
        ).toLocaleString(
          "pl-PL"
        )} RP`;
    }

    box.innerHTML =
      data.rewards
        .map(
          (reward) => `
            <article
              class="list-card reward-card"
            >
              <div>
                <strong>
                  🎁 ${escapeHtml(
                    reward.label
                  )}
                </strong>

                <p>
                  ${Number(
                    reward.cost
                  ).toLocaleString(
                    "pl-PL"
                  )} RP
                </p>

                <small>
                  Wymagany Level
                  ${Number(
                    reward.minLevel
                  )}
                </small>
              </div>

              <button
                type="button"
                class="reward-redeem"
                data-reward="${escapeHtml(
                  reward.key
                )}"
                ${
                  reward.available
                    ? ""
                    : "disabled"
                }
              >
                ${
                  reward.available
                    ? "ODBIERZ"
                    : "ZABLOKOWANE"
                }
              </button>
            </article>
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
                  `/api/rewards/${encodeURIComponent(
                    button.dataset.reward
                  )}/redeem`,
                  {
                    method:
                      "POST"
                  }
                );

              alert(
                `✅ ${result.message}\n\nID zgłoszenia: ${result.redemptionId}`
              );

              await loadUser();
              await loadRewards();
              await loadRewardHistory();
            } catch (error) {
              alert(
                error.message
              );
            }
          };
      }
    );
  } catch (error) {
    box.innerHTML =
      `
      <div class="list-card">
        <small>
          ${escapeHtml(
            error.message
          )}
        </small>
      </div>
      `;
  }
}

/* =========================
   REWARD HISTORY
   ========================= */

async function loadRewardHistory() {
  const box =
    q("#reward-history");

  if (!box) {
    return;
  }

  try {
    const history =
      await api(
        "/api/rewards/history"
      );

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
        .map(
          (item) => {
            let statusText =
              "⏳ Oczekuje";

            let statusClass =
              "pending";

            if (
              item.status ===
              "approved"
            ) {
              statusText =
                "✅ Zatwierdzono";

              statusClass =
                "approved";
            }

            if (
              item.status ===
              "rejected"
            ) {
              statusText =
                "❌ Odrzucono";

              statusClass =
                "rejected";
            }

            let extra = "";

            if (
              item.adminNote
            ) {
              extra += `
                <div class="reward-note">
                  💬 ${escapeHtml(
                    item.adminNote
                  )}
                </div>
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
                    type="button"
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
              <article
                class="list-card reward-history-card"
              >
                <div>

                  <strong>
                    ${escapeHtml(
                      item.label
                    )}
                  </strong>

                  <div
                    class="reward-status ${statusClass}"
                  >
                    ${statusText}
                  </div>

                  <small>
                    ${Number(
                      item.cost
                    ).toLocaleString(
                      "pl-PL"
                    )} RP
                  </small>

                  ${extra}

                </div>
              </article>
            `;
          }
        )
        .join("");

    qa(
      ".copy-reward-code"
    ).forEach(
      (button) => {
        button.onclick =
          async () => {
            const code =
              button.dataset.code;

            try {
              await navigator
                .clipboard
                .writeText(
                  code
                );

              const original =
                button.textContent;

              button.textContent =
                "✅ SKOPIOWANO";

              setTimeout(
                () => {
                  button.textContent =
                    original;
                },
                1500
              );
            } catch {
              alert(
                `Kod: ${code}`
              );
            }
          };
      }
    );
  } catch (error) {
    console.error(
      "Reward history:",
      error
    );

    box.innerHTML =
      `
      <div class="list-card">
        <small>
          Nie udało się pobrać historii.
        </small>
      </div>
      `;
  }
}

/* =========================
   PAGES
   ========================= */

async function showPage(
  name
) {
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

  window.scrollTo(
    {
      top: 0,
      behavior: "smooth"
    }
  );

  if (
    name === "story"
  ) {
    await loadStory();
  }

  if (
    name === "missions"
  ) {
    await loadMissions();
  }

  if (
    name === "ranking"
  ) {
    await Promise.all(
      [
        loadLeaderboard(),
        loadReferrals()
      ]
    );
  }

  if (
    name === "rewards"
  ) {
    await Promise.all(
      [
        loadRewards(),
        loadRewardHistory()
      ]
    );
  }
}

/* =========================
   EVENTS
   ========================= */

if (q("#t")) {
  q("#t").onclick =
    tap;
}

if (q("#s")) {
  q("#s").onclick =
    spin;
}

if (q("#daily")) {
  q("#daily").onclick =
    claimDaily;
}

if (q("#share-ref")) {
  q("#share-ref").onclick =
    shareReferral;
}

if (q("#copy-ref")) {
  q("#copy-ref").onclick =
    copyReferral;
}

qa(
  ".coin-buy"
).forEach(
  (button) => {
    button.onclick =
      () =>
        buyCoinProduct(
          button.dataset.product
        );
  }
);

qa(
  ".star-buy"
).forEach(
  (button) => {
    button.onclick =
      () =>
        buyStarProduct(
          button.dataset
            .starProduct
        );
  }
);

qa(
  ".nav-btn"
).forEach(
  (button) => {
    button.onclick =
      () =>
        showPage(
          button.dataset.page
        );
  }
);

/* =========================
   START
   ========================= */

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

async function startApp() {
  await loadUser();

  await loadStory();
}

startApp();
