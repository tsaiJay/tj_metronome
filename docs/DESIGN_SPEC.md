# Practice Metronome — 設計規格（Design Spec）

> **用途**：本文描述目前實作行為與資料契約，可作為功能驗收、回歸測試與改版對照。  
> **狀態**：與 `src/` 程式碼對齊；若 README 與程式不一致，以本文「實作」為準。

---

## 1. 產品定位與範圍

| 項目 | 說明 |
|------|------|
| 目標使用者 | 音樂練習：奇數拍、複合節奏分組、可儲存場景 |
| 核心價值 | Web Audio 前瞻排程、拍號／分組／重音、Profile、循序加速、視覺回饋 |

### 1.1 功能範圍檢查

- [ ] 應用為純前端（無後端 API）；狀態主要存於 `localStorage`
- [ ] 播放／暫停由 `AudioScheduler` + `AudioContext` 驅動
- [ ] 不實作多軌、MIDI 輸出、錄音

---

## 2. 技術架構

| 層級 | 責任 |
|------|------|
| `MetronomeStore` | 單一資料來源：`config`、`runtime`、`profiles`、訂閱通知 |
| `AudioScheduler` | `setInterval` 前瞻排程、發聲、更新 `runtime`、小節邊界邏輯 |
| 各 `create*Panel` | DOM 綁定、讀寫 store、無自有長期狀態 |
| `meter.js` | BPM／拍號 → 每拍時長、每小節 pulse 數、meter beat 對應 |

常數見 `src/lib/constants.js`（`BPM_MIN`/`BPM_MAX`、`TIME_SIG_DENOMINATOR_OPTIONS`、`DEFAULT_CONFIG` 等）。

---

## 3. 資料模型

### 3.1 `config`（節拍器設定）

| 欄位 | 型別／範圍 | 說明 |
|------|------------|------|
| `bpm` | 20–500 | 以**四分音符**為單位的 BPM |
| `timeSigNumerator` | 1–16 | 拍號分子 |
| `timeSigDenominator` | `4 \| 8 \| 16 \| 32` | 拍號分母（非法值則回落預設 4） |
| `grouping` | `number[]`，正整數，總和須等於分子 | 小節內分組；不足補尾段、過長則正規化為 `[numerator]` |
| `accentPattern` | 長度 = 分子；值 `strong \| medium \| weak` | 正拍重音；變更拍號／分組時會與分組規則合併重建 |
| `soundSet` | `classic \| woodblock` | 音色集 |
| `volumeAccent` / `volumeNormal` / `volumeGhost` | 0–1 | 對應 strong／medium／weak 發聲層級 |
| `flashIntensity` | 0–1 | 視覺環「當前 pulse」點亮度底線：`max(flashIntensity, 0.25)`（**目前無 UI**，僅 config／normalize） |
| `autoRamp` | 見下表 | 循序加速 |

`autoRamp`：

| 子欄位 | 範圍 | 說明 |
|--------|------|------|
| `enabled` | boolean | 是否啟用 |
| `everyBars` | 1–64 | 每幾個小節嘗試升速一次 |
| `incrementBpm` | 1–50 | 每次增加 BPM |
| `maxBpm` | 20–500 | 上限；達上限則不再增加 |

### 3.2 `runtime`（播放執行狀態）

| 欄位 | 說明 |
|------|------|
| `state` | `running \| paused` |
| `barIndex` | 當前小節（1-based，scheduler 內部與 UI 一致） |
| `beatIndex` | **當前 pulse 索引（1-based）**，非僅「正拍編號」；含細分時會大於分子 |
| `meterBeatIndex` | 當前對應之 meter beat（1…numerator） |
| `groupedBeatIndex` | 當前分組內第幾拍 |
| `activeGroupIndex` | 當前所在分組索引（0-based） |
| `currentBeatTime` | 最近一次排程的 audio time（秒） |
| `pendingConfig` | 播放中切換設定時，佇列至**下一小節開頭**套用的完整 `config`；`null` 表示無 |

### 3.3 Profile

| 欄位 | 說明 |
|------|------|
| `id` | 字串；內建以固定 id 前綴 |
| `name` | 顯示名稱 |
| `config` | 經 `normalizeConfig` 的設定 |
| `updatedAt` | 時間戳 |
| `builtIn` | 僅內建項目為 `true`；不可刪除 |

**儲存鍵**：`metronome.profiles.v1`（僅自訂）、`metronome.lastProfile.v1`（最後選中 profile）。

### 3.3 資料行為檢查

- [ ] `normalizeConfig` 會忽略舊版 `countInBars` 欄位（不向後相容還原 count-in）
- [ ] 套用 profile 時：若 `state === running`，整份 config 進入 `pendingConfig`；否則直接寫入 `config`
- [ ] 小節邊界：先 `applyPendingConfig()`（若有），再處理 Auto Ramp

---

## 4. 節奏與聲音語意

### 4.1 Pulse 與 meter beat

- **每小節 pulse 數**：`numerator * (denominator / 4)`，四捨五入為整數（實作為 `Math.round`）。
- **單一 pulse 時長（秒）**：`(60 / bpm) * (4 / denominator)`。
- **Meter beat index**：由 pulse 索引換算；同一 meter beat 可跨多個 pulse（例如分母 8 時一個正拍兩個 pulse）。
- **邊界 pulse**：`isMeterBeatBoundaryPulse` 為真時，該 pulse 對應「新 meter beat 的開頭」。

### 4.2 聲音層級（`scheduler`）

在**邊界 pulse** 上讀 `accentPattern[meterBeatIndex - 1]`：

- `strong` → layer `accent`（`volumeAccent`）
- `medium` → layer `normal`（`volumeNormal`）
- `weak` → layer `ghost`（`volumeGhost`）
- **非邊界 pulse**（同一 meter beat 內的後續細分）→ 一律 layer `ghost`（`volumeGhost`）

> 註：視覺環上正拍仍依 `accentPattern` 顯示 `accent-strong` / `accent-medium` / `accent-weak` class；聽感上 weak 正拍與細分同為 ghost layer，但頻率等仍依 `click-voices.js` 內 layer 分支而定。

### 4.3 節奏檢查

- [ ] 4/4 @ 120 BPM：每小節 4 個 pulse，約 0.5s／pulse
- [ ] 7/8：每小節 14 個 pulse（若與樂理預期不同，以 `getPulsesPerBar` 為準）
- [ ] Tap Tempo 依最近間隔平均換算 BPM，並 clamp 至 20–500

---

## 5. 音訊排程器（`AudioScheduler`）

| 參數 | 值 | 說明 |
|------|-----|------|
| `LOOKAHEAD_MS` | 25 | `setInterval` 週期 |
| `SCHEDULE_AHEAD_SECONDS` | 0.12 | 前瞻排程視窗 |
| Master gain | 0.95 | 輸出前綁定 |

### 5.1 生命週期

| 動作 | 行為 |
|------|------|
| `start()` | 建立／resume `AudioContext`；`pulseIndex`、`barIndex` 重置為 1；`state` → `running`；啟動 interval |
| `pause()` | 清除 interval；`state` → `paused`；**不**重置小節／拍索引 |
| `toggle()` | running → `pause()`；paused → `start()`（**再次開始會從頭**，非從暫停處續播） |
| `stop()` | 程式內有完整重置；若 UI 未暴露，以實際可觸發路徑為準 |

### 5.2 小節邊界（`#onBarBoundary`）

1. 若有 `pendingConfig` → `applyPendingConfig()`
2. 若 `autoRamp.enabled` 且 `barIndex % everyBars === 0`（注意：`barIndex` 在進入此函數時已為「剛結束後的下一小節」語意，以程式為準）
3. `bpm = min(bpm + incrementBpm, maxBpm)`，僅在數值變更時 `updateConfig`

### 5.3 排程檢查

- [ ] 播放中 `getSnapshot().runtime` 與聽覺節拍大致同步（允許裝置延遲）
- [ ] 暫停後再 Start：從 Bar 1／Pulse 1 重新開始
- [ ] 播放中改拍號／分組：透過 `queueConfigForNextBar`，下一小節生效

---

## 6. UI 區塊規格

### 6.1 版面（`main.js`）

- 三欄：`left`（Profiles）、`center`（行動摘要 + 視覺化 + Meter）、`right`（Transport + Advance）
- 窄螢幕：`Current Setup` 面板顯示 `BPM | 拍號 | 分組` 文字摘要

**檢查**

- [ ] Header 標題與副標與 `main.js` 一致
- [ ] Mobile summary 與當前 `config` 同步

### 6.2 Transport（`transport-panel.js`）

| 控制 | 行為 |
|------|------|
| BPM slider + number | 即時 `updateConfig({ bpm })`；兩者互相同步 |
| Start / Pause | `scheduler.toggle()` |
| Tap Tempo | 連續點擊；≥2 次後取平均間隔 → BPM → 更新 store |
| `-1` / `+1` | BPM ±1，clamp |
| 快捷鍵 | 見 §7 |

**檢查**

- [ ] 按鈕文案在 `running` 時為「Pause」，否則「Start」
- [ ] 提示列顯示 Hotkeys 文字

### 6.3 Advance — Auto Ramp（`advance-panel.js`）

- 標題含 **(beta)**
- 四個控制綁定 `autoRamp.*`，並經 `normalizeConfig` 限制範圍

**檢查**

- [ ] 勾選／數值變更立即反映到 `config` 與 `render` 回填

### 6.4 Meter & Grouping（`grouping-editor.js`）

| 控制 | 行為 |
|------|------|
| Numerator / Denominator / Grouping 文字 | `change` 時重算 `accentPattern`（`createAccentPatternByGrouping`）；**播放中**改為 `queueConfigForNextBar` |
| Preset chips（5/4、7/8、9/8、11/8） | 同上，播放中佇列至下小節 |
| Sound Set | 即時 `updateConfig` |
| Accent / Normal / Ghost Vol | `input` 即時 `updateConfig` |

**檢查**

- [ ] Denominator 選項僅 4 / 8 / 16 / 32
- [ ] Grouping 以 `+` 解析；非法時由 `ensureGrouping` 修正

### 6.5 Beat Visualizer（`beat-visualizer.js`）

| 區塊 | 行為 |
|------|------|
| 頂部統計 | BPM、拍號、分組字串、`state`（`running`/`paused`） |
| Pending 點 | `pendingConfig` 存在時顯示（`state-pending`），title／aria 表「設定將在下個小節開頭套用」 |
| Pulse 環 | 每個 pulse 一點；正拍帶 `accent-*` class；分組起點 `group-start`；**點擊正拍**循環 strong → medium → weak（`cycleAccentLevel`） |
| Bar progress | 依 `grouping` 比例分塊；當前分組高亮條件與 `meterBeatIndex`、`activeGroupIndex` 一致 |
| Bar / Beat 數字 | `barIndex` 與 `beatIndex`（**pulse 索引**） |

**檢查**

- [ ] 播放中當前 pulse 的點有 `active` 與透明度（與 `flashIntensity` 相關）
- [ ] 暫停時不標示 active pulse（與 `runtime.state === "running"` 條件一致）

### 6.6 Practice Profiles（`profile-list.js`）

| 動作 | 行為 |
|------|------|
| Save Current | `prompt` 名稱 → `saveProfile`（新 id、設為 active、持久化） |
| Duplicate | 複製**當前 active** profile 為「名稱 + Copy」 |
| 點名稱 | `applyProfile` |
| Rename | `prompt` |
| Delete | `confirm`；**builtIn** 按鈕 disabled |

**檢查**

- [ ] 內建三筆存在且不可刪除
- [ ] 自訂 profile 僅自訂項目寫入 `localStorage`

---

## 7. 快捷鍵（`transport-panel.js`）

| 按鍵 | 行為 |
|------|------|
| `Space` | `preventDefault`；`scheduler.toggle()` |
| `ArrowUp` | BPM +1；`Shift` 時 +5 |
| `ArrowDown` | BPM -1；`Shift` 時 -5 |

**檢查**

- [ ] 捲動頁面時 Space 不捲動（有 preventDefault）
- [ ] BPM 落在 20–500

---

## 8. 與 README／計畫文件之差異（驗收備註）

| 項目 | 說明 |
|------|------|
| Count-in | README 曾列；**目前程式無 count-in 狀態或 UI**，`normalizeConfig` 會丟棄 `countInBars` |
| flashIntensity | 存在於 `config`，**無滑桿／輸入**；若要驗收視覺強度需改程式或手動改 storage |
| Pause 語意 | UI 寫「Pause」，再次 Start **重頭播放**，非 resume |

---

## 9. 建議手動測試情境（Checklist）

### 9.1 基本

- [ ] 冷啟動 → Start → 4/4 聲音穩定、無爆音
- [ ] BPM 拖曳與輸入框一致，且播放中可改
- [ ] 暫停 → 再 Start 從第 1 小節開始

### 9.2 拍號與分組

- [ ] 選 7/8 preset → 聽覺與環上 pulse 數一致
- [ ] 播放中改 grouping → 下一小節才變；pending 點亮起
- [ ] 點環上正拍循環 strong/medium/weak，聽覺與 class 一致

### 9.3 Profile

- [ ] Save → 重新整理頁面 → profile 仍在
- [ ] Apply 內建 / 自訂；播放中 apply → 下小節生效
- [ ] Duplicate、Rename、Delete（自訂）

### 9.4 Auto Ramp

- [ ] 開啟後每 N 小節 BPM 增加，不超過 max
- [ ] 達 max 後不再上升

### 9.5 Tap Tempo

- [ ] 連續點擊約等速 → BPM 接近預期

---

## 10. 文件維護

- 改版時：同步更新本文 §3–§6 與常數表。
- 若新增 count-in、flash UI、真正 resume，應**更新對應章節並修正 §8**。

---

*文件版本：依 repository 現況撰寫；路徑：`docs/DESIGN_SPEC.md`。*
