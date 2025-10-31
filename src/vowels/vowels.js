import { buildAudioSrc, reportAudioError } from "/js/audioSources.js";

const DATA_URL = "/public/data/vowels.json";
const VOLUME_STORAGE_KEY = "ipaVolume";

const VOWEL_AUDIO_MAP = {
  "i": "s201",
  "y": "s202",
  "ɨ": "s203",
  "ʉ": "s204",
  "ɯ": "s205",
  "u": "s206",
  "ɪ": "s207",
  "ʏ": "s208",
  "ʊ": "s209",
  "e": "s210",
  "ø": "s211",
  "ɘ": "s212",
  "ɵ": "s213",
  "ɤ": "s214",
  "o": "s215",
  "ə": "s216",
  "ɛ": "s217",
  "œ": "s218",
  "ɜ": "s219",
  "ɞ": "s220",
  "ʌ": "s221",
  "ɔ": "s222",
  "æ": "s223",
  "ɐ": "s224",
  "a": "s225",
  "ɶ": "s226",
  "ɑ": "s227",
  "ɒ": "s228"
};

const vowelPlayer = new Audio();
vowelPlayer.preload = "auto";

let lastPlayedSymbol = null;

function getVolume() {
  const saved = localStorage.getItem(VOLUME_STORAGE_KEY);
  if (saved !== null && !Number.isNaN(Number(saved))) {
    return Number(saved);
  }
  return 1;
}

function updateVolume(volume) {
  const clamped = Math.min(1, Math.max(0, Number(volume)));
  vowelPlayer.volume = clamped;
  localStorage.setItem(VOLUME_STORAGE_KEY, String(clamped));
}

function getAudioSrc(symbol) {
  const id = VOWEL_AUDIO_MAP[symbol];
  if (id) {
    return buildAudioSrc(`${id}.mp3`);
  }
  return `/public/audio/vowels/${encodeURIComponent(symbol)}.mp3`;
}

function playVowel(symbol) {
  if (!symbol) return Promise.resolve();

  const src = getAudioSrc(symbol);
  vowelPlayer.pause();
  vowelPlayer.src = src;
  vowelPlayer.currentTime = 0;
  lastPlayedSymbol = symbol;

  return vowelPlayer.play().catch((error) => {
    console.warn("Audio play failed", { symbol, src, error });
    if (!src.startsWith("/public/audio/vowels/")) {
      reportAudioError(src, error);
    }
  });
}

vowelPlayer.addEventListener("error", () => {
  const src = vowelPlayer.currentSrc || vowelPlayer.src;
  reportAudioError(src, vowelPlayer.error);
});

async function loadVowels() {
  const res = await fetch(DATA_URL, { cache: "no-cache" });
  if (!res.ok) {
    throw new Error(`Failed to load vowels.json: ${res.status}`);
  }
  return await res.json();
}

function hasPair(symbol, meta, all) {
  return Object.entries(all).some(([otherSymbol, otherMeta]) => {
    if (otherSymbol === symbol) return false;
    if (!!otherMeta.rounded === !!meta.rounded) return false;
    const closeY = Math.abs(otherMeta.y - meta.y) <= 4;
    const closeX = Math.abs(otherMeta.x - meta.x) <= 18;
    return closeY && closeX;
  });
}

function renderSVG(vowels) {
  const svg = document.querySelector(".vowel-svg");
  if (!svg) return;
  const nodes = svg.querySelector(".vowel-nodes");
  if (!nodes) return;

  nodes.innerHTML = "";

  Object.entries(vowels).forEach(([symbol, meta]) => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.classList.add("vowel-node");
    group.setAttribute("tabindex", "0");
    group.dataset.symbol = symbol;
    group.dataset.rounded = String(!!meta.rounded);

    const pair = hasPair(symbol, meta, vowels);
    const offset = pair ? (meta.rounded ? 2.2 : -2.2) : 0;
    const cx = Math.min(98, Math.max(2, meta.x + offset));
    const cy = meta.y;

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", String(cx));
    circle.setAttribute("cy", String(cy));
    circle.setAttribute("r", "3.4");

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", String(cx));
    text.setAttribute("y", String(cy));
    text.textContent = symbol;

    group.setAttribute("role", "button");
    group.setAttribute("aria-label", `母音 ${symbol}${meta.rounded ? "（円唇）" : "（非円唇）"}`);

    group.addEventListener("click", () => {
      playVowel(symbol);
    });

    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        playVowel(symbol);
      }
    });

    group.append(circle, text);
    nodes.append(group);
  });
}

function renderFallbackList(vowels) {
  const list = document.querySelector(".vowel-list");
  if (!list) return;
  list.innerHTML = "";
  Object.keys(vowels).forEach((symbol) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = symbol;
    button.addEventListener("click", () => playVowel(symbol));
    list.append(button);
  });
}

function initVolumeSlider() {
  const slider = document.getElementById("volumeSlider");
  if (!slider) return;

  const initialVolume = getVolume();
  vowelPlayer.volume = initialVolume;
  slider.value = String(initialVolume);

  slider.addEventListener("input", () => {
    updateVolume(slider.value);
  });
}

function initQuiz(vowels) {
  const allSymbols = Object.keys(vowels);
  const mistakes = new Map();

  const choicesEl = document.querySelector(".choices");
  const feedbackEl = document.querySelector(".feedback");
  const mistakeListEl = document.querySelector(".mistake-list");
  const statusEl = document.querySelector(".status-message");
  const questionEl = document.querySelector(".question");

  let currentAnswer = null;

  function pickRandom(array) {
    const index = Math.floor(Math.random() * array.length);
    return array[index];
  }

  function updateMistakeList() {
    if (!mistakeListEl) return;
    mistakeListEl.innerHTML = "";

    if (mistakes.size === 0) {
      const li = document.createElement("li");
      li.textContent = "🎉 間違いはありません";
      li.className = "mistake-empty";
      mistakeListEl.append(li);
      return;
    }

    mistakes.forEach((count, symbol) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${symbol} ×${count}`;
      button.addEventListener("click", () => playVowel(symbol));
      li.append(button);
      mistakeListEl.append(li);
    });
  }

  function renderChoices(answer) {
    if (!choicesEl) return;
    const set = new Set([answer]);
    while (set.size < 4 && set.size < allSymbols.length) {
      set.add(pickRandom(allSymbols));
    }
    const options = Array.from(set);
    options.sort(() => Math.random() - 0.5);

    choicesEl.innerHTML = "";
    options.forEach((symbol) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice";
      button.textContent = symbol;
      button.addEventListener("click", () => {
        if (!currentAnswer) {
          return;
        }
        if (symbol === currentAnswer) {
          if (feedbackEl) {
            feedbackEl.textContent = "✅ 正解！";
          }
          mistakes.delete(currentAnswer);
          updateMistakeList();
          setTimeout(() => startRound(false), 600);
        } else {
          const count = mistakes.get(currentAnswer) ?? 0;
          mistakes.set(currentAnswer, count + 1);
          updateMistakeList();
          if (feedbackEl) {
            feedbackEl.textContent = `❌ 不正解。正解は ${currentAnswer} です。`;
          }
        }
      });
      choicesEl.append(button);
    });
  }

  function startRound(fromMistakes) {
    const pool = fromMistakes && mistakes.size > 0
      ? Array.from(mistakes.keys())
      : allSymbols;
    if (pool.length === 0) {
      if (statusEl) {
        statusEl.textContent = "⚠️ 出題可能な母音がありません";
      }
      return;
    }
    const answer = pickRandom(pool);
    currentAnswer = answer;
    if (feedbackEl) {
      feedbackEl.textContent = "";
    }
    if (statusEl) {
      statusEl.textContent = fromMistakes
        ? "📝 間違いから出題しました"
        : "🎧 新しい母音を再生しました";
    }
    if (questionEl) {
      questionEl.dataset.answer = answer;
    }
    renderChoices(answer);
    playVowel(answer);
  }

  document.querySelector(".btn-random")?.addEventListener("click", () => startRound(false));
  document.querySelector(".btn-replay")?.addEventListener("click", () => {
    if (currentAnswer) {
      playVowel(currentAnswer);
      if (statusEl) {
        statusEl.textContent = "🔁 もう一度再生しました";
      }
    } else if (lastPlayedSymbol) {
      playVowel(lastPlayedSymbol);
    }
  });
  document.querySelector(".btn-mistake")?.addEventListener("click", () => {
    if (mistakes.size === 0) {
      if (statusEl) {
        statusEl.textContent = "🎉 間違いはありません";
      }
      return;
    }
    startRound(true);
  });

  updateMistakeList();
  startRound(false);
}

async function main() {
  try {
    const vowels = await loadVowels();
    renderSVG(vowels);
    renderFallbackList(vowels);
    initVolumeSlider();
    initQuiz(vowels);
  } catch (error) {
    console.error(error);
    const chart = document.querySelector(".vowel-section");
    if (chart) {
      const message = document.createElement("p");
      message.style.color = "#f87171";
      message.textContent = "母音データの読み込みに失敗しました。";
      chart.append(message);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateVolume(getVolume());
  main();
});

export { playVowel };
