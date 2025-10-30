const audioBaseUrl = "https://www.coelang.tufs.ac.jp/ipa/sounds/";

const soundToSymbol = {
  s201: "ʘ",
  s202: "ǀ",
  s203: "ǁ",
  s204: "ǂ",
  s205: "ǃ",
  s206: "ɓ",
  s207: "ɗ",
  s208: "ᶑ",
  s209: "ʄ",
  s210: "ɠ",
  s211: "ʛ",
  s212: "kʼ",
  s213: "tʼ",
  s214: "qʼ",
  s215: "sʼ"
};

const mannerGroups = {
  "クリック音": ["s201", "s202", "s203", "s204", "s205"],
  "内破音": ["s206", "s207", "s208", "s209", "s210", "s211"],
  "放出音": ["s212", "s213", "s214", "s215"]
};

const wrongHistoryKey = "nonpulmonicWrongHistory";
const wrongHistoryMapKey = "nonpulmonicWrongHistoryMap";

document.addEventListener("DOMContentLoaded", () => {
  const audioPlayer = document.getElementById("audioPlayer");
  const message = document.getElementById("message");
  let correctSound = "";
  const wrongHistory = [];
  const wrongHistoryMap = {};
  const selectedManners = new Set(Object.keys(mannerGroups));

  const volumeSlider = document.getElementById("volumeSlider");
  volumeSlider.addEventListener("input", () => {
    audioPlayer.volume = volumeSlider.value;
  });

  function getAudioUrl(soundID) {
    return `${audioBaseUrl}${soundID}.mp3`;
  }

  function replaySound() {
    if (!correctSound) {
      message.textContent = "🎧 まずは新しい音声を再生してください。";
      return;
    }

    audioPlayer.src = getAudioUrl(correctSound);
    audioPlayer.play();
    message.textContent = "🔁 もう一度再生しました";
  }

  function getSelectedSoundPool() {
    if (selectedManners.size === 0) {
      return [];
    }

    const pool = new Set();
    selectedManners.forEach((manner) => {
      const sounds = mannerGroups[manner];
      if (!sounds) return;
      sounds.forEach((soundID) => {
        if (soundToSymbol[soundID]) {
          pool.add(soundID);
        }
      });
    });

    return Array.from(pool);
  }

  let hasAnsweredCorrectly = false;
  let hasAlreadyCountedWrong = false;

  function playRandomSound() {
    const soundPool = getSelectedSoundPool();

    if (soundPool.length === 0) {
      message.textContent = "⚠️ 出題する子音の種類が選択されていません。";
      return;
    }

    const randomIndex = Math.floor(Math.random() * soundPool.length);
    correctSound = soundPool[randomIndex];
    hasAnsweredCorrectly = false;
    hasAlreadyCountedWrong = false;
    audioPlayer.src = getAudioUrl(correctSound);
    audioPlayer.play();
    message.textContent = "再生しました。正しい記号をクリックしてください。";
  }

  function playWrongSound() {
    if (wrongHistory.length === 0) {
      message.textContent = "🎉 間違いはありません！すべて正解です。";
      return;
    }

    const randomIndex = Math.floor(Math.random() * wrongHistory.length);
    correctSound = wrongHistory[randomIndex];
    hasAnsweredCorrectly = false;
    hasAlreadyCountedWrong = false;
    audioPlayer.src = getAudioUrl(correctSound);
    audioPlayer.play();
    message.textContent = "❓ 間違った問題から再出題しました。正しい記号を選んでください。";
  }

  function updateHistoryTable() {
    const tbody = document.querySelector("#historyTable tbody");
    tbody.innerHTML = "";

    for (const soundID in wrongHistoryMap) {
      const symbol = soundToSymbol[soundID];
      const cell = document.querySelector(`.clickable[data-sound="${soundID}"]`);
      const name = cell ? cell.dataset.name : "（名称不明）";
      const count = wrongHistoryMap[soundID];

      const row = document.createElement("tr");
      row.innerHTML = `<td>${symbol}</td><td>${name}</td><td>${count}</td>`;
      tbody.appendChild(row);
    }
  }

  function saveHistory() {
    localStorage.setItem(wrongHistoryKey, JSON.stringify(wrongHistory));
    localStorage.setItem(wrongHistoryMapKey, JSON.stringify(wrongHistoryMap));
  }

  function loadHistory() {
    const wh = localStorage.getItem(wrongHistoryKey);
    const wm = localStorage.getItem(wrongHistoryMapKey);
    if (wh) wrongHistory.push(...JSON.parse(wh));
    if (wm) Object.assign(wrongHistoryMap, JSON.parse(wm));
    updateHistoryTable();
  }

  function clearHistory() {
    wrongHistory.length = 0;
    for (const key in wrongHistoryMap) {
      delete wrongHistoryMap[key];
    }
    localStorage.removeItem(wrongHistoryKey);
    localStorage.removeItem(wrongHistoryMapKey);
    updateHistoryTable();
    message.textContent = "🧹 履歴をクリアしました";
  }

  function setupClickListeners() {
    document.querySelectorAll(".clickable").forEach((cell) => {
      cell.addEventListener("click", () => {
        const selected = cell.dataset.sound;
        if (!selected) return;

        audioPlayer.src = getAudioUrl(selected);
        audioPlayer.play();

        if (!correctSound) return;

        if (selected === correctSound) {
          message.textContent = `✅ 正解！（${soundToSymbol[selected]}）`;
          hasAnsweredCorrectly = true;
        } else {
          const correctCell = document.querySelector(`.clickable[data-sound="${correctSound}"]`);
          const symbol = soundToSymbol[correctSound];
          const name = correctCell ? correctCell.dataset.name : "（名称不明）";
          message.textContent = `❌ 不正解。正解は ${symbol}（${name}）です。`;

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
      });
    });
  }

  function setupMannerFilter() {
    const mannerCheckboxes = document.querySelectorAll('.manner-option input[type="checkbox"]');
    mannerCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          selectedManners.add(checkbox.value);
        } else {
          selectedManners.delete(checkbox.value);
        }
      });
    });

    const selectAllButton = document.querySelector('[data-manner-action="select-all"]');
    const clearButton = document.querySelector('[data-manner-action="clear"]');

    if (selectAllButton) {
      selectAllButton.addEventListener("click", () => {
        mannerCheckboxes.forEach((checkbox) => {
          checkbox.checked = true;
          selectedManners.add(checkbox.value);
        });
      });
    }

    if (clearButton) {
      clearButton.addEventListener("click", () => {
        mannerCheckboxes.forEach((checkbox) => {
          checkbox.checked = false;
        });
        selectedManners.clear();
      });
    }
  }

  function loadVolumePreference() {
    const savedVolume = localStorage.getItem("ipaVolume");
    if (savedVolume !== null) {
      audioPlayer.volume = parseFloat(savedVolume);
      volumeSlider.value = savedVolume;
    }

    volumeSlider.addEventListener("change", () => {
      localStorage.setItem("ipaVolume", volumeSlider.value);
    });
  }

  window.replaySound = replaySound;
  window.playRandomSound = playRandomSound;
  window.playWrongSound = playWrongSound;
  window.clearHistory = clearHistory;

  loadVolumePreference();
  loadHistory();
  setupClickListeners();
  setupMannerFilter();
});
