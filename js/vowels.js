import { QuizGame } from "./quizShared.js";

// =========================================================
//  1. 音声ファイル設定 (ipachart.com)
// =========================================================

// 画像に基づき、ipachart.com の MP3 フォルダを指定
const IPACHART_AUDIO_BASE = "https://www.ipachart.com/mp3/";

// ▼ IPA記号 と ipachart.com のファイル名（拡張子なし）の対応表
// ※Screenshotのファイル名規則（先頭大文字、アンダースコア区切り）に合わせています。
const VOWEL_FILE_MAP = {
  // --- 狭母音 (Close) ---
  "i": "Close_front_unrounded_vowel",
  "y": "Close_front_rounded_vowel",
  "ɨ": "Close_central_unrounded_vowel",
  "ʉ": "Close_central_rounded_vowel",
  "ɯ": "Close_back_unrounded_vowel",
  "u": "Close_back_rounded_vowel",

  // --- 広めの狭母音 (Near-close) ---
  "ɪ": "Near-close_near-front_unrounded_vowel",
  "ʏ": "Near-close_near-front_rounded_vowel",
  // "ɪ̈": "Near-close_central_unrounded_vowel", // データにある場合
  // "ʊ̈": "Near-close_central_rounded_vowel",   // データにある場合
  "ʊ": "Near-close_near-back_rounded_vowel",

  // --- 半狭母音 (Close-mid) ---
  "e": "Close-mid_front_unrounded_vowel",
  "ø": "Close-mid_front_rounded_vowel",
  "ɘ": "Close-mid_central_unrounded_vowel",
  "ɵ": "Close-mid_central_rounded_vowel",
  "ɤ": "Close-mid_back_unrounded_vowel",
  "o": "Close-mid_back_rounded_vowel",

  // --- 中央母音 (Mid) ---
  "ə": "Mid-central_vowel", // シュワー

  // --- 半広母音 (Open-mid) ---
  "ɛ": "Open-mid_front_unrounded_vowel",
  "œ": "Open-mid_front_rounded_vowel",
  "ɜ": "Open-mid_central_unrounded_vowel",
  "ɞ": "Open-mid_central_rounded_vowel",
  "ʌ": "Open-mid_back_unrounded_vowel",
  "ɔ": "Open-mid_back_rounded_vowel",

  // --- 狭めの広母音 (Near-open) ---
  "æ": "Near-open_front_unrounded_vowel",
  "ɐ": "Near-open_central_unrounded_vowel", 

  // --- 広母音 (Open) ---
  "a": "Open_front_unrounded_vowel",
  "ɶ": "Open_front_rounded_vowel", // 小型大文字OE
  // "ä": "Open_central_unrounded_vowel", // データにある場合
  "ɑ": "Open_back_unrounded_vowel",
  "ɒ": "Open_back_rounded_vowel",
};


// =========================================================
//  2. 子音データ（ユーザー定義・保存用）
// =========================================================
const NONPULMONIC_FILES = [
  "s176.mp3", "s177.mp3", "s180.mp3", "s179.mp3", "s178.mp3", // クリック音
  "s160.mp3", "s162.mp3", "s164.mp3", "s166.mp3", "s168.mp3", // 内破音
  "s101_401.mp3", "s103_401.mp3", "s109_401.mp3", "s132_401.mp3" // 放出音
];

const NONPULMONIC_JA = [
  "両唇音", "歯音", "（後部）歯茎音", "硬口蓋歯茎音", "歯茎側面音",
  "両唇音", "歯音／歯茎音", "硬口蓋音", "軟口蓋音", "口蓋垂音",
  "両唇音", "歯音／歯茎音", "軟口蓋音", "歯茎摩擦音"
];


// =========================================================
//  3. 母音図の描画設定・ロジック
// =========================================================

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
const PAIRED_OFFSET = 5;
const MIN_PAIR_GAP = 4;

// --- Helper Functions ---
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
    case "front": return rowContext.leftEdgePoint;
    case "near-front": return rowContext.leftMidPoint;
    case "central": return rowContext.centerPoint;
    case "near-back": return rowContext.rightMidPoint;
    case "back": return rowContext.rightEdgePoint;
    default:
      console.warn(`Unknown backness "${backness}"`);
      return rowContext.centerPoint;
  }
}

function clampToRow(x, rowContext) {
  return clamp(x, rowContext.leftEdgePoint.x, rowContext.rightEdgePoint.x);
}

function computePairPositions(anchorX, rowContext) {
  const leftBound = rowContext.leftEdgePoint.x;
  const rightBound = rowContext.rightEdgePoint.x;
  const desiredGap = PAIRED_OFFSET * 2;

  const leftSpace = Math.max(anchorX - leftBound, 0);
  const rightSpace = Math.max(rightBound - anchorX, 0);

  let unroundedX, roundedX;

  if (leftSpace >= PAIRED_OFFSET && rightSpace >= PAIRED_OFFSET) {
    unroundedX = anchorX - PAIRED_OFFSET;
    roundedX = anchorX + PAIRED_OFFSET;
  } else {
    const totalSpace = leftSpace + rightSpace;
    if (totalSpace <= 0) return { unrounded: anchorX, rounded: anchorX };

    const gap = Math.min(desiredGap, totalSpace);
    const leftShare = totalSpace === 0 ? 0 : leftSpace / totalSpace;
    const rightShare = totalSpace === 0 ? 0 : rightSpace / totalSpace;

    unroundedX = anchorX - gap * leftShare;
    roundedX = anchorX + gap * rightShare;
  }

  unroundedX = clamp(unroundedX, leftBound, anchorX);
  roundedX = clamp(roundedX, anchorX, rightBound);

  if (roundedX - unroundedX < MIN_PAIR_GAP) {
    const mid = anchorX;
    const halfGap = MIN_PAIR_GAP / 2;
    const candidateLeft = clamp(mid - halfGap, leftBound, mid);
    const candidateRight = clamp(mid + halfGap, mid, rightBound);
    if (candidateRight - candidateLeft >= MIN_PAIR_GAP) {
      unroundedX = candidateLeft;
      roundedX = candidateRight;
    }
  }

  return { unrounded: unroundedX, rounded: roundedX };
}

function computeVowelLayout(data) {
  const groups = new Map();

  data.forEach((item) => {
    const backnessKey = item.backness;
    const heightValue = parseHeightValue(item.height);
    if (!Number.isFinite(heightValue)) return;

    const rowContext = getRowContext(heightValue);
    const anchorPoint = getAnchorForBackness(rowContext, backnessKey);
    if (!anchorPoint) return;

    const groupKey = `${rowContext.height}|${backnessKey}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, { anchorPoint, rowContext, items: [] });
    }
    groups.get(groupKey).items.push({ item });
  });

  const positionedMap = new Map();

  groups.forEach(({ anchorPoint, rowContext, items }) => {
    const unroundedEntry = items.find(({ item }) => item.rounded === false);
    const roundedEntry = items.find(({ item }) => item.rounded === true);

    if (unroundedEntry && roundedEntry) {
      const pairPositions = computePairPositions(anchorPoint.x, rowContext);
      positionedMap.set(unroundedEntry.item.soundId, {
        ...unroundedEntry.item, x: pairPositions.unrounded, y: anchorPoint.y
      });
      positionedMap.set(roundedEntry.item.soundId, {
        ...roundedEntry.item, x: pairPositions.rounded, y: anchorPoint.y
      });
    }

    const remaining = items.filter(({ item }) => !positionedMap.has(item.soundId));
    if (remaining.length > 0) {
      const spread = remaining.length > 1 ? 5 : 0;
      const baseX = anchorPoint.x;
      const baseY = anchorPoint.y;
      const start = -(remaining.length - 1) / 2;

      remaining.forEach(({ item }, index) => {
        const offset = spread * (start + index);
        const x = clampToRow(baseX + offset, rowContext);
        positionedMap.set(item.soundId, { ...item, x, y: baseY });
      });
    }
  });

  const positioned = [];
  data.forEach((item) => {
    const placement = positionedMap.get(item.soundId);
    if (placement) positioned.push(placement);
  });

  return positioned;
}

function mapToChartCoordinates(x, y) {
  const clampedX = clamp(x ?? 0, 0, VIEWBOX_WIDTH);
  const clampedY = clamp(y ?? 0, 0, VIEWBOX_HEIGHT);
  return {
    left: (clampedX / VIEWBOX_WIDTH) * 100,
    top: (clampedY / VIEWBOX_HEIGHT) * 100
  };
}

// =========================================================
//  4. アプリケーション初期化 (Main)
// =========================================================

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
      correct: (symbol, name) => name ? `✅ 正解！（${symbol}：${name}）` : `✅ 正解！（${symbol}）`,
      incorrect: (symbol, name) => name ? `❌ 不正解。正解は ${symbol}（${name}）です。` : `❌ 不正解。正解は ${symbol} です。`
    }
  });

  // 音量設定
  const savedVolume = localStorage.getItem("ipaVolume");
  if (savedVolume !== null) {
    audioPlayer.volume = parseFloat(savedVolume);
    if (volumeSlider) volumeSlider.value = savedVolume;
  }
  if (volumeSlider) {
    volumeSlider.addEventListener("input", () => audioPlayer.volume = volumeSlider.value);
    volumeSlider.addEventListener("change", () => localStorage.setItem("ipaVolume", volumeSlider.value));
  }

  let vowelPool = []; 
  const soundMap = {}; 

  // --- チャート生成 ---
  async function populateChart() {
    if (!chart) return;

    try {
      const response = await fetch(VOWEL_DATA_URL, { cache: "no-cache" });
      if (!response.ok) throw new Error(`Failed to load vowel data: ${response.status}`);

      const data = await response.json();
      const positionedItems = computeVowelLayout(data);
      
      chart.querySelectorAll(".vowel-cell").forEach((cell) => cell.remove());
      vowelPool = [];
      Object.keys(soundMap).forEach((key) => delete soundMap[key]);

      // ▼▼▼ ★追加：除外したい記号のリスト ▼▼▼
      const ignoreSymbols = ["e̞", "ø̞", "ä"]; 
      // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

      positionedItems.forEach((item) => {
        if (!item || !item.ipa) return;

        // ▼▼▼ ★追加：除外リストに含まれていたらスキップする処理 ▼▼▼
        if (ignoreSymbols.includes(item.ipa)) {
            return;
        }
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
        
        // 【修正点】 IPA記号を ipachart.com の長いファイル名に変換してIDにする
        // マップにない場合は、IPA記号そのもの（フォールバック）を使います
        const fileStem = VOWEL_FILE_MAP[item.ipa] || item.ipa;
        const soundId = fileStem; 

        vowelPool.push(soundId);
        soundMap[soundId] = item.ipa; 

        const button = document.createElement("button");
        button.type = "button";
        button.className = "vowel-cell clickable";
        button.dataset.sound = soundId;
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
      console.error("Error:", error);
      quiz.setMessage("⚠️ データ読み込みエラー");
    }
  }

  await populateChart();

  quiz.setSoundToSymbol(soundMap);
  quiz.attachCellListeners();
  quiz.loadHistory();

  // --- 再生用ヘルパー ---
  function playAudioFile(soundId) {
    if (!soundId) return;
    
    // 【URL生成】
    // Base URL + ファイル名(soundId) + .mp3
    // 例: https://www.ipachart.com/mp3/Close_front_unrounded_vowel.mp3
    const fullUrl = `${IPACHART_AUDIO_BASE}${soundId}.mp3`;
    
    audioPlayer.src = fullUrl;
    audioPlayer.play().catch(e => console.warn("Play error:", e));
  }

  // --- グローバル操作関数 ---
  window.playRandomSound = function() {
    if (vowelPool.length === 0) {
      quiz.setMessage("⚠️ 母音データがありません");
      return;
    }
    const nextId = quiz.startRandomQuestion(vowelPool);
    playAudioFile(nextId);
    quiz.setMessage("再生しました。正しい母音記号をクリックしてください。");
  };

  window.playWrongSound = function() {
    const soundId = quiz.playFromWrongHistory();
    if (!soundId) {
      quiz.setMessage("🎉 間違いはありません");
      return;
    }
    playAudioFile(soundId);
    quiz.setMessage("❓ 再出題しました");
  };

  window.replaySound = function() {
    // クイズインスタンスの現在の正解IDを取得
    // QuizGameの実装に合わせて調整してください
    const currentId = quiz.correctSound; 
    if (currentId) {
        playAudioFile(currentId);
        quiz.setMessage("🔁 もう一度再生しました");
    } else {
        quiz.setMessage("🎧 まずは新しい音声を再生してください。");
    }
  };

  // QuizGameクラス内の音再生も上書きして同期させる
  quiz.playSound = function(soundId, options = {}) {
      const { highlight = false } = options;
      if (!soundId || !this.audioPlayer) return;

      if (highlight) {
        this.setActiveCell(soundId);
      }
      playAudioFile(soundId);
  };

  window.clearHistory = function() {
    quiz.clearHistory();
    quiz.setMessage("🧹 履歴をクリアしました");
  };
});