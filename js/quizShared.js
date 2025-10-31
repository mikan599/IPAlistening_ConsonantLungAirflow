import { buildAudioSrcById } from "./audioSources.js";

export class QuizGame {
  constructor({
    audioPlayer,
    messageElement,
    clickableSelector,
    historyTableSelector,
    storageKey,
    messages = {}
  }) {
    this.audioPlayer = audioPlayer;
    this.messageElement = messageElement;
    this.clickableSelector = clickableSelector;
    this.historyTableSelector = historyTableSelector;
    this.storageKey = storageKey;
    this.messages = {
      needQuestion: "🎧 まずは新しい音声を再生してください。",
      correct: (symbol, name) =>
        name ? `✅ 正解！（${symbol}：${name}）` : `✅ 正解！（${symbol}）`,
      incorrect: (symbol, name) =>
        name
          ? `❌ 不正解。正解は ${symbol}（${name}）です。`
          : `❌ 不正解。正解は ${symbol} です。`,
      ...messages
    };

    this.correctSound = "";
    this.hasAnsweredCorrectly = false;
    this.hasAlreadyCountedWrong = false;
    this.soundToSymbol = {};
    this.wrongHistory = [];
    this.wrongHistoryMap = {};
    this.activeCell = null;
  }

  setSoundToSymbol(map) {
    this.soundToSymbol = { ...map };
  }

  setMessage(text) {
    if (this.messageElement) {
      this.messageElement.textContent = text;
    }
  }

  get storageKeys() {
    const base = this.storageKey || "quiz";
    return {
      wrongHistory: `${base}:wrongHistory`,
      wrongHistoryMap: `${base}:wrongHistoryMap`
    };
  }

  playSound(soundId, options = {}) {
    const { highlight = false } = options;

    if (!soundId || !this.audioPlayer) {
      return;
    }

    if (highlight) {
      this.setActiveCell(soundId);
    }
    this.audioPlayer.src = buildAudioSrcById(soundId);
    this.audioPlayer.currentTime = 0;
    this.audioPlayer.play().catch(() => {});
  }

  replayCurrent() {
    if (!this.correctSound) {
      this.setMessage(this.messages.needQuestion);
      return false;
    }

    this.playSound(this.correctSound);
    return true;
  }

  startQuestion(soundId) {
    if (!soundId) return false;

    this.correctSound = soundId;
    this.hasAnsweredCorrectly = false;
    this.hasAlreadyCountedWrong = false;
    this.setActiveCell(null);
    this.playSound(soundId);
    return true;
  }

  startRandomQuestion(pool) {
    if (!Array.isArray(pool) || pool.length === 0) {
      return null;
    }

    const index = Math.floor(Math.random() * pool.length);
    const soundId = pool[index];
    this.startQuestion(soundId);
    return soundId;
  }

  playFromWrongHistory() {
    if (this.wrongHistory.length === 0) {
      return null;
    }
    const index = Math.floor(Math.random() * this.wrongHistory.length);
    const soundId = this.wrongHistory[index];
    this.startQuestion(soundId);
    return soundId;
  }

  findCellBySound(soundId) {
    if (!soundId) return null;
    return document.querySelector(
      `${this.clickableSelector}[data-sound="${soundId}"]`
    );
  }

  setActiveCell(soundId) {
    if (this.activeCell) {
      this.activeCell.classList.remove("is-playing");
      this.activeCell = null;
    }

    if (!soundId) {
      return;
    }

    const nextCell = this.findCellBySound(soundId);
    if (nextCell) {
      nextCell.classList.add("is-playing");
      this.activeCell = nextCell;
    }
  }

  resolveSymbol(soundId, fallbackNode) {
    if (!soundId) return "";

    if (this.soundToSymbol && this.soundToSymbol[soundId]) {
      return this.soundToSymbol[soundId];
    }

    const cell = this.findCellBySound(soundId) || fallbackNode;
    if (!cell) return soundId;

    const ipa = cell.dataset.ipa || cell.getAttribute("data-ipa");
    if (ipa) return ipa;

    const glyph = (cell.textContent || "").trim();
    return glyph || soundId;
  }

  resolveName(soundId) {
    const cell = this.findCellBySound(soundId);
    if (!cell) return "";
    return cell.dataset.name || cell.getAttribute("data-name") || "";
  }

  recordWrongAnswer(soundId) {
    if (!soundId) return;

    if (!this.wrongHistory.includes(soundId)) {
      this.wrongHistory.push(soundId);
    }
    this.wrongHistoryMap[soundId] = (this.wrongHistoryMap[soundId] || 0) + 1;
    this.saveHistory();
    this.updateHistoryTable();
  }

  handleAnswer(selectedSound, sourceCell) {
    if (!selectedSound) return;

    this.playSound(selectedSound, { highlight: true });

    if (!this.correctSound) {
      this.setMessage(this.messages.needQuestion);
      return;
    }

    if (selectedSound === this.correctSound) {
      const symbol = this.resolveSymbol(selectedSound, sourceCell);
      const name = this.resolveName(selectedSound);
      this.setMessage(this.messages.correct(symbol, name));
      this.hasAnsweredCorrectly = true;
      return;
    }

    const symbol = this.resolveSymbol(this.correctSound);
    const name = this.resolveName(this.correctSound);
    this.setMessage(this.messages.incorrect(symbol, name));

    if (!this.hasAnsweredCorrectly && !this.hasAlreadyCountedWrong) {
      this.recordWrongAnswer(this.correctSound);
      this.hasAlreadyCountedWrong = true;
    }
  }

  attachCellListeners() {
    const cells = document.querySelectorAll(this.clickableSelector);
    cells.forEach((cell) => {
      cell.addEventListener("click", () => {
        const selected = cell.dataset.sound;
        this.handleAnswer(selected, cell);
      });
    });
  }

  updateHistoryTable() {
    if (!this.historyTableSelector) return;
    const table = document.querySelector(`${this.historyTableSelector} tbody`);
    if (!table) return;

    table.innerHTML = "";
    Object.keys(this.wrongHistoryMap).forEach((soundId) => {
      const symbol = this.resolveSymbol(soundId);
      const name = this.resolveName(soundId);
      const count = this.wrongHistoryMap[soundId];

      const row = document.createElement("tr");
      row.innerHTML = `<td>${symbol}</td><td>${name || "（名称不明）"}</td><td>${count}</td>`;
      table.appendChild(row);
    });
  }

  saveHistory() {
    const keys = this.storageKeys;
    localStorage.setItem(keys.wrongHistory, JSON.stringify(this.wrongHistory));
    localStorage.setItem(
      keys.wrongHistoryMap,
      JSON.stringify(this.wrongHistoryMap)
    );
  }

  loadHistory() {
    const keys = this.storageKeys;
    try {
      const storedHistory = localStorage.getItem(keys.wrongHistory);
      const storedMap = localStorage.getItem(keys.wrongHistoryMap);

      if (storedHistory) {
        const parsed = JSON.parse(storedHistory);
        if (Array.isArray(parsed)) {
          this.wrongHistory = parsed;
        }
      }

      if (storedMap) {
        const parsedMap = JSON.parse(storedMap);
        if (parsedMap && typeof parsedMap === "object") {
          this.wrongHistoryMap = parsedMap;
        }
      }
    } catch (error) {
      console.error("履歴の読み込みに失敗しました", error);
      this.wrongHistory = [];
      this.wrongHistoryMap = {};
    }

    this.updateHistoryTable();
  }

  clearHistory() {
    this.wrongHistory = [];
    this.wrongHistoryMap = {};
    const keys = this.storageKeys;
    localStorage.removeItem(keys.wrongHistory);
    localStorage.removeItem(keys.wrongHistoryMap);
    this.updateHistoryTable();
  }
}
