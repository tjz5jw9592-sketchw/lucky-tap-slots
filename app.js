const q = (selector) =>
  document.querySelector(
    selector
  );

const qa = (selector) =>
  [
    ...document.querySelectorAll(
      selector
    )
  ];

function escapeHtml(value) {
  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

const tg =
  window.Telegram
    ?.WebApp;

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
let storyData = null;

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
          ...(
            options.headers ||
            {}
          )
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
    {
      length: 9
    },
    randomSymbol
  );
}

function drawReels(
  symbols =
    randomBoard()
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

function renderStorySummary(
  user
) {
  const chapter =
    user.storyChapter ||
    1;

  const title =
    user.storyTitle ||
    "Pierwszy Automat";

  const icon =
    user.storyIcon ||
    "🎰";

  const chapterBox =
    q(
      "#story-chapter"
    );

  const titleBox =
    q(
      "#story-title"
    );

  const iconBox =
    q(
      "#story-icon"
    );

  const nextBox =
    q(
      "#story-next-level"
    );

  if (chapterBox) {
    chapterBox.textContent =
      `Rozdział ${chapter}`;
  }

  if (titleBox) {
    titleBox.textContent =
      title;
  }

  if (iconBox) {
    iconBox.textContent =
      icon;
  }

  if (nextBox) {
    nextBox.textContent =
      user.nextStoryLevel
        ? `Następny rozdział: Level ${user.nextStoryLevel}`
        : "Wszystkie rozdziały odblokowane";
  }
}

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
      user.rewardPoints ||
      0
    );

  const freeSpins =
    Number(
      user.freeSpins ||
      0
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

  if (
    q(
      "#energy-progress"
    )
  ) {
    q(
      "#energy-progress"
    ).max =
      maxEnergy;

    q(
      "#energy-progress"
    ).value =
      Math.min(
        energy,
        maxEnergy
      );
  }

  if (
    q(
      "#energy-percent"
    )
  ) {
    const percent =
      maxEnergy > 0
        ? Math.round(
            (
              energy /
              maxEnergy
            ) * 100
          )
        : 0;

    q(
      "#energy-percent"
    ).textContent =
      `${percent}%`;
  }

  if (q("#n")) {
    q("#n").textContent =
      taps.toLocaleString(
        "pl-PL"
      );
  }

  if (q("#level")) {
    q(
      "#level"
    ).textContent =
      user.level || 1;
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

  if (
    q(
      "#free-spins"
    )
  ) {
    q(
      "#free-spins"
    ).textContent =
      freeSpins;
  }

  if (
    q(
      "#reward-balance"
    )
  ) {
    q(
      "#reward-balance"
    ).textContent =
      `${rp.toLocaleString(
        "pl-PL"
      )} RP`;
  }

  const spinProgress =
    Number(
      user.spinProgress ||
      0
    );

  const spinTarget =
    Number(
      user.spinTarget ||
      SPIN_TARGET
    );

  const spinPercent =
    Math.min(
      100,
      Math.round(
        (
          spinProgress /
          spinTarget
        ) * 100
      )
    );

  if (q("#p")) {
    q("#p").value =
      spinPercent;
  }

  if (
    q(
      "#spin-progress"
    )
  ) {
    q(
      "#spin-progress"
    ).textContent =
      `${spinProgress}/${spinTarget}`;
  }

  const boostText = [];

  if (
    user.x2Active
  ) {
    boostText.push(
      "x2"
    );
  }

  if (
    user.vipActive
  ) {
    boostText.push(
      "VIP"
    );
  }

  if (q("#boost")) {
    q(
      "#boost"
    ).textContent =
      boostText.length
        ? boostText.join(
            " + "
          )
        : "—";
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
      q(
        "#s"
      ).textContent =
        `🎁 LUCKY SPIN — BONUS x${freeSpins}`;
    } else if (
      spinProgress >=
      spinTarget
    ) {
      q(
        "#s"
      ).textContent =
        "🎰 LUCKY SPIN — GOTOWY!";
    } else {
      q(
        "#s"
      ).textContent =
        `🎰 LUCKY SPIN ${spinProgress}/${spinTarget}`;
    }
  }

  renderStorySummary(
    user
  );
}

function animateTap() {
  const cells =
    qa("#r i");

  if (
    !cells.length
  ) {
    return;
  }

  const amount =
    2 +
    Math.floor(
      Math.random() *
      3
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

async function loadUser() {
  try {
    const user =
      await api(
        "/api/me"
      );

    renderUser(
      user
    );

    if (q("#m")) {
      q(
        "#m"
      ).textContent =
        user.freeSpins > 0
          ? `🎁 Masz ${user.freeSpins} bonusowych spinów`
          : "Tapnij i naładuj Lucky Spin!";
    }
  } catch (error) {
    console.error(
      error
    );

    if (q("#m")) {
      q(
        "#m"
      ).textContent =
        "❌ Nie udało się zalogować";
    }

    if (q("#t")) {
      q(
        "#t"
      ).disabled =
        true;
    }

    if (q("#s")) {
      q(
        "#s"
      ).disabled =
        true;
    }
  }
}

async function loadStory() {
  try {
    storyData =
      await api(
        "/api/story"
      );

    const current =
      storyData.current;

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
        "#story-detail-subtitle"
      )
    ) {
      q(
        "#story-detail-subtitle"
      ).textContent =
        current.subtitle;
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

    const list =
      q(
        "#story-chapters"
      );

    if (list) {
      list.innerHTML =
        storyData.chapters
          .map(
            (
              chapter
            ) => `
              <div class="list-card story-card ${
                chapter.unlocked
                  ? "unlocked"
                  : "locked"
              }">
                <div>
                  <strong>
                    ${chapter.icon}
                    Rozdział ${chapter.chapter}
                    — ${escapeHtml(
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
                        : `🔒 Wymagany Level ${chapter.minLevel}`
                    }
                  </small>
                </div>
              </div>
            `
          )
          .join("");
    }
  } catch (error) {
    console.error(
      "Story:",
      error
    );
  }
}

async function tap() {
  if (spinning) {
    return;
  }

  animateTap();

  if (
    navigator.vibrate
  ) {
    navigator.vibrate(
      18
    );
  }

  try {
    const user =
      await api(
        "/api/tap",
        {
          method:
            "POST"
        }
      );

    renderUser(
      user
    );

    if (!q("#m")) {
      return;
    }

    if (
      user.energy <= 0
    ) {
      q(
        "#m"
      ).textContent =
        "⚡ Brak energii — poczekaj na regenerację.";
    } else if (
      user.freeSpins > 0
    ) {
      q(
        "#m"
      ).textContent =
        `🎁 Bonusowe spiny: ${user.freeSpins}`;
    } else if (
      user.spinProgress >=
      (
        user.spinTarget ||
        SPIN_TARGET
      )
    ) {
      q(
        "#m"
      ).textContent =
        "🔥 Lucky Spin gotowy!";
    } else {
      q(
        "#m"
      ).textContent =
        `Jeszcze ${
          (
            user.spinTarget ||
            SPIN_TARGET
          ) -
          user.spinProgress
        } tapów do spinu`;
    }
  } catch (error) {
    if (q("#m")) {
      q(
        "#m"
      ).textContent =
        `❌ ${error.message}`;
    }
  }
}

async function spin() {
  if (
    spinning ||
    !state
  ) {
    return;
  }

  const spinTarget =
    Number(
      state.spinTarget ||
      SPIN_TARGET
    );

  const canSpin =
    state.freeSpins > 0 ||
    state.spinProgress >=
      spinTarget;

  if (!canSpin) {
    return;
  }

  spinning = true;

  if (q("#t")) {
    q(
      "#t"
    ).disabled =
      true;
  }

  if (q("#s")) {
    q(
      "#s"
    ).disabled =
      true;
  }

  if (q("#m")) {
    q(
      "#m"
    ).textContent =
      "🎰 Kręcimy...";
  }

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
          method:
            "POST"
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

    drawReels(
      result.reels
    );

    renderUser(
      result
    );

    if (q("#m")) {
      q(
        "#m"
      ).textContent =
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
  } catch (error) {
    clearInterval(
      animation
    );

    if (q("#m")) {
      q(
        "#m"
      ).textContent =
        `❌ ${error.message}`;
    }
  } finally {
    spinning = false;

    if (q("#t")) {
      q(
        "#t"
      ).disabled =
        false;
    }

    if (state) {
      renderUser(
        state
      );
    }
  }
}

async function claimDaily() {
  try {
    const result =
      await api(
        "/api/daily/claim",
        {
          method:
            "POST"
        }
      );

    renderUser(
      result.user
    );

    alert(
      `🎁 Daily Bonus\n\n+${result.reward.coins} Coins\n+${result.reward.rewardPoints} RP\n+${result.reward.energy || 0} Energii\nStreak: ${result.reward.streak}`
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
          method:
            "POST"
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
          method:
            "POST"
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
      async (
        status
      ) => {
        if (
          status ===
          "paid"
        ) {
          if (q("#m")) {
            q(
              "#m"
            ).textContent =
              "⭐ Płatność przyjęta...";
          }

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
async function loadMissions() {
  try {
    const missions =
      await api(
        "/api/missions"
      );

    const box =
      q(
        "#missions-list"
      );

    if (!box) {
      return;
    }

    box.innerHTML =
      missions
        .map(
          (mission) => {
            const progress =
              Number(
                mission.progress ||
                0
              );

            const target =
              Number(
                mission.target ||
                0
              );

            const percent =
              target > 0
                ? Math.min(
                    100,
                    Math.round(
                      (
                        progress /
                        target
                      ) * 100
                    )
                  )
                : 0;

            let difficultyText =
              "Łatwa";

            if (
              mission.difficulty ===
              "normal"
            ) {
              difficultyText =
                "Średnia";
            }

            if (
              mission.difficulty ===
              "hard"
            ) {
              difficultyText =
                "Trudna";
            }

            if (
              mission.difficulty ===
              "epic"
            ) {
              difficultyText =
                "Epicka";
            }

            if (
              mission.difficulty ===
              "legendary"
            ) {
              difficultyText =
                "Legendarna";
            }

            return `
              <div class="list-card mission-card">

                <div class="mission-content">

                  <div class="mission-header">
                    <strong>
                      ${escapeHtml(
                        mission.title
                      )}
                    </strong>

                    <span class="mission-difficulty">
                      ${difficultyText}
                    </span>
                  </div>

                  <p>
                    ${escapeHtml(
                      mission.description ||
                      ""
                    )}
                  </p>

                  <div class="mission-progress-row">
                    <span>
                      Postęp
                    </span>

                    <strong>
                      ${progress.toLocaleString(
                        "pl-PL"
                      )}
                      /
                      ${target.toLocaleString(
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
                      mission.reward
                        ?.coins || 0
                    ).toLocaleString(
                      "pl-PL"
                    )} Coins
                    ·
                    🎁 +${Number(
                      mission.reward
                        ?.rewardPoints || 0
                    ).toLocaleString(
                      "pl-PL"
                    )} RP
                    ·
                    ⭐ +${Number(
                      mission.reward
                        ?.xp || 0
                    ).toLocaleString(
                      "pl-PL"
                    )} XP
                  </small>

                </div>

                <button
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

              </div>
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
            const missionKey =
              button.dataset
                .mission;

            if (
              !missionKey
            ) {
              return;
            }

            button.disabled =
              true;

            try {
              const result =
                await api(
                  `/api/missions/${missionKey}/claim`,
                  {
                    method:
                      "POST"
                  }
                );

              renderUser(
                result.user
              );

              alert(
                `🎯 Misja ukończona!\n\n${result.mission?.title || "Nagroda odebrana"}\n\n+${result.reward?.coins || 0} Coins\n+${result.reward?.rewardPoints || 0} RP\n+${result.reward?.xp || 0} XP`
              );

              await loadMissions();
            } catch (error) {
              alert(
                error.message
              );

              button.disabled =
                false;
            }
          };
      }
    );
  } catch (error) {
    console.error(
      "Missions:",
      error
    );

    const box =
      q(
        "#missions-list"
      );

    if (box) {
      box.innerHTML =
        `
        <div class="list-card">
          <small>
            ❌ Nie udało się pobrać misji.
          </small>
        </div>
        `;
    }
  }
}

async function loadLeaderboard() {
  try {
    const list =
      await api(
        "/api/leaderboard"
      );

    const box =
      q(
        "#leaderboard"
      );

    if (!box) {
      return;
    }

    if (
      !Array.isArray(
        list
      ) ||
      !list.length
    ) {
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
            const rank =
              Number(
                player.rank ||
                0
              );

            let medal =
              `#${rank}`;

            if (
              rank === 1
            ) {
              medal =
                "🥇";
            }

            if (
              rank === 2
            ) {
              medal =
                "🥈";
            }

            if (
              rank === 3
            ) {
              medal =
                "🥉";
            }

            return `
              <div class="list-card leaderboard-row">

                <strong class="leaderboard-rank">
                  ${medal}
                </strong>

                <span class="leaderboard-name">
                  ${escapeHtml(
                    player.name ||
                    "Gracz"
                  )}
                </span>

                <b class="leaderboard-score">
                  ${Number(
                    player.weeklyCoins ||
                    0
                  ).toLocaleString(
                    "pl-PL"
                  )}
                  🪙
                </b>

              </div>
            `;
          }
        )
        .join("");
  } catch (error) {
    console.error(
      "Leaderboard:",
      error
    );

    const box =
      q(
        "#leaderboard"
      );

    if (box) {
      box.innerHTML =
        `
        <div class="list-card">
          <small>
            ❌ Nie udało się pobrać rankingu.
          </small>
        </div>
        `;
    }
  }
}

async function loadReferrals() {
  try {
    referralData =
      await api(
        "/api/referrals"
      );

    const referralCode =
      referralData
        .referralCode ||
      "—";

    const referrals =
      Number(
        referralData
          .referrals || 0
      );

    const myCoins =
      Number(
        referralData
          .rewards
          ?.referrerCoins ||
        0
      );

    const myRp =
      Number(
        referralData
          .rewards
          ?.referrerRP ||
        0
      );

    const friendCoins =
      Number(
        referralData
          .rewards
          ?.invitedCoins ||
        0
      );

    if (
      q(
        "#ref-code"
      )
    ) {
      q(
        "#ref-code"
      ).textContent =
        referralCode;
    }

    if (
      q(
        "#ref-count"
      )
    ) {
      q(
        "#ref-count"
      ).textContent =
        `Poleceni: ${referrals.toLocaleString(
          "pl-PL"
        )}`;
    }

    if (
      q(
        "#ref-my-reward"
      )
    ) {
      q(
        "#ref-my-reward"
      ).textContent =
        `🪙 ${myCoins.toLocaleString(
          "pl-PL"
        )} Coins + 🎁 ${myRp.toLocaleString(
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
        `🪙 ${friendCoins.toLocaleString(
          "pl-PL"
        )} Coins`;
    }

    const totalCoins =
      referrals *
      myCoins;

    const totalRp =
      referrals *
      myRp;

    if (
      q(
        "#ref-total-earned"
      )
    ) {
      q(
        "#ref-total-earned"
      ).textContent =
        `${totalCoins.toLocaleString(
          "pl-PL"
        )} Coins + ${totalRp.toLocaleString(
          "pl-PL"
        )} RP`;
    }
  } catch (error) {
    console.error(
      "Referrals:",
      error
    );

    referralData =
      null;

    if (
      q(
        "#ref-code"
      )
    ) {
      q(
        "#ref-code"
      ).textContent =
        "Błąd";
    }
  }
}

function getReferralLink() {
  if (
    !referralData ||
    !referralData
      .startParam
  ) {
    return null;
  }

  const botUsername =
    "ACABBACA_bot";

  return (
    `https://t.me/${botUsername}` +
    `?startapp=${encodeURIComponent(
      referralData.startParam
    )}`
  );
}

async function copyReferralLink() {
  if (!referralData) {
    await loadReferrals();
  }

  const link =
    getReferralLink();

  if (!link) {
    alert(
      "Nie udało się pobrać linku polecającego."
    );

    return;
  }

  try {
    await navigator
      .clipboard
      .writeText(
        link
      );

    alert(
      `✅ Link skopiowany!\n\n${link}`
    );
  } catch (error) {
    alert(
      `Twój link polecający:\n\n${link}`
    );
  }
}

async function shareReferral() {
  if (!referralData) {
    await loadReferrals();
  }

  const link =
    getReferralLink();

  if (!link) {
    alert(
      "Nie udało się pobrać linku polecającego."
    );

    return;
  }

  const text =
    `🎰 Lucky Tap Slots\n\n` +
    `Zagraj ze mną w Lucky City i odbierz bonus startowy!\n\n` +
    `${link}`;

  try {
    if (
      navigator.share
    ) {
      await navigator.share({
        title:
          "Lucky Tap Slots",

        text
      });

      return;
    }

    if (
      tg?.openTelegramLink
    ) {
      tg.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(
          link
        )}&text=${encodeURIComponent(
          "🎰 Zagraj ze mną w Lucky Tap Slots i odbierz bonus!"
        )}`
      );

      return;
    }

    await navigator
      .clipboard
      .writeText(
        link
      );

    alert(
      `✅ Link skopiowany!\n\n${link}`
    );
  } catch (error) {
    /*
     * Gdy użytkownik zamknie systemowe
     * okno udostępniania, nie traktujemy
     * tego jako poważnego błędu.
     */
    if (
      error?.name ===
      "AbortError"
    ) {
      return;
    }

    alert(
      `Twój link polecający:\n\n${link}`
    );
  }
}
async function loadRewardHistory() {
  try {
    const history =
      await api(
        "/api/rewards/history"
      );

    const box =
      q(
        "#reward-history"
      );

    if (!box) {
      return;
    }

    if (
      !Array.isArray(
        history
      ) ||
      !history.length
    ) {
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

            let extra =
              "";

            if (
              item.adminNote
            ) {
              extra += `
                <p class="reward-note">
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
                      item.label ||
                      "Nagroda"
                    )}
                  </strong>

                  <p class="reward-status ${statusClass}">
                    ${statusText}
                  </p>

                  <small>
                    ${Number(
                      item.cost ||
                      0
                    ).toLocaleString(
                      "pl-PL"
                    )} RP
                  </small>

                  ${extra}

                </div>

              </div>
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
              button.dataset
                .code;

            if (!code) {
              return;
            }

            try {
              await navigator
                .clipboard
                .writeText(
                  code
                );

              const oldText =
                button.textContent;

              button.textContent =
                "✅ SKOPIOWANO";

              setTimeout(
                () => {
                  button.textContent =
                    oldText;
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

    const box =
      q(
        "#reward-history"
      );

    if (box) {
      box.innerHTML =
        `
        <div class="list-card">
          <small>
            ❌ Nie udało się pobrać historii nagród.
          </small>
        </div>
        `;
    }
  }
}

async function loadRewards() {
  try {
    const data =
      await api(
        "/api/rewards"
      );

    const balance =
      Number(
        data.balance ||
        0
      );

    if (
      q(
        "#reward-balance"
      )
    ) {
      q(
        "#reward-balance"
      ).textContent =
        `${balance.toLocaleString(
          "pl-PL"
        )} RP`;
    }

    const box =
      q(
        "#rewards-list"
      );

    if (!box) {
      return;
    }

    box.innerHTML =
      data.rewards
        .map(
          (reward) => {
            const available =
              !!reward.available;

            return `
              <div class="list-card reward-card">

                <div>

                  <strong>
                    🎁 ${escapeHtml(
                      reward.label
                    )}
                  </strong>

                  <p>
                    ${Number(
                      reward.cost ||
                      0
                    ).toLocaleString(
                      "pl-PL"
                    )} RP
                  </p>

                  <small>
                    Wymagany Level
                    ${Number(
                      reward.minLevel ||
                      1
                    )}
                  </small>

                </div>

                <button
                  class="reward-redeem"
                  data-reward="${escapeHtml(
                    reward.key
                  )}"
                  ${
                    available
                      ? ""
                      : "disabled"
                  }
                >
                  ${
                    available
                      ? "🎁 ODBIERZ"
                      : "🔒 ZABLOKOWANE"
                  }
                </button>

              </div>
            `;
          }
        )
        .join("");

    qa(
      ".reward-redeem"
    ).forEach(
      (button) => {
        button.onclick =
          async () => {
            const rewardKey =
              button.dataset
                .reward;

            if (
              !rewardKey
            ) {
              return;
            }

            const confirmed =
              confirm(
                "Wysłać zgłoszenie nagrody?"
              );

            if (
              !confirmed
            ) {
              return;
            }

            button.disabled =
              true;

            try {
              const result =
                await api(
                  `/api/rewards/${rewardKey}/redeem`,
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

              button.disabled =
                false;
            }
          };
      }
    );
  } catch (error) {
    console.error(
      "Rewards:",
      error
    );

    const box =
      q(
        "#rewards-list"
      );

    if (box) {
      box.innerHTML =
        `
        <div class="list-card">
          <small>
            ❌ Nie udało się pobrać nagród.
          </small>
        </div>
        `;
    }
  }
}

function showPage(name) {
  qa(
    ".page"
  ).forEach(
    (page) => {
      page.classList.remove(
        "active"
      );
    }
  );

  qa(
    ".nav-btn"
  ).forEach(
    (button) => {
      button.classList.remove(
        "active"
      );
    }
  );

  const page =
    q(
      `#page-${name}`
    );

  if (page) {
    page.classList.add(
      "active"
    );
  }

  const navButton =
    q(
      `.nav-btn[data-page="${name}"]`
    );

  if (navButton) {
    navButton.classList.add(
      "active"
    );
  }

  if (
    name ===
    "missions"
  ) {
    loadMissions();
  }

  if (
    name ===
    "ranking"
  ) {
    loadLeaderboard();
    loadReferrals();
  }

  if (
    name ===
    "rewards"
  ) {
    loadRewards();
    loadRewardHistory();
  }

  if (
    name ===
    "story"
  ) {
    loadStory();
  }

  window.scrollTo({
    top: 0,
    behavior:
      "smooth"
  });
}

function bindEvents() {
  const tapButton =
    q("#t");

  if (tapButton) {
    tapButton.onclick =
      tap;
  }

  const spinButton =
    q("#s");

  if (spinButton) {
    spinButton.onclick =
      spin;
  }

  const dailyButton =
    q("#daily");

  if (dailyButton) {
    dailyButton.onclick =
      claimDaily;
  }

  const shareButton =
    q("#share-ref");

  if (shareButton) {
    shareButton.onclick =
      shareReferral;
  }

  const copyRefButton =
    q("#copy-ref");

  if (copyRefButton) {
    copyRefButton.onclick =
      copyReferralLink;
  }

  qa(
    ".coin-buy"
  ).forEach(
    (button) => {
      button.onclick =
        () => {
          buyCoinProduct(
            button.dataset
              .product
          );
        };
    }
  );

  qa(
    ".star-buy"
  ).forEach(
    (button) => {
      button.onclick =
        () => {
          buyStarProduct(
            button.dataset
              .starProduct
          );
        };
    }
  );

  qa(
    ".nav-btn"
  ).forEach(
    (button) => {
      button.onclick =
        () => {
          showPage(
            button.dataset
              .page
          );
        };
    }
  );
}

function startEnergyRefresh() {
  setInterval(
    async () => {
      if (
        !state ||
        spinning
      ) {
        return;
      }

      try {
        const user =
          await api(
            "/api/me"
          );

        renderUser(
          user
        );
      } catch (error) {
        console.error(
          "Energy refresh:",
          error
        );
      }
    },
    15000
  );
}

async function startApp() {
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

  bindEvents();

  await loadUser();

  /*
   * Ładujemy od razu fabułę,
   * żeby dane były gotowe,
   * gdy później dodamy zakładkę
   * Lucky City do HTML.
   */
  await loadStory();

  startEnergyRefresh();
}

startApp();
