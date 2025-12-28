import { QuizGame } from "./quizShared.js";

const VOWEL_DATA_URL = "./src/data/vowels.json";

const VIEWBOX_WIDTH = 140;
const VIEWBOX_HEIGHT = 100;

const TRAPEZOID = {
  topLeft: { x: 10, y: 10 },
  topRight: { x: 130, y: 10 },
  bottomRight: { x: 130, y: 90 },
  bottomLeft: { x: 40, y: 90 }
};

const TOP_MIDPOINT = midpoint(TRAPEZOID.topLeft, TRAPEZOID.topRight);
const BOTTOM_MIDPOINT = midpoint(TRAPEZOID.bottomLeft, TRAPEZOID.bottomRight);

const MAX_HEIGHT_LEVEL = 3;

function getLayoutSpacing() {
  const isMobile =
    typeof window !== "undefined" &&
    window.matchMedia?.("(max-width: 768px)")?.matches;

  return {
    pairedOffset: isMobile ? 6 : 5,
    minPairGap: isMobile ? 5 : 4
  };
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function pointOnLine(start, end, t) {
  return {
    x: lerp(start.x, end.x, t),
    y: lerp(start.y, end.y, t)
  };
}

function parseHeightValue(height) {
  if (typeof height === "number" && Number.isFinite(height)) {
    return height;
  }

  const parsed = parseFloat(height ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

function getRowContext(heightValue) {
  const clampedHeight = clamp(heightValue, 0, MAX_HEIGHT_LEVEL);
  const ratio = clampedHeight / MAX_HEIGHT_LEVEL;

  const leftEdgePoint = pointOnLine(TRAPEZOID.topLeft, TRAPEZOID.bottomLeft, ratio);
  const rightEdgePoint = pointOnLine(TRAPEZOID.topRight, TRAPEZOID.bottomRight, ratio);
  const centerPoint = pointOnLine(TOP_MIDPOINT, BOTTOM_MIDPOINT, ratio);

  return {
    height: clampedHeight,
    ratio,
    leftEdgePoint,
    rightEdgePoint,
    centerPoint,
    leftMidPoint: midpoint(leftEdgePoint, centerPoint),
    rightMidPoint: midpoint(centerPoint, rightEdgePoint)
  };
}

function getAnchorForBackness(rowContext, backness) {
  switch (backness) {
    case "front":
      return rowContext.leftEdgePoint;
    case "near-front":
      return rowContext.leftMidPoint;
    case "central":
      return rowContext.centerPoint;
    case "near-back":
      return rowContext.rightMidPoint;
    case "back":
      return rowContext.rightEdgePoint;
    default:
      console.warn(`Unknown backness "${backness}"`);
      return rowContext.centerPoint;
  }
}

function clampToRow(x, rowContext) {
  return clamp(x, rowContext.leftEdgePoint.x, rowContext.rightEdgePoint.x);
}

function computePairPositions(anchorX, rowContext, spacing = getLayoutSpacing()) {
  const pairedOffset = spacing?.pairedOffset ?? 5;
  const minPairGap = spacing?.minPairGap ?? 4;
  const leftBound = rowContext.leftEdgePoint.x;
  const rightBound = rowContext.rightEdgePoint.x;
  const desiredGap = pairedOffset * 2;

  const leftSpace = Math.max(anchorX - leftBound, 0);
  const rightSpace = Math.max(rightBound - anchorX, 0);

  let unroundedX;
  let roundedX;

  if (leftSpace >= pairedOffset && rightSpace >= pairedOffset) {
    unroundedX = anchorX - pairedOffset;
    roundedX = anchorX + pairedOffset;
  } else {
    const totalSpace = leftSpace + rightSpace;
    if (totalSpace <= 0) {
      return { unrounded: anchorX, rounded: anchorX };
    }

    const gap = Math.min(desiredGap, totalSpace);
    const leftShare = totalSpace === 0 ? 0 : leftSpace / totalSpace;
    const rightShare = totalSpace === 0 ? 0 : rightSpace / totalSpace;

    unroundedX = anchorX - gap * leftShare;
    roundedX = anchorX + gap * rightShare;
  }

  unroundedX = clamp(unroundedX, leftBound, anchorX);
  roundedX = clamp(roundedX, anchorX, rightBound);

  if (roundedX - unroundedX < minPairGap) {
    const mid = anchorX;
    const halfGap = minPairGap / 2;
    const candidateLeft = clamp(mid - halfGap, leftBound, mid);
    const candidateRight = clamp(mid + halfGap, mid, rightBound);

    if (candidateRight - candidateLeft >= minPairGap) {
      unroundedX = candidateLeft;
      roundedX = candidateRight;
    }
  }

  return { unrounded: unroundedX, rounded: roundedX };
}

function computeVowelLayout(data, spacing = getLayoutSpacing()) {
  const groups = new Map();

  data.forEach((item) => {
    const backnessKey = item.backness;
    const heightValue = parseHeightValue(item.height);
    if (!Number.isFinite(heightValue)) {
      console.warn(`Invalid height for`, item);
      return;
    }

    const rowContext = getRowContext(heightValue);
    const anchorPoint = getAnchorForBackness(rowContext, backnessKey);

    if (!anchorPoint) {
      console.warn(`Failed to resolve anchor for`, item);
      return;
    }

    const groupKey = `${rowContext.height}|${backnessKey}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, { anchorPoint, rowContext, items: [] });
    }
    groups.get(groupKey).items.push(item);
  });

  const cells = [];

  groups.forEach(({ anchorPoint, rowContext, items }, key) => {
    const placements = [];
    const used = new Set();

    const unroundedItem = items.find((item) => item.rounded === false);
    const roundedItem = items.find((item) => item.rounded === true);

    if (unroundedItem && roundedItem) {
      const pairPositions = computePairPositions(anchorPoint.x, rowContext, spacing);
      placements.push({ item: unroundedItem, x: pairPositions.unrounded, y: anchorPoint.y });
      placements.push({ item: roundedItem, x: pairPositions.rounded, y: anchorPoint.y });
      used.add(unroundedItem.soundId);
      used.add(roundedItem.soundId);
    }

    const remaining = items.filter((item) => !used.has(item.soundId));
    if (remaining.length > 0) {
      const spread = remaining.length > 1 ? 5 : 0;
      const baseX = anchorPoint.x;
      const baseY = anchorPoint.y;
      const start = -(remaining.length - 1) / 2;

      remaining.forEach((item, index) => {
        const offset = spread * (start + index);
        const x = clampToRow(baseX + offset, rowContext);
        placements.push({ item, x, y: baseY });
      });
    }

    const anchorPosition = mapToChartCoordinates(anchorPoint.x, anchorPoint.y);
    const cellItems = placements.map(({ item, x, y }) => {
      const position = mapToChartCoordinates(x, y);
      return {
        data: item,
        position,
        offset: {
          x: position.left - anchorPosition.left,
          y: position.top - anchorPosition.top
        }
      };
    });

    cells.push({
      key,
      anchor: anchorPosition,
      items: cellItems
    });
  });

  return cells;
}

function mapToChartCoordinates(x, y) {
  const clampedX = clamp(x ?? 0, 0, VIEWBOX_WIDTH);
  const clampedY = clamp(y ?? 0, 0, VIEWBOX_HEIGHT);

  return {
    left: (clampedX / VIEWBOX_WIDTH) * 100,
    top: (clampedY / VIEWBOX_HEIGHT) * 100
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
    clickableSelector: ".clickable",
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
      const cellsLayer =
        chart.querySelector("#vowelCells") ||
        chart.appendChild(Object.assign(document.createElement("div"), {
          className: "vowel-chart__cells ipa-vowel-grid",
          id: "vowelCells"
        }));

      const positionedCells = computeVowelLayout(data);
      cellsLayer.innerHTML = "";
      vowelPool = [];
      Object.keys(soundMap).forEach((key) => delete soundMap[key]);

      positionedCells.forEach((cell) => {
        if (!cell || !cell.items || cell.items.length === 0) return;

        const wrapper = document.createElement("div");
        wrapper.className = "vowel-cell";
        wrapper.style.setProperty("--left", `${cell.anchor.left}%`);
        wrapper.style.setProperty("--top", `${cell.anchor.top}%`);
        if (cell.items.length > 1) {
          wrapper.dataset.hasPair = "true";
        }

        cell.items.forEach(({ data: itemData, offset }) => {
          if (!itemData || !itemData.soundId) return;
          vowelPool.push(itemData.soundId);
          soundMap[itemData.soundId] = itemData.ipa;

          const button = document.createElement("button");
          button.type = "button";
          button.className = "vowel-button clickable";
          button.dataset.sound = itemData.soundId;
          button.dataset.ipa = itemData.ipa;
          button.dataset.name = itemData.name || "";
          if (typeof itemData.rounded === "boolean") {
            button.dataset.rounded = itemData.rounded ? "true" : "false";
          }
          button.style.setProperty("--offset-x", `${offset.x}%`);
          button.style.setProperty("--offset-y", `${offset.y}%`);
          const labelDetail = itemData.name ? `（${itemData.name}）` : "";
          button.setAttribute("aria-label", `${itemData.ipa}${labelDetail}`);
          button.textContent = itemData.ipa;

          wrapper.appendChild(button);
        });

        cellsLayer.appendChild(wrapper);
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
