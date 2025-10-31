import { QuizGame } from "./quizShared.js";

const VOWEL_DATA_URL = "./src/data/vowels.json";

document.addEventListener("DOMContentLoaded", async () => {
  const audioPlayer = document.getElementById("audioPlayer");
  const message = document.getElementById("message");
  const volumeSlider = document.getElementById("volumeSlider");
  const chart = document.getElementById("vowelChart");

  const quiz = new QuizGame({
    audioPlayer,
    messageElement: message,
    clickableSelector: ".vowel-cell",
    historyTableSelector: "#historyTable",
    storageKey: "vowels",
    messages: {
      needQuestion: "🎧 まずはランダム再生で問題を開始してください。",
      correct: (symbol, name) =>
        name ? `✅ 正解！（${symbol}：${name}）` : `✅ 正解！（${symbol}）`,
      incorrect: (symbol, name) =>
        name
          ? `❌ 不正解。正解は ${symbol}（${name}）です。`
          : `❌ 不正解。正解は ${symbol} です。`
    }
  });

  const savedVolume = localStorage.getItem("ipaVolume");
  if (savedVolume !== null) {
    audioPlayer.volume = parseFloat(savedVolume);
    volumeSlider.value = savedVolume;
  }

  volumeSlider.addEventListener("input", () => {
    audioPlayer.volume = volumeSlider.value;
  });

  volumeSlider.addEventListener("change", () => {
    localStorage.setItem("ipaVolume", volumeSlider.value);
  });

  let vowelPool = [];
  const soundMap = {};

  async function populateChart() {
    if (!chart) return;

    try {
      const response = await fetch(VOWEL_DATA_URL, { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(`Failed to load vowel data: ${response.status}`);
      }

      const data = await response.json();
      chart.querySelectorAll(".vowel-cell").forEach((cell) => cell.remove());
      vowelPool = [];
      Object.keys(soundMap).forEach((key) => delete soundMap[key]);

      data.forEach((item) => {
        if (!item || !item.soundId) return;
        vowelPool.push(item.soundId);
        soundMap[item.soundId] = item.ipa;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "vowel-cell clickable";
        button.dataset.sound = item.soundId;
        button.dataset.ipa = item.ipa;
        button.dataset.name = item.name || "";
        if (typeof item.rounded === "boolean") {
          button.dataset.rounded = item.rounded ? "true" : "false";
        }
        button.style.setProperty("--x", `${item.x ?? 0}`);
        button.style.setProperty("--y", `${item.y ?? 0}`);
        const labelDetail = item.name ? `（${item.name}）` : "";
        button.setAttribute("aria-label", `${item.ipa}${labelDetail}`);
        button.textContent = item.ipa;

        chart.appendChild(button);
      });
    } catch (error) {
      console.error("母音データの読み込みに失敗しました", error);
      quiz.setMessage("⚠️ 母音データの読み込みに失敗しました。ページを再読み込みしてください。");
    }
  }

  await populateChart();

  quiz.setSoundToSymbol(soundMap);
  quiz.attachCellListeners();
  quiz.loadHistory();

  function playRandomSound() {
    if (vowelPool.length === 0) {
      quiz.setMessage("⚠️ 出題できる母音データがありません。");
      return;
    }

    quiz.startRandomQuestion(vowelPool);
    quiz.setMessage("再生しました。正しい母音記号をクリックしてください。");
  }

  function playWrongSound() {
    const soundId = quiz.playFromWrongHistory();
    if (!soundId) {
      quiz.setMessage("🎉 間違いはありません！すべて正解です。");
      return;
    }
    quiz.setMessage("❓ 間違った問題から再出題しました。正しい母音記号を選んでください。");
  }

  function replaySound() {
    if (quiz.replayCurrent()) {
      quiz.setMessage("🔁 もう一度再生しました");
    }
  }

  function clearHistory() {
    quiz.clearHistory();
    quiz.setMessage("🧹 履歴をクリアしました");
  }

  window.playRandomSound = playRandomSound;
  window.playWrongSound = playWrongSound;
  window.replaySound = replaySound;
  window.clearHistory = clearHistory;
});
