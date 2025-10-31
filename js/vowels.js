import { QuizGame } from "./quizShared.js";

const VOWEL_DATA_URL = "./src/data/vowels.json";

const VIEWBOX_WIDTH = 140;
const VIEWBOX_HEIGHT = 100;

const CHART_LAYOUT = {
  top: 10,
  bottom: 90,
  leftTop: 10,
  leftBottom: 40,
  rightTop: 130,
  rightBottom: 130
};

const BACKNESS_POSITIONS = {
  front: 0,
  "near-front": 0.25,
  central: 0.5,
  "near-back": 0.75,
  back: 1
};

const MAX_HEIGHT_LEVEL = 3;
const HEIGHT_ANCHORS = [0, 1 / 3, 2 / 3, 1];
const PAIRED_OFFSET = 0.055;

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function normalizeHeight(height) {
  const numeric = typeof height === "number" ? height : parseFloat(height ?? "0");
  const clampedIndex = clamp(numeric, 0, MAX_HEIGHT_LEVEL);
  const lowerIndex = Math.floor(clampedIndex);
  const upperIndex = Math.ceil(clampedIndex);

  if (lowerIndex === upperIndex) {
    return HEIGHT_ANCHORS[lowerIndex];
  }

  const lowerAnchor = HEIGHT_ANCHORS[lowerIndex];
  const upperAnchor = HEIGHT_ANCHORS[upperIndex];
  const ratio = clampedIndex - lowerIndex;
  return lowerAnchor + (upperAnchor - lowerAnchor) * ratio;
}

function computeVowelLayout(data) {
  const groups = new Map();
  const order = new Map();

  data.forEach((item, index) => {
    order.set(item.soundId, index);

    const backnessKey = item.backness;
    const baseX = BACKNESS_POSITIONS[backnessKey];
    const heightIndex =
      typeof item.height === "number" ? item.height : parseFloat(item.height ?? "0");
    const normalizedHeight = normalizeHeight(heightIndex);

    if (typeof baseX !== "number") {
      console.warn(`Unknown backness "${backnessKey}" for`, item);
      return;
    }

    if (!Number.isFinite(heightIndex)) {
      console.warn(`Invalid height for`, item);
      return;
    }

    const groupKey = `${heightIndex}|${backnessKey}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, { baseX, normalizedHeight, items: [] });
    }
    groups.get(groupKey).items.push({ item, normalizedHeight });
  });

  const positioned = [];

  groups.forEach(({ baseX, items }) => {
    const sortedItems = [...items].sort((a, b) => {
      if (a.item.rounded === b.item.rounded) return 0;
      return a.item.rounded ? 1 : -1;
    });

    const offsets = [];
    if (sortedItems.length === 1) {
      offsets.push(0);
    } else if (sortedItems.length === 2) {
      const hasRounded = sortedItems.some(({ item }) => item.rounded === true);
      const hasUnrounded = sortedItems.some(({ item }) => item.rounded === false);
      if (hasRounded && hasUnrounded) {
        sortedItems.forEach(({ item }) => {
          offsets.push(item.rounded ? PAIRED_OFFSET : -PAIRED_OFFSET);
        });
      } else {
        const spread = 0.05;
        sortedItems.forEach((_, index) => {
          offsets.push((index - (sortedItems.length - 1) / 2) * spread);
        });
      }
    } else {
      const spread = 0.05;
      sortedItems.forEach((_, index) => {
        offsets.push((index - (sortedItems.length - 1) / 2) * spread);
      });
    }

    sortedItems.forEach(({ item, normalizedHeight }, index) => {
      const x = clamp(baseX + offsets[index], 0, 1);
      positioned.push({ ...item, x, y: normalizedHeight });
    });
  });

  positioned.sort((a, b) => {
    const orderA = order.get(a.soundId) ?? 0;
    const orderB = order.get(b.soundId) ?? 0;
    return orderA - orderB;
  });

  return positioned;
}

function mapToChartCoordinates(x, y) {
  const clampedX = Math.min(Math.max(x ?? 0, 0), 1);
  const clampedY = Math.min(Math.max(y ?? 0, 0), 1);

  const verticalSpan = CHART_LAYOUT.bottom - CHART_LAYOUT.top;
  const absoluteTop = CHART_LAYOUT.top + clampedY * verticalSpan;

  const leftEdge =
    CHART_LAYOUT.leftTop + (CHART_LAYOUT.leftBottom - CHART_LAYOUT.leftTop) * clampedY;
  const rightEdge =
    CHART_LAYOUT.rightTop + (CHART_LAYOUT.rightBottom - CHART_LAYOUT.rightTop) * clampedY;
  const horizontalSpan = rightEdge - leftEdge;
  const absoluteLeft = leftEdge + clampedX * horizontalSpan;

  return {
    left: (absoluteLeft / VIEWBOX_WIDTH) * 100,
    top: (absoluteTop / VIEWBOX_HEIGHT) * 100
  };
}

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
      const positionedItems = computeVowelLayout(data);
      chart.querySelectorAll(".vowel-cell").forEach((cell) => cell.remove());
      vowelPool = [];
      Object.keys(soundMap).forEach((key) => delete soundMap[key]);

      positionedItems.forEach((item) => {
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
        const { left, top } = mapToChartCoordinates(item.x, item.y);
        button.style.setProperty("--left", `${left}%`);
        button.style.setProperty("--top", `${top}%`);
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
