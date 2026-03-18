---
name: web節拍器詳細規格
overview: 定義進階版 Web 節拍器的完整功能規格，聚焦你選的固定 BPM 與不規則拍號訓練，並提供可直接切成實作任務的 UI 分布與技術邊界。
todos:
  - id: define-domain-models
    content: 定義 MetronomeConfig 與 PracticeProfile 資料模型與預設值
    status: completed
  - id: build-audio-scheduler
    content: 實作 Web Audio lookahead scheduler 與 accent click 聲音層
    status: completed
  - id: implement-main-ui-layout
    content: 完成桌面三欄與行動單欄的響應式 UI 分布
    status: completed
  - id: implement-odd-meter-editor
    content: 完成拍號與 grouping 編輯器，支援 5/4、7/8 常用預設
    status: completed
  - id: implement-profiles
    content: 完成 Practice Profile 的 CRUD 與 localStorage 持久化
    status: completed
  - id: add-advanced-controls
    content: 加入 count-in、tap tempo、auto ramp 與快捷鍵
    status: completed
  - id: qa-acceptance
    content: 依驗收條件做功能測試與邊界測試
    status: completed
isProject: false
---

# Web 節拍器 Detailed Spec（Advanced）

## 產品目標

- 核心價值：提供「穩定、低延遲、可視化清楚」的練習節拍器。
- 這一版優先：`固定 BPM` + `不規則拍號（5/4, 7/8...）` + `可儲存多場景設定`。
- 成功標準：
  - 啟動到出聲 < 100ms（warm state）
  - 長時間播放（10 分鐘）節拍偏移不可感知（以 AudioContext 時鐘排程）
  - 主要操作（改 BPM、改拍號、Start/Stop）1-2 次點擊可達

## 功能 Spec（MVP+）

### 1) Transport 與節拍核心

- Start / Stop / Tap Tempo。
- BPM 範圍：`20-500`，支援 slider + number input（可鍵盤微調）。
- 拍號：
  - 分子（beats per bar）：`1-16`
  - 分母（beat unit）：`2, 4, 8, 16`
- 小節與拍計數：顯示 `barIndex` / `beatIndex`。
- 重拍 accent：
  - 第 1 拍預設強音
  - 可切換「自訂 accent pattern」例如 `強-弱-中-弱-弱`

### 2) 不規則拍號訓練（主打）

- Preset 快選：`5/4`, `7/8`, `9/8`, `11/8`。
- Grouping 編輯（關鍵）：
  - 例：`7/8 = 2+2+3`、`5/4 = 3+2`
  - 每組第一拍自動 accent（可覆寫）
- 視覺上以「分組區塊」而非只顯示拍點，讓練習者快速抓 phrasing。

### 3) 聲音與節奏顯示

- Click 聲音三層：`accent`、`normal`、`subtle/ghost`，各自音量可調。
- 聲音庫：至少 2 套（Classic Click / Woodblock）。
- 視覺化：
  - 圓形脈衝環（當前拍高亮）
  - 條狀小節進度（分組著色）
  - 數字倒數（下一小節還幾拍）
- 閃爍強度可調（避免干擾）。

### 4) 場景設定（多應用場景）

- 可儲存 `Practice Profile`：
  - 名稱、BPM、拍號、grouping、accent pattern、音色、音量
- Profile 操作：新增 / 複製 / 重新命名 / 刪除 / 套用。
- 內建模板：
  - `Warmup 4/4 @ 80`
  - `Odd 7/8 (2+2+3) @ 90`
  - `Odd 5/4 (3+2) @ 72`

### 5) 進階互動（Advanced 必要）

- 倒數預備：`1-2 bars count-in`。
- 自動速度變化（選配但建議本版納入）：
  - 每 `N` 小節 +`X` BPM，含上限。
- 快捷鍵：
  - `Space` Start/Stop
  - `↑/↓` BPM ±1
  - `Shift+↑/↓` BPM ±5

## UI 分布規劃

### 桌面版（>= 1024）

- 版面：三欄式
  - 左欄（20%）：Profile 清單與模板
  - 中欄（55%）：主要可視化 + Transport
  - 右欄（25%）：拍號 / grouping / 聲音細節
- 中欄細分：
  - 上：大顯示（BPM、Time Signature、目前拍）
  - 中：圓形拍點 + 小節進度條（分組色塊）
  - 下：Start/Stop、Tap Tempo、Count-in、Auto Ramp

### 平板/手機版（< 1024）

- 版面：單欄堆疊 + 底部固定 Transport
  1. 當前狀態卡（BPM、拍號、分組）
  2. 主視覺化區（圓形拍點）
  3. 可摺疊面板：
    - 拍號與 grouping
    - 聲音設定
    - Profile 管理
  4. 底部固定控制列（Start/Stop、Tap、BPM ±）

## 互動與狀態機

- 狀態：`idle` / `countIn` / `running` / `paused`。
- 規則：
  - `idle -> countIn -> running`
  - `running -> paused -> running`
  - 參數更新策略：
    - BPM：即時套用（下個 click 生效）
    - 拍號/grouping：預設下個小節生效（避免當前小節錯亂）
- 安全邏輯：播放中變更 grouping 時，先預覽再套用。

## 資料模型（前端）

- `MetronomeConfig`
  - `bpm`, `timeSigNumerator`, `timeSigDenominator`
  - `grouping: number[]`
  - `accentPattern: ('strong'|'medium'|'weak')[]`
  - `soundSet`, `volumeAccent`, `volumeNormal`, `volumeGhost`
  - `countInBars`, `autoRamp`
- `PracticeProfile`
  - `id`, `name`, `config`, `updatedAt`
- 儲存：`localStorage`（本版），後續可升級雲端同步。

## 技術實作建議（可直接切工）

- 音訊引擎：Web Audio API + lookahead scheduler（setInterval 只負責排程，不直接發聲）。
- 視覺化同步：以音訊時鐘推導當前拍，避免只靠 UI timer 造成漂移。
- 建議檔案切分：
  - [src/audio/scheduler.ts](/home/tsai/Project/metronome/src/audio/scheduler.ts)
  - [src/audio/click-voices.ts](/home/tsai/Project/metronome/src/audio/click-voices.ts)
  - [src/state/metronome-store.ts](/home/tsai/Project/metronome/src/state/metronome-store.ts)
  - [src/components/transport-panel.tsx](/home/tsai/Project/metronome/src/components/transport-panel.tsx)
  - [src/components/beat-visualizer.tsx](/home/tsai/Project/metronome/src/components/beat-visualizer.tsx)
  - [src/components/grouping-editor.tsx](/home/tsai/Project/metronome/src/components/grouping-editor.tsx)
  - [src/components/profile-list.tsx](/home/tsai/Project/metronome/src/components/profile-list.tsx)

## 驗收條件（你可以直接拿來測）

- 4/4 @120 播放 5 分鐘，聽感無明顯飄移。
- 切換 `7/8 (2+2+3)` 時，視覺分組與 accent 一致。
- 播放中調 BPM，1 拍內聽到改變。
- 播放中改拍號，於下小節切換且無爆音。
- 可建立至少 5 個 Profile 並重開頁面後仍存在。

## 風險與對策

- 瀏覽器節流（背景分頁）導致 UI 更新不穩：音訊保持，UI 降頻更新。
- 行動端首次無聲（自動播放限制）：首次必須由使用者手勢啟動 AudioContext。
- 高 BPM + 複雜視覺化效能壓力：視覺動畫與音訊排程解耦，必要時降級動畫。

