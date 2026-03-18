# Web Practice Metronome

一個用於音樂練習的網頁節拍器，支援：

- 穩定 Web Audio 排程（lookahead scheduler）
- Odd meter（`5/4`, `7/8`, `9/8`, `11/8`）與 grouping 編輯
- Accent pattern（strong / medium / weak）
- Profile 儲存（localStorage）
- Count-in、Tap Tempo、Auto Ramp、快捷鍵
- 基本視覺化（拍點環、小節分組進度、Bar/Beat 計數）

## 需求

- Python 3（建議）
- 現代瀏覽器（Chrome / Edge / Firefox / Safari）

## 如何運行

在專案根目錄執行：

```bash
cd /home/tsai/Project/metronome
python3 -m http.server 5173
```

打開瀏覽器：

- [http://localhost:5173](http://localhost:5173)

> 第一次播放前，請先點擊頁面上的 `Start`（瀏覽器自動播放政策會要求使用者手勢解鎖音訊）。

## 使用方式（快速）

1. `Start` 開始 / 暫停播放
2. 用 `BPM` slider 或 number 直接改速度
3. 用 `Meter & Grouping` 設定拍號與分組（例如 `2+2+3`）
4. 用 `Practice Profiles` 儲存/套用練習場景
5. 需要循序加速時開啟 `Auto Ramp`

## 快捷鍵

- `Space`: Start / Pause
- `ArrowUp` / `ArrowDown`: BPM ±1
- `Shift + ArrowUp` / `Shift + ArrowDown`: BPM ±5

## 專案結構

```text
.
├── index.html
├── styles.css
└── src
    ├── main.js
    ├── audio
    │   ├── click-voices.js
    │   └── scheduler.js
    ├── components
    │   ├── beat-visualizer.js
    │   ├── grouping-editor.js
    │   ├── profile-list.js
    │   └── transport-panel.js
    ├── lib
    │   └── constants.js
    └── state
        └── metronome-store.js
```

## 常見問題

### 1) 為什麼有時候沒有聲音？

- 通常是 AudioContext 還沒被使用者手勢解鎖。先點一次 `Start`。

### 2) 播放中改拍號為什麼不是立刻跳？

- 這是設計行為：拍號/grouping 在「下個小節」才套用，避免當前小節節拍錯亂。

### 3) Profile 會不會遺失？

- 儲存在瀏覽器 `localStorage`。清除瀏覽器站點資料後會消失。

## 後續可擴充

- Subdivision（8th / triplet / 16th）
- PWA 離線安裝
- MIDI clock / external control
- 雲端同步 profiles
