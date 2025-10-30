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
  const left = document.querySelectorAll(".np-col-clicks .np-sound-cell");
  const mid = document.querySelectorAll(".np-col-implosives .np-sound-cell");
  const right = document.querySelectorAll(".np-col-ejectives .np-sound-cell");
  const cells = [...left, ...mid, ...right];

  cells.forEach((cell, index) => {
    const filename = NONPULMONIC_FILES[index];
    if (filename) {
      cell.dataset.sound = filename;
      cell.classList.add("is-wired");
    } else {
      delete cell.dataset.sound;
      cell.classList.remove("is-wired");
    }
  });

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
      const symbol = cell ? cell.textContent.trim() : sound;
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
      const symbol = cell.textContent.trim();
      setMessage(`✅ 正解！（${symbol}）`);
      hasAnsweredCorrectly = true;
    } else {
      const correctCell = getCellBySound(correctSound);
      const symbol = correctCell ? correctCell.textContent.trim() : correctSound;
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
      cell.addEventListener("click", () => {
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
