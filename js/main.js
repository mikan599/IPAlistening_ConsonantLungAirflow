// Firebase モジュールの読み込み
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";
import { buildAudioSrcById } from "./audioSources.js"; // 音声ファイルの絶対URLを共通管理する

// Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyAuWRdqOiP3XoptQwTkmlSj2Goa9YpcWSY",
  authDomain: "ipalistening.firebaseapp.com",
  projectId: "ipalistening",
  storageBucket: "ipalistening.appspot.com",
  messagingSenderId: "845925343561",
  appId: "1:845925343561:web:661aff64e1588a887c3a98",
  measurementId: "G-R7DPSFMZ4Z"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
  const audioPlayer = document.getElementById("audioPlayer");
  const message = document.getElementById("message");
  let correctSound = "";
  const wrongHistory = [];
  const wrongHistoryMap = {};
  const volumeSlider = document.getElementById("volumeSlider");
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

  const soundToSymbol = {
    s101: "p", s102: "b", s103: "t", s104: "d", s105: "ʈ", s106: "ɖ",
    s107: "c", s108: "ɟ", s109: "k", s110: "g", s111: "q", s112: "ɢ",
    s113: "ʔ", s114: "m", s115: "ɱ", s116: "n", s117: "ɳ", s118: "ɲ",
    s119: "ŋ", s120: "ɴ", s121: "ʙ", s122: "r", s123: "ʀ", s124: "ɾ",
    s125: "ɽ", s126: "ɸ", s127: "β", s128: "f", s129: "v", s130: "θ",
    s131: "ð", s132: "s", s133: "z", s134: "ʃ", s135: "ʒ", s136: "ʂ",
    s137: "ʐ", s138: "ç", s139: "ʝ", s140: "x", s141: "ɣ", s142: "χ",
    s143: "ʁ", s144: "ħ", s145: "ʕ", s146: "h", s147: "ɦ", s148: "ɬ",
    s149: "ɮ", s150: "ʋ", s151: "ɹ", s152: "ɻ", s153: "j", s154: "ɰ",
    s155: "l", s156: "ɭ", s157: "ʎ", s158: "ʟ", s184: "ⱱ"
  };

  const mannerGroups = {
    "破裂音": ["s101", "s102", "s103", "s104", "s105", "s106", "s107", "s108", "s109", "s110", "s111", "s112", "s113"],
    "鼻音": ["s114", "s115", "s116", "s117", "s118", "s119", "s120"],
    "ふるえ音": ["s121", "s122", "s123"],
    "たたき音": ["s184", "s124", "s125"],
    "摩擦音": ["s126", "s127", "s128", "s129", "s130", "s131", "s132", "s133", "s134", "s135", "s136", "s137", "s138", "s139", "s140", "s141", "s142", "s143", "s144", "s145", "s146", "s147"],
    "側面摩擦音": ["s148", "s149"],
    "接近音": ["s150", "s151", "s152", "s153", "s154"],
    "側面接近音": ["s155", "s156", "s157", "s158"]
  };

  const selectedManners = new Set(Object.keys(mannerGroups));

  function replaySound() {
    if (correctSound) {
      audioPlayer.src = buildAudioSrcById(correctSound);
      audioPlayer.play();
      message.textContent = `🔁 もう一度再生しました`;
    } else {
      message.textContent = "🎧 まずは新しい音声を再生してください。";
    }
  }

  let hasAnsweredCorrectly = false;
  let hasAlreadyCountedWrong = false;

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

  function playRandomSound() {
    const soundPool = getSelectedSoundPool();

    if (soundPool.length === 0) {
      message.textContent = "⚠️ 調音方法が選択されていません。出題範囲を選択してください。";
      return;
    }

    const randomIndex = Math.floor(Math.random() * soundPool.length);
    correctSound = soundPool[randomIndex];
    hasAnsweredCorrectly = false;
    hasAlreadyCountedWrong = false;
    audioPlayer.src = buildAudioSrcById(correctSound);
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
    audioPlayer.src = buildAudioSrcById(correctSound);
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
    localStorage.setItem("wrongHistory", JSON.stringify(wrongHistory));
    localStorage.setItem("wrongHistoryMap", JSON.stringify(wrongHistoryMap));
  }

  function loadHistory() {
    const wh = localStorage.getItem("wrongHistory");
    const wm = localStorage.getItem("wrongHistoryMap");
    if (wh) wrongHistory.push(...JSON.parse(wh));
    if (wm) Object.assign(wrongHistoryMap, JSON.parse(wm));
    updateHistoryTable();
  }

  function clearHistory() {
    wrongHistory.length = 0;
    for (let key in wrongHistoryMap) delete wrongHistoryMap[key];
    localStorage.removeItem("wrongHistory");
    localStorage.removeItem("wrongHistoryMap");
    updateHistoryTable();
    message.textContent = "🧹 履歴をクリアしました";
  }

  function setupClickListeners() {
    document.querySelectorAll(".clickable").forEach(cell => {
      cell.addEventListener("click", () => {
        const selected = cell.dataset.sound;

        if (selected) {
          audioPlayer.src = buildAudioSrcById(selected);
          audioPlayer.play();
        }

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

  window.replaySound = replaySound;
  window.playRandomSound = playRandomSound;
  window.playWrongSound = playWrongSound;
  window.clearHistory = clearHistory;

  loadHistory();
  setupClickListeners();
  setupMannerFilter();

  /* firebass認証を一時的に無効化
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "login.html";
    }
  });
  */
});
