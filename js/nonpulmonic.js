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
  "s132_401.mp3"
];

function buildAudioSrc(filename) {
  return new URL(filename, TUFS_AUDIO_BASE).href;
}

const npPlayer = new Audio();
npPlayer.preload = "auto";

function playByFilename(filename) {
  if (!filename) return;

  npPlayer.pause();
  npPlayer.src = buildAudioSrc(filename);
  npPlayer.currentTime = 0;
  npPlayer.play().catch(() => {});
}

const SEQUENCE_INTERVAL = 1200;
const VOLUME_STORAGE_KEY = "ipaVolume";
let sequenceTimerId = null;
let sequenceIndex = 0;
let lastActiveCell = null;
let messageElement = null;

function updateMessage(text) {
  if (messageElement) {
    messageElement.textContent = text;
  }
}

function setActiveCell(cell) {
  if (lastActiveCell && lastActiveCell !== cell) {
    lastActiveCell.classList.remove("is-playing");
  }

  if (cell && cell.dataset.sound) {
    cell.classList.add("is-playing");
    lastActiveCell = cell;
  } else {
    lastActiveCell = null;
  }
}

function cancelSequenceTimer() {
  if (sequenceTimerId) {
    clearInterval(sequenceTimerId);
    sequenceTimerId = null;
  }
}

function stopPlayback({ silent = false } = {}) {
  cancelSequenceTimer();
  npPlayer.pause();
  setActiveCell(null);
  if (!silent) {
    updateMessage("⏹️ 再生を停止しました");
  }
}

function describeCell(cell, { prefix = "▶️ " } = {}) {
  if (!cell) return;
  const symbol = cell.textContent.trim();
  const name = cell.dataset.name ? `（${cell.dataset.name}）` : "";
  updateMessage(`${prefix}${symbol}${name}を再生中`);
}

function playCell(cell, { fromSequence = false } = {}) {
  if (!cell || !cell.dataset.sound) {
    if (!fromSequence) {
      updateMessage("⚠️ 再生できる音声が登録されていません。");
    }
    return;
  }

  if (!fromSequence) {
    cancelSequenceTimer();
  }

  playByFilename(cell.dataset.sound);
  setActiveCell(cell);
  describeCell(cell, { prefix: fromSequence ? "🔁 " : "▶️ " });
}

function getAllNpTargets() {
  return Array.from(document.querySelectorAll(".np-sound-cell.is-wired[data-sound]"));
}

function playRandomTarget() {
  const targets = getAllNpTargets();
  if (targets.length === 0) {
    updateMessage("⚠️ 再生できる記号が見つかりませんでした。");
    return;
  }

  const randomIndex = Math.floor(Math.random() * targets.length);
  playCell(targets[randomIndex]);
}

function startSequencePlayback() {
  const targets = getAllNpTargets();
  if (targets.length === 0) {
    updateMessage("⚠️ 連続再生できる記号がありません。");
    return;
  }

  cancelSequenceTimer();
  sequenceIndex = 0;
  playCell(targets[sequenceIndex], { fromSequence: true });

  sequenceTimerId = setInterval(() => {
    sequenceIndex = (sequenceIndex + 1) % targets.length;
    playCell(targets[sequenceIndex], { fromSequence: true });
  }, SEQUENCE_INTERVAL);
}

function initializeSoundCells() {
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
}

function setupVolumeControl() {
  const volumeSlider = document.getElementById("volumeSlider");
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

function setupActionButtons() {
  document.querySelectorAll("[data-np-action]").forEach((button) => {
    const action = button.dataset.npAction;
    if (!action) return;

    if (action === "random") {
      button.addEventListener("click", () => {
        playRandomTarget();
      });
    } else if (action === "sequence") {
      button.addEventListener("click", () => {
        startSequencePlayback();
      });
    } else if (action === "stop") {
      button.addEventListener("click", () => {
        stopPlayback();
      });
    }
  });
}

function setupCellDelegation() {
  const container = document.getElementById("nonpulmonic");
  if (!container) return;

  container.addEventListener("click", (event) => {
    const cell = event.target.closest(".np-sound-cell");
    if (!cell || !container.contains(cell)) return;

    if (!cell.dataset.sound) {
      updateMessage("⚠️ 音源が登録されていません。");
      return;
    }

    playCell(cell);
  });
}

function initialize() {
  messageElement = document.getElementById("message");
  initializeSoundCells();
  setupVolumeControl();
  setupActionButtons();
  setupCellDelegation();
}

document.addEventListener("DOMContentLoaded", initialize);

export { TUFS_AUDIO_BASE, NONPULMONIC_FILES, buildAudioSrc, playByFilename };
