const TUFS_AUDIO_BASE = "https://www.coelang.tufs.ac.jp/ipa/sounds/";
const NONPULMONIC_FILES = [
  // クリック音
  "s176.mp3",
  "s177.mp3",
  "s178.mp3",
  "s179.mp3",
  "s180.mp3",
  // 内破音
  "s160.mp3",
  "s162.mp3",
  "s164.mp3",
  "s166.mp3",
  "s168.mp3",
  // 放出音
  "s101_401.mp3",
  "s103_401.mp3",
  "s109_401.mp3",
  "s132_401.mp3",
];

const NONPULMONIC_JA = [
  "両唇音",
  "歯音",
  "（後部）歯茎音",
  "硬口蓋歯茎音",
  "歯茎側面音",
  "両唇音",
  "歯音／歯茎音",
  "硬口蓋音",
  "軟口蓋音",
  "口蓋垂音",
  "両唇音",
  "歯音／歯茎音",
  "軟口蓋音",
  "歯茎摩擦音",
];

function buildAudioSrc(filename) {
  return new URL(filename, TUFS_AUDIO_BASE).href;
}

const npPlayer = new Audio();
npPlayer.preload = "auto";

const VOLUME_STORAGE_KEY = "ipaVolume";
const WRONG_HISTORY_KEY = "npWrongHistory";
const WRONG_HISTORY_MAP_KEY = "npWrongHistoryMap";

function playByFilename(filename) {
  if (!filename) return;

  npPlayer.pause();
  npPlayer.src = buildAudioSrc(filename);
  npPlayer.currentTime = 0;
  npPlayer.play().catch(() => {});
}

document.addEventListener("DOMContentLoaded", () => {
  const message = document.getElementById("message");
  const volumeSlider = document.getElementById("volumeSlider");
  function ensureCellStructure(element) {
    if (!element) return element;

    if (element.dataset.structureReady === "true") {
      return element;
    }

    let cell = element;

    if (element.tagName === "BUTTON") {
      const wrapper = document.createElement("div");

      element.classList.remove("np-sound-cell");
      element.classList.add("np-glyph-btn");
      element.type = "button";

      const glyphFromButton = (element.dataset.glyph || element.textContent || "").trim();
      if (glyphFromButton) {
        element.dataset.glyph = glyphFromButton;
        element.textContent = glyphFromButton;
      }

      const parent = element.parentElement;
      wrapper.className = element.className
        ? `np-sound-cell ${element.className.replace(/\bnp-glyph-btn\b/, "").trim()}`
        : "np-sound-cell";
      wrapper.classList.remove("clickable");

      Object.entries(element.dataset).forEach(([key, value]) => {
        if (value !== undefined) {
          wrapper.dataset[key] = value;
        }
      });

      if (parent) {
        parent.replaceChild(wrapper, element);
      }

      wrapper.appendChild(element);
      cell = wrapper;
    } else {
      cell.classList.add("np-sound-cell");
    }

    let button = cell.querySelector(".np-glyph-btn");
    if (!button) {
      const glyph = (cell.dataset.glyph || cell.getAttribute("data-glyph") || cell.textContent || "").trim();
      button = document.createElement("button");
      button.type = "button";
      button.className = "np-glyph-btn";
      button.textContent = glyph;
      cell.innerHTML = "";
      cell.appendChild(button);
      if (glyph) {
        cell.dataset.glyph = glyph;
      }
    }

    button.classList.add("clickable");
    button.classList.add("np-glyph-btn");
    button.classList.remove("np-sound-cell");

    cell.classList.remove("clickable");
    cell.dataset.structureReady = "true";
    return cell;
  }

  const left = Array.from(
    document.querySelectorAll(".np-col-clicks .np-sound-cell")
  ).map(ensureCellStructure);
  const mid = Array.from(
    document.querySelectorAll(".np-col-implosives .np-sound-cell")
  ).map(ensureCellStructure);
  const right = Array.from(
    document.querySelectorAll(".np-col-ejectives .np-sound-cell")
  ).map(ensureCellStructure);
  const cells = [...left, ...mid, ...right];

  function getCellGlyph(cell) {
    if (!cell) return "";

    const storedGlyph = cell.dataset.glyph || cell.getAttribute("data-glyph");
    if (storedGlyph) {
      return storedGlyph;
    }

    const button = cell.querySelector(".np-glyph-btn");
    if (button) {
      const buttonGlyph = (button.dataset.glyph || button.textContent || "").trim();
      if (buttonGlyph) {
        cell.dataset.glyph = buttonGlyph;
        button.dataset.glyph = buttonGlyph;
        return buttonGlyph;
      }
    }

    const textGlyph = (cell.textContent || "").trim();
    if (textGlyph) {
      cell.dataset.glyph = textGlyph;
      return textGlyph;
    }

    return "";
  }

  function ensureItemWrapper(cell) {
    if (!cell) return null;

    let wrapper = cell.parentElement;
    if (!wrapper || !wrapper.classList || !wrapper.classList.contains("np-item")) {
      wrapper = document.createElement("div");
      wrapper.className = "np-item";
      const parent = cell.parentNode;
      if (parent) {
        parent.insertBefore(wrapper, cell);
      }
      wrapper.appendChild(cell);
    }

    return wrapper;
  }

  function attachJaLabelsToNonpulmonicCells(targetCells) {
    targetCells.forEach((cell, index) => {
      const ja = NONPULMONIC_JA[index] || "";
      const button = cell.querySelector(".np-glyph-btn");
      const glyph = getCellGlyph(cell);
      const wrapper = ensureItemWrapper(cell);

      if (ja) {
        cell.dataset.name = ja;
      } else {
        delete cell.dataset.name;
      }

      if (button) {
        if (ja && glyph) {
          button.setAttribute("aria-label", `${glyph}（${ja}）`);
        } else if (glyph) {
          button.setAttribute("aria-label", glyph);
        } else {
          button.removeAttribute("aria-label");
        }
        button.dataset.glyph = glyph;
        if (ja) {
          button.dataset.name = ja;
        } else {
          delete button.dataset.name;
        }
      }

      if (!wrapper) {
        return;
      }

      let label = wrapper.querySelector(".np-ja");
      if (!label) {
        label = cell.querySelector(".np-ja");
      }
      if (!label) {
        label = document.createElement("div");
        label.className = "np-ja";
        label.setAttribute("aria-hidden", "true");
      }

      if (label.parentElement !== wrapper) {
        wrapper.appendChild(label);
      }
      label.textContent = ja;

      cell.classList.remove("has-ja");
      cell.querySelectorAll(".ipa-ja").forEach((legacy) => {
        if (legacy !== label) {
          legacy.remove();
        }
      });
    });
  }

  cells.forEach((cell, index) => {
    const filename = NONPULMONIC_FILES[index];
    if (filename) {
      cell.dataset.sound = filename;
      const button = cell.querySelector(".np-glyph-btn");
      if (button) {
        button.dataset.sound = filename;
      }
      cell.classList.add("is-wired");
    } else {
      delete cell.dataset.sound;
      const button = cell.querySelector(".np-glyph-btn");
      if (button) {
        delete button.dataset.sound;
      }
      cell.classList.remove("is-wired");
    }
  });

  attachJaLabelsToNonpulmonicCells(cells);

  const wrongHistory = [];
  const wrongHistoryMap = {};
  let correctSound = "";
  let hasAnsweredCorrectly = false;
  let hasAlreadyCountedWrong = false;

  function setMessage(text) {
    if (message) {
      message.textContent = text;
    }
  }

  function getWiredCells() {
    return cells.filter((cell) => cell.dataset.sound);
  }

  function getCellBySound(sound) {
    return document.querySelector(`.np-sound-cell[data-sound="${sound}"]`);
  }

  function replaySound() {
    if (correctSound) {
      playByFilename(correctSound);
      setMessage("🔁 もう一度再生しました");
    } else {
      setMessage("🎧 まずは新しい音声を再生してください。");
    }
  }

  function playRandomSound() {
    const targets = getWiredCells();

    if (targets.length === 0) {
      setMessage("⚠️ 再生できる記号が見つかりませんでした。");
      return;
    }

    const randomIndex = Math.floor(Math.random() * targets.length);
    const cell = targets[randomIndex];
    const filename = cell.dataset.sound;

    correctSound = filename || "";
    hasAnsweredCorrectly = false;
    hasAlreadyCountedWrong = false;

    playByFilename(filename);
    setMessage("再生しました。正しい記号をクリックしてください。");
  }

  function playWrongSound() {
    if (wrongHistory.length === 0) {
      setMessage("🎉 間違いはありません！すべて正解です。");
      return;
    }

    const randomIndex = Math.floor(Math.random() * wrongHistory.length);
    const filename = wrongHistory[randomIndex];

    correctSound = filename;
    hasAnsweredCorrectly = false;
    hasAlreadyCountedWrong = false;

    playByFilename(filename);
    setMessage("❓ 間違った問題から再出題しました。正しい記号を選んでください。");
  }

  function updateHistoryTable() {
    const tbody = document.querySelector("#historyTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    Object.keys(wrongHistoryMap).forEach((sound) => {
      const cell = getCellBySound(sound);
      const symbol = cell ? getCellGlyph(cell) : sound;
      const name = cell ? (cell.dataset.name || "名称不明") : "名称不明";
      const count = wrongHistoryMap[sound];

      const row = document.createElement("tr");
      row.innerHTML = `<td>${symbol}</td><td>${name}</td><td>${count}</td>`;
      tbody.appendChild(row);
    });
  }

  function saveHistory() {
    localStorage.setItem(WRONG_HISTORY_KEY, JSON.stringify(wrongHistory));
    localStorage.setItem(WRONG_HISTORY_MAP_KEY, JSON.stringify(wrongHistoryMap));
  }

  function loadHistory() {
    const storedHistory = localStorage.getItem(WRONG_HISTORY_KEY);
    const storedMap = localStorage.getItem(WRONG_HISTORY_MAP_KEY);

    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory);
        if (Array.isArray(parsed)) {
          wrongHistory.push(...parsed);
        }
      } catch (error) {
        console.error("Failed to parse nonpulmonic wrong history", error);
      }
    }

    if (storedMap) {
      try {
        const parsedMap = JSON.parse(storedMap);
        if (parsedMap && typeof parsedMap === "object") {
          Object.assign(wrongHistoryMap, parsedMap);
        }
      } catch (error) {
        console.error("Failed to parse nonpulmonic wrong history map", error);
      }
    }

    updateHistoryTable();
  }

  function clearHistory() {
    wrongHistory.length = 0;
    Object.keys(wrongHistoryMap).forEach((key) => delete wrongHistoryMap[key]);
    localStorage.removeItem(WRONG_HISTORY_KEY);
    localStorage.removeItem(WRONG_HISTORY_MAP_KEY);
    updateHistoryTable();
    setMessage("🧹 履歴をクリアしました");
  }

  function handleAnswer(selected, cell) {
    if (!correctSound) {
      return;
    }

    if (selected === correctSound) {
      const symbol = getCellGlyph(cell);
      setMessage(`✅ 正解！（${symbol}）`);
      hasAnsweredCorrectly = true;
    } else {
      const correctCell = getCellBySound(correctSound);
      const symbol = correctCell ? getCellGlyph(correctCell) : correctSound;
      const name = correctCell ? (correctCell.dataset.name || "名称不明") : "名称不明";
      setMessage(`❌ 不正解。正解は ${symbol}（${name}）です。`);

      if (!hasAnsweredCorrectly && !hasAlreadyCountedWrong) {
        if (!wrongHistory.includes(correctSound)) {
          wrongHistory.push(correctSound);
        }
        wrongHistoryMap[correctSound] = (wrongHistoryMap[correctSound] || 0) + 1;
        hasAlreadyCountedWrong = true;
        saveHistory();
        updateHistoryTable();
      }
    }
  }

  function setupCellListeners() {
    cells.forEach((cell) => {
      const button = cell.querySelector(".np-glyph-btn");
      if (!button) return;

      button.addEventListener("click", () => {
        const selected = cell.dataset.sound;

        if (selected) {
          playByFilename(selected);
        }

        handleAnswer(selected, cell);
      });
    });
  }

  function setupVolumeControl() {
    if (!volumeSlider) return;

    const savedVolume = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (savedVolume !== null) {
      const parsed = parseFloat(savedVolume);
      if (!Number.isNaN(parsed)) {
        npPlayer.volume = parsed;
        volumeSlider.value = parsed.toString();
      }
    } else {
      const sliderValue = parseFloat(volumeSlider.value);
      npPlayer.volume = Number.isNaN(sliderValue) ? 1 : sliderValue;
    }

    volumeSlider.addEventListener("input", (event) => {
      const value = parseFloat(event.target.value);
      if (!Number.isNaN(value)) {
        npPlayer.volume = value;
      }
    });

    volumeSlider.addEventListener("change", () => {
      localStorage.setItem(VOLUME_STORAGE_KEY, volumeSlider.value);
    });
  }

  loadHistory();
  setupCellListeners();
  setupVolumeControl();

  window.playRandomSound = playRandomSound;
  window.replaySound = replaySound;
  window.playWrongSound = playWrongSound;
  window.clearHistory = clearHistory;
});

export { TUFS_AUDIO_BASE, NONPULMONIC_FILES, buildAudioSrc, playByFilename };
