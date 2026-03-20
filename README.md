# Web Practice Metronome

音樂練習用的網頁節拍器

- 穩定 Web Audio 排程（lookahead scheduler）
- Odd meter（`5/4`, `7/8`, `9/8`, `11/8`）與 grouping 編輯
- Accent pattern（strong / medium / weak）
- Profile 儲存（localStorage）
- Count-in、Tap Tempo、Auto Ramp、快捷鍵
- 基本視覺化（拍點環、小節分組進度、Bar/Beat 計數）

![Metronome UI Example](docs/ui-sample.png)


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


## 佈署與開發

### 開發

在專案根目錄執行：

```bash
cd <project_path>/metronome
python3 -m http.server 5173
```

打開：

- [http://localhost:5173](http://localhost:5173)


### 佈署正式化服務 with Docker

> 請先安裝 Docker

一鍵執行（build + run）：

```bash
cd <project_path>/metronome
./build/start.sh
```

手動流程：

1) 設定 port，在 `./build/env.config`（可不改，預設 `8080`）：

```bash
PROD_PORT=8080
```

2) 啟動正式容器：

```bash
cd <project_path>/metronome/build
docker build -f Dockerfile -t metronome:prod ..
source env.config
docker run --rm -p "${PROD_PORT}:80" --name metronome-prod metronome:prod
```

服務會開在：

- [http://localhost:8080](http://localhost:8080)

停止正式容器：

```bash
cd <project_path>/metronome
./build/stop.sh
```


