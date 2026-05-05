# hengine 따라하기 — "별잡기" 게임 만들기

이 문서는 hengine을 처음 써보는 분을 위한 단계별 튜토리얼입니다. 위에서 떨어지는 별을 바구니로 받는 간단한 게임을 만들면서 엔진의 핵심 모듈을 한 번씩 다 써봅니다.

> 완성 코드는 [`examples/star-catcher/`](./examples/star-catcher) 에 있습니다. 단계별로 따라가면서 막히면 그쪽을 참조하세요.

## 무엇을 만드나

- 화면 하단의 청록색 막대(바구니)를 좌우 화살표 키로 이동합니다.
- 위에서 노란색 별이 무작위 위치에서 떨어집니다.
- 별을 바구니로 받으면 점수 +10.
- 별을 놓치면 라이프 -1. 라이프가 0이 되면 게임 오버.
- 점수가 오를수록 별 떨어지는 속도와 빈도가 빨라집니다.
- 게임 오버 시 모달이 뜨고 최고 점수가 IndexedDB에 저장됩니다.

만드는 동안 다음 hengine 모듈을 모두 사용합니다.

| 단계 | 사용 모듈 |
| --- | --- |
| 1단계 | `App`, `Scene` |
| 2단계 | `fillRect`, `drawText`, `Layout` |
| 3단계 | `fillRoundRect` |
| 4단계 | `KeyboardInput`, `clamp` |
| 5단계 | `mulberry32`, `randRange`, `drawCircle` |
| 6단계 | (충돌 직접 구현) |
| 7단계 | `Synth`, `NOTE` |
| 8단계 | `Modal`, `IndexedDbStore` |

## 0단계 — 준비

이미 hengine을 빌드해 두었다고 가정합니다. 안 했다면 먼저:

```bash
git clone https://github.com/SeunghwaCho/hengine.git
cd hengine
npm install
npm run build
```

그러면 `dist/index.js`가 생성됩니다. 우리 게임은 여기서 import 합니다.

이제 작업 폴더를 만듭니다.

```bash
cd hengine
mkdir -p examples/my-star-catcher
cd examples/my-star-catcher
```

> 참고: hengine 저장소 안에 만들면 `../../dist/index.js`로 깔끔히 import 할 수 있어 편합니다. 별도 프로젝트에 만들고 싶다면 경로만 맞춰주면 됩니다.

세 개의 파일을 만들 겁니다.

```
my-star-catcher/
├── index.html         (정적 페이지)
├── tsconfig.json      (TypeScript 설정)
└── main.ts            (게임 코드 — 단계별로 채워나감)
```

### index.html

캔버스 하나만 있는 미니멀 페이지입니다. 단계 0부터 마지막까지 이 파일은 안 바꿉니다.

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <title>별잡기 — hengine 튜토리얼</title>
  <style>
    html, body { margin: 0; padding: 0; height: 100%; background: #0b1020; overflow: hidden; }
    #app { position: fixed; inset: 0; }
    canvas { display: block; width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="app"><canvas id="game"></canvas></div>
  <script type="module" src="./main.js"></script>
</body>
</html>
```

> `main.js`(컴파일 결과)를 import 한다는 점에 주의. 우리는 `main.ts`를 작성하고 `tsc`로 컴파일합니다.

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "noUnusedLocals": false
  },
  "files": ["main.ts"]
}
```

### 빌드/실행 사이클

이 흐름을 반복합니다.

```bash
# 1) main.ts 수정 후 컴파일
npx tsc -p tsconfig.json

# 2) 정적 서버 (저장소 루트에서)
cd ../..
python3 -m http.server 8080

# 3) 브라우저에서 열기
# http://localhost:8080/examples/my-star-catcher/
```

브라우저 콘솔도 같이 띄워두면 디버깅이 편합니다.

---

## 1단계 — 빈 검은 화면 띄우기

`App`을 만들고 빈 `Scene`을 붙여서 캔버스만 채워봅니다.

**main.ts**

```ts
import { App, type Scene, type Layout } from "../../dist/index.js";

class GameScene implements Scene {
  draw(ctx: CanvasRenderingContext2D, layout: Layout): void {
    // 아직 그릴 게 없음 — App이 매 프레임 화면을 clearColor로 채워줌
  }
}

const canvas = document.getElementById("game") as HTMLCanvasElement;
const app = new App(canvas, { clearColor: "#0b1020", sizing: "parent" });
app.setScene(new GameScene());
app.start();
```

컴파일 → 새로고침 → **검은 화면(짙은 남색)이 보이면 성공**.

배운 것:

- `App`은 캔버스 하나를 받아서 RAF 루프를 돌리고, `Scene.draw`를 매 프레임 호출합니다.
- `clearColor`는 매 프레임 화면을 청소하는 색.
- `sizing: "parent"`는 캔버스를 부모 요소(`#app`) 크기에 맞춰 자동으로 늘립니다. DPR(고해상도)도 알아서 처리합니다.
- `Scene` 인터페이스에서 필수는 `draw`뿐입니다.

---

## 2단계 — 텍스트와 사각형 그리기

화면에 점수 텍스트와 배경을 그려봅니다. 좌표는 **CSS 픽셀**입니다 (Retina든 일반 모니터든 똑같이 동작).

**main.ts** (변경 부분만)

```ts
import {
  App,
  type Scene,
  type Layout,
  fillRect,
  drawText,
} from "../../dist/index.js";

class GameScene implements Scene {
  private score = 0;

  draw(ctx: CanvasRenderingContext2D, layout: Layout): void {
    // 배경
    fillRect(ctx, { x: 0, y: 0, w: layout.width, h: layout.height }, "#0b1020");

    // HUD 텍스트
    drawText(ctx, `점수 ${this.score}`, 16, 28, { color: "#f8fafc", size: 18 });
    drawText(ctx, "← → 로 이동", layout.width / 2, 28, {
      color: "#94a3b8", size: 14, align: "center",
    });
  }
}

const canvas = document.getElementById("game") as HTMLCanvasElement;
const app = new App(canvas, { clearColor: "#0b1020", sizing: "parent" });
app.setScene(new GameScene());
app.start();
```

배운 것:

- `layout.width / layout.height`는 CSS 픽셀 단위 캔버스 크기.
- `fillRect`, `drawText`는 자주 쓰는 캔버스 호출을 짧게 줄여놓은 헬퍼.
- 텍스트 정렬(`align`)은 `"left" | "center" | "right"` 그대로 쓰면 됩니다.

---

## 3단계 — 플레이어(바구니) 그리기

화면 하단에 둥근 막대 모양으로 플레이어를 그립니다. 위치 변수는 `playerX`로 시작.

```ts
import {
  App,
  type Scene,
  type Layout,
  fillRect,
  fillRoundRect,
  drawText,
} from "../../dist/index.js";

const PLAYER_W = 90;
const PLAYER_H = 18;

class GameScene implements Scene {
  private playerX = 0;
  private score = 0;

  update(_dt: number, layout: Layout): void {
    // 첫 프레임에서 플레이어를 화면 중앙에 배치
    if (this.playerX === 0) {
      this.playerX = layout.width / 2 - PLAYER_W / 2;
    }
  }

  draw(ctx: CanvasRenderingContext2D, layout: Layout): void {
    fillRect(ctx, { x: 0, y: 0, w: layout.width, h: layout.height }, "#0b1020");

    const playerY = layout.height - 60;
    fillRoundRect(ctx, this.playerX, playerY, PLAYER_W, PLAYER_H, 8, "#22d3ee");

    drawText(ctx, `점수 ${this.score}`, 16, 28, { color: "#f8fafc", size: 18 });
  }
}

const canvas = document.getElementById("game") as HTMLCanvasElement;
const app = new App(canvas, { clearColor: "#0b1020", sizing: "parent" });
app.setScene(new GameScene());
app.start();
```

배운 것:

- `Scene.update(dt, layout)`은 매 프레임 호출되며, 게임 상태를 갱신할 곳입니다. `dt`는 초 단위.
- 화면 크기는 매 프레임 바뀔 수 있으므로 (윈도우 리사이즈), `layout`은 매번 받아쓰는 게 안전합니다.
- `fillRoundRect`는 `(ctx, x, y, w, h, radius, fillColor)`. radius로 모서리 둥글기 조절.

---

## 4단계 — 키보드로 움직이기

`KeyboardInput`을 붙여서 좌우 키로 플레이어를 움직입니다.

```ts
import {
  App,
  type Scene,
  type Layout,
  KeyboardInput,
  fillRect,
  fillRoundRect,
  drawText,
  clamp,
} from "../../dist/index.js";

const PLAYER_W = 90;
const PLAYER_H = 18;
const PLAYER_SPEED = 520;   // px/sec

const kb = new KeyboardInput();

class GameScene implements Scene {
  private playerX = 0;
  private score = 0;

  enter(): void {
    kb.attach();           // 씬이 시작되면 키보드 이벤트 리스너 부착
  }

  leave(): void {
    kb.detach();
  }

  update(dt: number, layout: Layout): void {
    if (this.playerX === 0) this.playerX = layout.width / 2 - PLAYER_W / 2;

    if (kb.isDown("ArrowLeft") || kb.isDown("KeyA")) this.playerX -= PLAYER_SPEED * dt;
    if (kb.isDown("ArrowRight") || kb.isDown("KeyD")) this.playerX += PLAYER_SPEED * dt;
    this.playerX = clamp(this.playerX, 0, layout.width - PLAYER_W);

    kb.endFrame();
  }

  draw(ctx: CanvasRenderingContext2D, layout: Layout): void {
    fillRect(ctx, { x: 0, y: 0, w: layout.width, h: layout.height }, "#0b1020");
    const playerY = layout.height - 60;
    fillRoundRect(ctx, this.playerX, playerY, PLAYER_W, PLAYER_H, 8, "#22d3ee");
    drawText(ctx, `점수 ${this.score}`, 16, 28, { color: "#f8fafc", size: 18 });
  }
}

const canvas = document.getElementById("game") as HTMLCanvasElement;
const app = new App(canvas, { clearColor: "#0b1020", sizing: "parent" });
app.setScene(new GameScene());
app.start();
```

배운 것:

- `Scene.enter / leave`는 씬 라이프사이클 훅. 리스너 부착/해제에 적합.
- `KeyboardInput`은 **폴링 방식**입니다 — `isDown(code)`을 매 프레임 물어봅니다. 이벤트 콜백 방식이 아닙니다.
- `dt`(초)에 속도(px/sec)를 곱해서 이동량을 계산하면 프레임 레이트와 무관하게 일정한 속도가 됩니다.
- `clamp(value, lo, hi)`로 화면 밖으로 못 나가게 막습니다.
- `kb.endFrame()`은 **매 프레임 끝에 한 번** 부르는 게 좋습니다 — `wasPressed` 같은 엣지 상태가 다음 프레임으로 넘어가지 않도록 청소해줍니다.

---

## 5단계 — 별이 떨어지기

별 하나는 `{ x, y, vy, alive }` 형태의 데이터입니다. 일정 시간마다 새 별을 위에서 무작위 X 위치로 만들고, 매 프레임 아래로 움직입니다.

```ts
import {
  App,
  type Scene,
  type Layout,
  KeyboardInput,
  fillRect,
  fillRoundRect,
  drawText,
  drawCircle,
  clamp,
  mulberry32,
  randRange,
  type Rng,
} from "../../dist/index.js";

interface Star {
  x: number;
  y: number;
  vy: number;
  alive: boolean;
}

const PLAYER_W = 90;
const PLAYER_H = 18;
const PLAYER_SPEED = 520;
const STAR_RADIUS = 10;
const SPAWN_INTERVAL = 0.7;   // 별이 새로 생기는 간격 (초)

const kb = new KeyboardInput();

class GameScene implements Scene {
  private playerX = 0;
  private stars: Star[] = [];
  private spawnTimer = 0;
  private rng: Rng = mulberry32(Date.now() & 0xffffffff);

  enter(): void { kb.attach(); }
  leave(): void { kb.detach(); }

  private spawnStar(layout: Layout): void {
    const x = randRange(this.rng, STAR_RADIUS + 10, layout.width - STAR_RADIUS - 10);
    const vy = randRange(this.rng, 160, 260);  // 떨어지는 속도 px/sec
    this.stars.push({ x, y: -STAR_RADIUS, vy, alive: true });
  }

  update(dt: number, layout: Layout): void {
    if (this.playerX === 0) this.playerX = layout.width / 2 - PLAYER_W / 2;

    // 이동
    if (kb.isDown("ArrowLeft") || kb.isDown("KeyA")) this.playerX -= PLAYER_SPEED * dt;
    if (kb.isDown("ArrowRight") || kb.isDown("KeyD")) this.playerX += PLAYER_SPEED * dt;
    this.playerX = clamp(this.playerX, 0, layout.width - PLAYER_W);

    // 별 스폰
    this.spawnTimer += dt;
    while (this.spawnTimer >= SPAWN_INTERVAL) {
      this.spawnTimer -= SPAWN_INTERVAL;
      this.spawnStar(layout);
    }

    // 별 낙하
    for (const s of this.stars) {
      if (!s.alive) continue;
      s.y += s.vy * dt;
      if (s.y - STAR_RADIUS > layout.height) s.alive = false; // 화면 밖이면 제거
    }
    this.stars = this.stars.filter((s) => s.alive);

    kb.endFrame();
  }

  draw(ctx: CanvasRenderingContext2D, layout: Layout): void {
    fillRect(ctx, { x: 0, y: 0, w: layout.width, h: layout.height }, "#0b1020");

    for (const s of this.stars) drawCircle(ctx, s.x, s.y, STAR_RADIUS, "#fbbf24");

    const playerY = layout.height - 60;
    fillRoundRect(ctx, this.playerX, playerY, PLAYER_W, PLAYER_H, 8, "#22d3ee");

    drawText(ctx, `별 ${this.stars.length}`, 16, 28, { color: "#f8fafc", size: 18 });
  }
}

const canvas = document.getElementById("game") as HTMLCanvasElement;
const app = new App(canvas, { clearColor: "#0b1020", sizing: "parent" });
app.setScene(new GameScene());
app.start();
```

새로고침하면 별이 위에서 계속 떨어지는 게 보입니다.

배운 것:

- `mulberry32(seed)`는 시드 기반 PRNG를 만들어줍니다. `Math.random` 대신 쓰면 같은 시드로 재현 가능한 게임 진행이 가능합니다.
- `randRange(rng, min, max)`는 `[min, max)` 범위의 실수를 줍니다.
- 누적기(accumulator) 패턴: `spawnTimer += dt; while (spawnTimer >= interval) { spawn(); spawnTimer -= interval; }` — 프레임 드랍이 있어도 누적된 만큼 스폰을 따라잡습니다.

---

## 6단계 — 별 받기 / 놓치기 (충돌 + 점수 + 라이프)

별이 플레이어 사각형에 닿으면 점수, 화면 아래로 떨어지면 라이프 차감.

`update()` 안의 별 낙하 부분을 이렇게 바꿉니다.

```ts
// 변경 전: 별이 화면 밖으로 떨어지면 alive = false 만 시켰음
// 변경 후: 충돌 검사 + 라이프/점수 처리 추가

const playerY = layout.height - 60;
for (const s of this.stars) {
  if (!s.alive) continue;
  s.y += s.vy * dt;

  // (1) 플레이어와 닿았는가?
  const inX = s.x >= this.playerX && s.x <= this.playerX + PLAYER_W;
  const inY = s.y + STAR_RADIUS >= playerY && s.y - STAR_RADIUS <= playerY + PLAYER_H;
  if (inX && inY) {
    s.alive = false;
    this.score += 10;
    continue;
  }

  // (2) 화면 아래로 빠졌는가?
  if (s.y - STAR_RADIUS > layout.height) {
    s.alive = false;
    this.lives--;
  }
}
this.stars = this.stars.filter((s) => s.alive);
```

위에 `private score = 0; private lives = 3;` 선언, `draw()`에서 점수/라이프 텍스트 표시, 충돌 검사를 함께 추가합니다.

이 단계의 전체 `update`/`draw`만 한 번에 보이면:

```ts
update(dt: number, layout: Layout): void {
  if (this.playerX === 0) this.playerX = layout.width / 2 - PLAYER_W / 2;

  if (kb.isDown("ArrowLeft") || kb.isDown("KeyA")) this.playerX -= PLAYER_SPEED * dt;
  if (kb.isDown("ArrowRight") || kb.isDown("KeyD")) this.playerX += PLAYER_SPEED * dt;
  this.playerX = clamp(this.playerX, 0, layout.width - PLAYER_W);

  this.spawnTimer += dt;
  while (this.spawnTimer >= SPAWN_INTERVAL) {
    this.spawnTimer -= SPAWN_INTERVAL;
    this.spawnStar(layout);
  }

  const playerY = layout.height - 60;
  for (const s of this.stars) {
    if (!s.alive) continue;
    s.y += s.vy * dt;

    const inX = s.x >= this.playerX && s.x <= this.playerX + PLAYER_W;
    const inY = s.y + STAR_RADIUS >= playerY && s.y - STAR_RADIUS <= playerY + PLAYER_H;
    if (inX && inY) {
      s.alive = false;
      this.score += 10;
      continue;
    }
    if (s.y - STAR_RADIUS > layout.height) {
      s.alive = false;
      this.lives--;
    }
  }
  this.stars = this.stars.filter((s) => s.alive);

  kb.endFrame();
}

draw(ctx: CanvasRenderingContext2D, layout: Layout): void {
  fillRect(ctx, { x: 0, y: 0, w: layout.width, h: layout.height }, "#0b1020");
  for (const s of this.stars) drawCircle(ctx, s.x, s.y, STAR_RADIUS, "#fbbf24");

  const playerY = layout.height - 60;
  fillRoundRect(ctx, this.playerX, playerY, PLAYER_W, PLAYER_H, 8, "#22d3ee");

  drawText(ctx, `점수 ${this.score}`, 16, 28, { color: "#f8fafc", size: 18 });
  drawText(ctx, `라이프 ${this.lives}`, layout.width - 16, 28, {
    color: "#f8fafc", size: 18, align: "right",
  });
}
```

배운 것:

- 게임의 충돌 판정은 굳이 라이브러리가 필요 없습니다 — 사각형-점 검사 같은 단순 산술 몇 줄이면 충분.
- `filter`로 죽은 별을 정기적으로 청소해서 배열이 무한히 자라지 않게 합니다.

---

## 7단계 — 사운드 (Synth)

별을 받으면 "띵", 놓치면 "치익" 소리를 냅니다. 외부 사운드 파일 없이 `Synth`로 즉석에서 만듭니다.

위에 import 한 줄과 인스턴스를 추가:

```ts
import {
  // ... 기존 것들
  Synth,
  NOTE,
} from "../../dist/index.js";

const sound = new Synth();
```

브라우저 정책 때문에 사용자 입력 전에는 `AudioContext`를 열 수 없습니다. 첫 키 입력에서 컨텍스트를 깨워줍니다.

```ts
class GameScene implements Scene {
  // ... 기존 필드들

  onKeyDown(): void {
    sound.ensureCtx();
    sound.resume();
  }

  onDown(): void {
    sound.ensureCtx();
    sound.resume();
  }
}
```

그리고 `update()` 안 충돌 처리에 사운드 추가:

```ts
if (inX && inY) {
  s.alive = false;
  this.score += 10;
  sound.tone({ freq: NOTE.E5, duration: 0.06, type: "triangle", gain: 0.18 });
  continue;
}
if (s.y - STAR_RADIUS > layout.height) {
  s.alive = false;
  this.lives--;
  sound.noise(0.12, 0.18);
}
```

배운 것:

- `Synth.tone({ freq, duration, type, gain })`로 사인/스퀘어/트라이앵글 톤을 즉석에서 칩니다.
- `NOTE.E5` 같은 미리 정의된 음 주파수를 쓸 수 있습니다.
- `Synth.noise(duration, gain)`은 화이트 노이즈 한 방 — 파괴음/타격음에 잘 어울립니다.
- 첫 사용자 입력에서 `ensureCtx()` + `resume()`을 안 부르면 소리가 안 납니다 (브라우저 autoplay policy).

---

## 8단계 — 게임 오버 모달 + 하이스코어 영속화

라이프 0이 되면 모달을 띄우고, 그 시점에 최고 점수를 IndexedDB에 저장.

```ts
import {
  // ... 기존 것들
  Modal,
  IndexedDbStore,
} from "../../dist/index.js";

interface Save { highScore: number; }
const SAVE_KEY = "starcatcher.save";
const store = new IndexedDbStore({ dbName: "myhengine.starcatcher" });
```

씬에 모달 필드 + 로드/저장 헬퍼 추가:

```ts
class GameScene implements Scene {
  // ...
  private highScore = 0;
  private modal: Modal | null = null;

  enter(): void {
    kb.attach();
    void this.loadHighScore();
  }

  private async loadHighScore(): Promise<void> {
    await store.init();
    const save = await store.get<Save>(SAVE_KEY);
    if (save && typeof save.highScore === "number") this.highScore = save.highScore;
  }

  private async saveHighScore(): Promise<void> {
    await store.set(SAVE_KEY, { highScore: this.highScore } satisfies Save);
  }

  private resetGame(layout: Layout): void {
    this.score = 0;
    this.lives = 3;
    this.stars = [];
    this.spawnTimer = 0;
    this.playerX = layout.width / 2 - PLAYER_W / 2;
    this.modal = null;
  }

  private openGameOver(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      void this.saveHighScore();
    }
    this.modal = new Modal({
      title: "게임 오버",
      message: `점수: ${this.score}    최고: ${this.highScore}`,
      actions: [
        {
          label: "다시 시작",
          onPress: () => {
            // 레이아웃이 필요하므로 update에서 reset 호출하도록 플래그만 세움
            this.modal = null;
            this.score = 0;
            this.lives = 3;
            this.stars = [];
            this.spawnTimer = 0;
          },
        },
      ],
    });
  }
}
```

`update()`에서 모달이 열려 있으면 게임 진행을 멈추고 모달 레이아웃만 갱신:

```ts
update(dt: number, layout: Layout): void {
  if (this.modal) {
    this.modal.setLayout(layout);
    kb.endFrame();
    return;
  }

  // ... 기존 update 로직 그대로 ...

  // 라이프 0 검사
  for (const s of this.stars) {
    // ...
    if (s.y - STAR_RADIUS > layout.height) {
      s.alive = false;
      this.lives--;
      sound.noise(0.12, 0.18);
      if (this.lives <= 0) this.openGameOver();
    }
  }
  // ...
}
```

`draw()` 마지막에 모달 그리기 추가:

```ts
draw(ctx: CanvasRenderingContext2D, layout: Layout): void {
  // ... 기존 그리기 ...
  if (this.modal) this.modal.draw(ctx, layout);
}
```

`onDown / onMove / onUp`에서 모달에게 입력 전달:

```ts
onDown(x: number, y: number): void {
  sound.ensureCtx();
  sound.resume();
  if (this.modal) this.modal.onDown(x, y);
}
onMove(x: number, y: number): void {
  if (this.modal) this.modal.onMove(x, y);
}
onUp(x: number, y: number): void {
  if (this.modal) this.modal.onUp(x, y);
}
```

배운 것:

- `Modal`은 캔버스 위에 직접 그려지는 위젯입니다. DOM 요소를 새로 만들지 않습니다.
- 모달이 떠 있는 동안에는 게임 업데이트를 건너뛰는 게 보통입니다.
- `IndexedDbStore`는 IndexedDB를 못 쓰는 환경(시크릿 모드 등)에서 자동으로 메모리 폴백으로 떨어집니다 — 코드는 그대로 동작하고, 새로고침 시에만 데이터가 사라집니다.
- `await store.init()`은 한 번만 부르면 됩니다. 여러 번 불러도 안전 (no-op 처리됨).

---

## 9단계 — 완성본 + 살짝의 polish

위에 나온 조각들을 모두 합치고, 점수가 올라갈수록 별이 더 빨리 떨어지도록 난이도를 추가합니다.

**최종 main.ts** (그대로 복사하면 동작합니다)

```ts
import {
  App,
  type Scene,
  type Layout,
  KeyboardInput,
  Synth,
  NOTE,
  Modal,
  IndexedDbStore,
  fillRect,
  fillRoundRect,
  drawText,
  drawCircle,
  clamp,
  mulberry32,
  randRange,
  type Rng,
} from "../../dist/index.js";

interface Star {
  x: number;
  y: number;
  vy: number;
  alive: boolean;
}

interface Save {
  highScore: number;
}

const PLAYER_W = 90;
const PLAYER_H = 18;
const PLAYER_SPEED = 520;
const STAR_RADIUS = 10;
const SPAWN_INTERVAL = 0.7;
const MIN_SPAWN_INTERVAL = 0.25;
const SAVE_KEY = "starcatcher.save";

const sound = new Synth();
const kb = new KeyboardInput();
const store = new IndexedDbStore({ dbName: "hengine.starcatcher" });

class GameScene implements Scene {
  private playerX = 0;
  private stars: Star[] = [];
  private spawnTimer = 0;
  private spawnInterval = SPAWN_INTERVAL;
  private score = 0;
  private highScore = 0;
  private lives = 3;
  private rng: Rng = mulberry32(Date.now() & 0xffffffff);
  private modal: Modal | null = null;
  private lastLayout: Layout | null = null;

  enter(): void {
    kb.attach();
    void this.loadHighScore();
  }

  leave(): void {
    kb.detach();
  }

  private async loadHighScore(): Promise<void> {
    await store.init();
    const save = await store.get<Save>(SAVE_KEY);
    if (save && typeof save.highScore === "number") this.highScore = save.highScore;
  }

  private async saveHighScore(): Promise<void> {
    await store.set(SAVE_KEY, { highScore: this.highScore } satisfies Save);
  }

  private spawnStar(layout: Layout): void {
    const x = randRange(this.rng, STAR_RADIUS + 10, layout.width - STAR_RADIUS - 10);
    const vy = randRange(this.rng, 160, 260) + this.score * 1.2;
    this.stars.push({ x, y: -STAR_RADIUS, vy, alive: true });
  }

  private resetGame(layout: Layout): void {
    this.score = 0;
    this.lives = 3;
    this.stars = [];
    this.spawnTimer = 0;
    this.spawnInterval = SPAWN_INTERVAL;
    this.playerX = layout.width / 2 - PLAYER_W / 2;
    this.modal = null;
  }

  private openGameOver(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      void this.saveHighScore();
    }
    this.modal = new Modal({
      title: "게임 오버",
      message: `점수: ${this.score}    최고: ${this.highScore}`,
      actions: [
        {
          label: "다시 시작",
          onPress: () => {
            if (this.lastLayout) this.resetGame(this.lastLayout);
          },
        },
      ],
    });
  }

  update(dt: number, layout: Layout): void {
    this.lastLayout = layout;
    if (this.playerX === 0 && this.score === 0 && this.lives === 3) {
      this.playerX = layout.width / 2 - PLAYER_W / 2;
    }
    if (this.modal) {
      this.modal.setLayout(layout);
      kb.endFrame();
      return;
    }

    if (kb.isDown("ArrowLeft") || kb.isDown("KeyA")) this.playerX -= PLAYER_SPEED * dt;
    if (kb.isDown("ArrowRight") || kb.isDown("KeyD")) this.playerX += PLAYER_SPEED * dt;
    this.playerX = clamp(this.playerX, 0, layout.width - PLAYER_W);

    this.spawnTimer += dt;
    while (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer -= this.spawnInterval;
      this.spawnStar(layout);
    }
    this.spawnInterval = Math.max(MIN_SPAWN_INTERVAL, SPAWN_INTERVAL - this.score * 0.005);

    const playerY = layout.height - 60;
    for (const s of this.stars) {
      if (!s.alive) continue;
      s.y += s.vy * dt;

      const inX = s.x >= this.playerX && s.x <= this.playerX + PLAYER_W;
      const inY = s.y + STAR_RADIUS >= playerY && s.y - STAR_RADIUS <= playerY + PLAYER_H;
      if (inX && inY) {
        s.alive = false;
        this.score += 10;
        sound.tone({ freq: NOTE.E5, duration: 0.06, type: "triangle", gain: 0.18 });
        continue;
      }
      if (s.y - STAR_RADIUS > layout.height) {
        s.alive = false;
        this.lives--;
        sound.noise(0.12, 0.18);
        if (this.lives <= 0) this.openGameOver();
      }
    }
    this.stars = this.stars.filter((s) => s.alive);

    kb.endFrame();
  }

  draw(ctx: CanvasRenderingContext2D, layout: Layout): void {
    fillRect(ctx, { x: 0, y: 0, w: layout.width, h: layout.height }, "#0b1020");

    for (const s of this.stars) {
      drawCircle(ctx, s.x, s.y, STAR_RADIUS, "#fbbf24");
    }

    const playerY = layout.height - 60;
    fillRoundRect(ctx, this.playerX, playerY, PLAYER_W, PLAYER_H, 8, "#22d3ee");

    drawText(ctx, `점수 ${this.score}`, 16, 28, { color: "#f8fafc", size: 18 });
    drawText(ctx, `최고 ${this.highScore}`, layout.width / 2, 28, {
      color: "#cbd5e1", size: 16, align: "center",
    });
    drawText(ctx, `라이프 ${this.lives}`, layout.width - 16, 28, {
      color: "#f8fafc", size: 18, align: "right",
    });

    if (!this.modal && this.score === 0) {
      drawText(ctx, "← → 또는 A/D 로 이동", layout.width / 2, layout.height - 100, {
        color: "#94a3b8", size: 14, align: "center",
      });
    }

    if (this.modal) this.modal.draw(ctx, layout);
  }

  onDown(x: number, y: number): void {
    sound.ensureCtx();
    sound.resume();
    if (this.modal) this.modal.onDown(x, y);
  }

  onMove(x: number, y: number): void {
    if (this.modal) this.modal.onMove(x, y);
  }

  onUp(x: number, y: number): void {
    if (this.modal) this.modal.onUp(x, y);
  }

  onKeyDown(): void {
    sound.ensureCtx();
    sound.resume();
  }
}

const canvas = document.getElementById("game") as HTMLCanvasElement;
const app = new App(canvas, { clearColor: "#0b1020", sizing: "parent" });
app.setScene(new GameScene());
app.start();
```

---

## 다음에 도전해볼 거리

엔진의 다른 모듈도 한 번씩 써보고 싶다면:

- **모바일 대응**: `Joystick`을 추가해서 화면 하단에 가상 조이스틱을 그리고, 터치로 좌우 이동.
- **카메라**: `Camera`로 화면을 살짝 흔들면 (히트 피드백) 게임이 더 박력있어집니다. 별을 받았을 때 카메라를 짧게 흔들어보세요.
- **이미지 사용**: `AssetLoader`로 별 PNG를 로드해서 `drawCircle` 대신 이미지로 그리기.
- **시드 입력**: URL 쿼리스트링으로 시드를 받아 `mulberry32(seed)`에 넣으면 데일리 챌린지 같은 재현 가능한 모드가 됩니다.
- **씬 분리**: 메뉴 씬 → 게임 씬 → 결과 씬으로 쪼개고 `app.setScene()`으로 전환. (현재는 한 씬에서 모달로 처리)
- **공간 격자**: 별이 100개 이상으로 늘어나면 `SpatialGrid`로 광역 충돌을 빠르게 좁힐 수 있습니다 (지금 정도 규모에선 불필요).

---

## 디버깅 팁

| 증상 | 원인 / 해결 |
| --- | --- |
| 화면이 까맣게만 나옴 | `app.start()` 빠뜨림? `Scene.draw`에서 예외? 콘솔 확인. |
| 흐릿하게 보임 | `App` 안 쓰고 캔버스 직접 다루는 경우. `App`이 DPR을 자동 처리하니 그대로 사용 권장. |
| 키 입력 안 먹음 | `kb.attach()` 안 부름? `Scene.enter()`에서 부르면 안전. |
| 소리 안 남 | 첫 사용자 입력 전에는 안 납니다 — `onDown / onKeyDown`에서 `sound.ensureCtx() + sound.resume()` 호출했는지 확인. |
| 새로고침해도 점수가 안 남음 | `await store.init()` 안 부름? `set()` 후 await 빠짐? 시크릿 모드면 폴백 모드라 일부러 안 남기는 정상 동작 (`store.isUsingFallback()` 로 확인 가능). |
| 별이 너무 빠르거나 느림 | `randRange`의 `vy` 범위 조정. 어렵게 하려면 `vy + this.score * 1.2`처럼 점수에 비례해 가속. |

---

## 정리

여기까지 따라왔다면 hengine의 다음 영역을 모두 한 번씩 사용한 셈입니다.

- `App` + `Scene` 라이프사이클
- 캔버스 그리기 헬퍼 (`fillRect`, `fillRoundRect`, `drawCircle`, `drawText`)
- `KeyboardInput` 폴링 입력
- `Synth` Web Audio 신디사이즈 + `NOTE` 음 상수
- `IndexedDbStore` 영속 저장 (자동 메모리 폴백)
- `Modal` 캔버스 위젯
- `mulberry32` 시드 RNG, `randRange`
- `clamp` 같은 기하 헬퍼

엔진 자체가 작아서 `src/` 안의 파일을 직접 열어보면 모든 동작을 추적할 수 있습니다. 다음에 뭘 만들고 싶다면 그게 출발점입니다.

게임은 작게 시작해서, 재미있는 부분만 살을 붙여가세요. Have fun!
