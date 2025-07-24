// Firebase モジュールの読み込み
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";

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
  volumeSlider.addEventListener("input", () => {
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

  function replaySound() {
    if (correctSound) {
      audioPlayer.src = `ipa_sounds/${correctSound}.mp3`;
      audioPlayer.play();
      message.textContent = `🔁 もう一度再生しました`;
    } else {
      message.textContent = "🎧 まずは新しい音声を再生してください。";
    }
  }

  let hasAnsweredCorrectly = false; // ✅ 出題後〜正解まで false、正解後 true
  let hasAlreadyCountedWrong = false;

  function playRandomSound() {
    const soundKeys = Object.keys(soundToSymbol);
    const randomIndex = Math.floor(Math.random() * soundKeys.length);
    correctSound = soundKeys[randomIndex];
    hasAnsweredCorrectly = false;
    hasAlreadyCountedWrong = false; // ✅ カウントフラグをリセット
    hasAnsweredCorrectly = false;
    hasAlreadyCountedWrong = false; // ✅ カウントフラグをリセット
    audioPlayer.src = `ipa_sounds/${correctSound}.mp3`;
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
    hasAlreadyCountedWrong = false; // ✅ カウントフラグをリセット
    hasAnsweredCorrectly = false;
    hasAlreadyCountedWrong = false; // ✅ カウントフラグをリセット
    audioPlayer.src = `ipa_sounds/${correctSound}.mp3`;
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
          audioPlayer.src = `ipa_sounds/${selected}.mp3`;
          audioPlayer.play();
        }

        if (!correctSound) return;

        if (selected === correctSound) {
          message.textContent = `✅ 正解！（${soundToSymbol[selected]}）`;
          hasAnsweredCorrectly = true; // ✅ 一度正解したら履歴カウントを停止
          hasAnsweredCorrectly = true; // ✅ 一度正解したら履歴カウントを停止
        } else {
          const correctCell = document.querySelector(`.clickable[data-sound="${correctSound}"]`);
          const symbol = soundToSymbol[correctSound];
          const name = correctCell ? correctCell.dataset.name : "（名称不明）";
          message.textContent = `❌ 不正解。正解は ${symbol}（${name}）です。`;

          // ✅ 一度だけ間違いを記録
          if (!hasAnsweredCorrectly && !hasAlreadyCountedWrong) {
            if (!wrongHistory.includes(correctSound)) {
              wrongHistory.push(correctSound);
            }
            wrongHistoryMap[correctSound] = (wrongHistoryMap[correctSound] || 0) + 1;
            hasAlreadyCountedWrong = true; // ✅ 次からはカウントしない
          // ✅ 一度だけ間違いを記録
          if (!hasAnsweredCorrectly && !hasAlreadyCountedWrong) {
            if (!wrongHistory.includes(correctSound)) {
              wrongHistory.push(correctSound);
            }
            wrongHistoryMap[correctSound] = (wrongHistoryMap[correctSound] || 0) + 1;
            hasAlreadyCountedWrong = true; // ✅ 次からはカウントしない

            saveHistory();
            updateHistoryTable();
          }
            saveHistory();
            updateHistoryTable();
          }
        }
      });
    });
  }

  window.replaySound = replaySound;
  window.playRandomSound = playRandomSound;
  window.playWrongSound = playWrongSound;
  window.clearHistory = clearHistory;

  loadHistory();
  setupClickListeners();

  /* firebass認証を一時的に無効化
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "login.html";
    }
  });
  */
});
