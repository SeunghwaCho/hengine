# hengine

외부 의존성이 전혀 없는 TypeScript + HTML5 Canvas 2D 게임 엔진. 브라우저 표준 API만 사용 — React, Phaser, PixiJS 같은 프레임워크/엔진 없음, 번들러도 필요 없음.

여러 개의 작은 TypeScript 캔버스 게임을 만들면서 반복적으로 등장한 패턴을 추려 한곳에 모았습니다. DPR 대응 캔버스/RAF 루프, 씬 라이프사이클, 포인터 + 키보드 입력, Web Audio 기반 절차적 사운드, IndexedDB 영속화(메모리 폴백 포함), 캔버스 렌더링 UI 위젯 몇 가지를 포함합니다.

[English README](./README.md)

## 왜 만들었나

작은 캔버스 게임 대부분은 같은 배관(plumbing) 코드를 매번 다시 작성합니다. 고해상도 리사이즈 핸들러, 고정 타임스텝 루프, Scene 추상화, 단순 효과음용 신디사이저, 메모리 폴백을 갖춘 IndexedDB 저장소. hengine은 이 배관을 추출해서 다음 게임을 시작할 때 곧장 "게임 플레이 그리기"부터 들어갈 수 있게 합니다.

의도적으로 유지한 제약:

- **외부 런타임 의존성 0개**. `package.json`의 의존성에는 `typescript`(devDependency)만 있습니다.
- **순수 ES2020 모듈**. 어떤 정적 서버에서도 동작하고, 번들러가 필요 없습니다.
- **TypeScript 우선**. `strict` 모드, 모든 공개 API에 강한 타입.
- **`localStorage` 사용 금지** — IndexedDB(자동 폴백 포함)로 대체합니다.

## 다른 엔진과의 비교

솔직히 말해 **"더 쉽게 게임을 출시할 수 있는" 엔진은 아닙니다.** Phaser나 Godot이 도구도 풍부하고 복잡한 게임을 더 빨리 만들 수 있습니다. hengine의 장점은 다른 축에 있습니다.

### 진짜 장점

| 항목 | hengine | Phaser / PixiJS |
| --- | --- | --- |
| 전체 코드 | ~1,700줄, 30분이면 다 읽음 | 수만 줄, 블랙박스 |
| 런타임 의존성 | 0개 | 수십 개 (transitive 포함) |
| 번들 크기 | ~30 KB | Phaser 1 MB+, Pixi 수백 KB |
| 빌드 도구 | `tsc` 하나면 끝 | Vite / Webpack 설정 필요 |
| DPR / 리사이즈 / IndexedDB | 기본 내장 | 직접 구현 |
| TypeScript 타입 | 소스가 곧 타입 | `@types/*` 별도 패키지 |

### 진짜 단점

- **성능 천장이 낮음** — Canvas 2D, 배칭 없음, WebGL 없음. 움직이는 스프라이트 ~1,000개가 실용적인 한계. Phaser/Pixi는 1만+ 가능.
- **물리 엔진 없음** — Box2D / Matter 통합 없음. Pong 수준의 충돌만 (AABB + 원 + 공간 격자 정도).
- **타일맵, 파티클, 씬 전환, 사운드 믹서 없음.** 필요한 게임에서 직접 작성.
- **생태계 0개.** 플러그인, Tiled 임포터, Spine 통합, Stack Overflow 태그 없음.
- **3D, 네트워킹, 모바일 제스처 라이브러리 없음.**

### 어떤 게임에 적합한가

| 적합 | 부적합 |
| --- | --- |
| 퍼즐, 보드게임, 카드, 캐주얼 아케이드 | 액션 / 슈팅 / RPG |
| 읽을 수 있는 코드로 게임 개발 기본기 학습 | 화려한 이펙트 / 파티클 / 물리 |
| 빠른 반복 개발이 필요한 웹 전용 게임 | 모바일 앱스토어 출시 |
| 커스텀한 느낌을 원하는 1인 개발 | 팀 단위 + 공통 도구 필요 |

hengine이 떳떳하게 내세울 수 있는 한 줄 — **엔진 코드 전체를 머리에 담을 수 있다.** Phaser에선 영원히 불가능한 일입니다. 이게 가치 있는지는 만들 게임에 달려 있습니다.

## 설치

아직 npm에 올라가 있지 않습니다. 로컬에서 clone 후 빌드하세요.

```bash
git clone https://github.com/SeunghwaCho/hengine.git
cd hengine
npm install
npm run build
```

그 다음 둘 중 하나를 선택:
- 형제 경로에서 직접 import (`import { App } from "../hengine/dist/index.js"`)
- 또는 `npm install /path/to/hengine`으로 local-file 의존성 추가

## 빠른 시작

```ts
import { App, Scene, drawText, fillRect } from "hengine"; // 또는 "./path/to/hengine/dist/index.js"

class Hello implements Scene {
  draw(ctx, layout) {
    fillRect(ctx, { x: 0, y: 0, w: layout.width, h: layout.height }, "#0f172a");
    drawText(ctx, "Hello, hengine!", layout.width / 2, layout.height / 2, {
      color: "#fff", size: 32, align: "center", baseline: "middle",
    });
  }
}

const canvas = document.querySelector("canvas")!;
const app = new App(canvas, { sizing: "window" });
app.setScene(new Hello());
app.start();
```

영속 하이스코어, 모달 다이얼로그, 절차적 사운드, 키보드 컨트롤까지 갖춘 완전한 Breakout 예제는 [`examples/breakout`](./examples/breakout)에 있습니다.

처음 써보는 분이라면 [`followme.md`](./followme.md) 단계별 튜토리얼을 보세요. "별잡기" 게임을 0부터 만들면서 엔진의 주요 모듈을 한 번씩 다 다룹니다.

## 모듈 구성

```
src/
├── App.ts                 # 캔버스 + RAF + 씬 + 입력 디스패치
├── GameLoop.ts            # 고정/가변 타임스텝 루프
├── Scene.ts               # Scene 인터페이스
├── types.ts               # Vec2, Rect, Layout, point-in-rect/circle
├── input/
│   ├── KeyboardInput.ts   # 폴링 방식 키 상태 + 엣지 감지
│   └── Joystick.ts        # 가상 화면 조이스틱 (터치)
├── render/
│   ├── draw.ts            # roundRect, drawText, drawCircle, drawLine, fillRect
│   └── Camera.ts          # 팬/줌, 월드 ↔ 스크린 변환
├── audio/
│   ├── Synth.ts           # Web Audio 신디사이저 — 톤, 시퀀스, 노이즈
│   └── AssetSound.ts      # 샘플 기반 재생 (decodeAudioData)
├── storage/
│   ├── KvStore.ts         # 비동기 키-값 인터페이스
│   ├── MemoryStore.ts     # 메모리 백킹
│   └── IndexedDbStore.ts  # IndexedDB + 실패 시 자동 메모리 폴백
├── assets/
│   └── AssetLoader.ts     # 진행률 콜백 포함 병렬 이미지 로딩
├── ui/
│   ├── Button.ts          # 캔버스 렌더링 버튼 위젯
│   └── Modal.ts           # 중앙 정렬 모달 다이얼로그
└── math/
    ├── random.ts          # mulberry32 시드 RNG, 주사위, pick, shuffle
    ├── geometry.ts        # distance, lerp, clamp, AABB/원 충돌
    └── SpatialGrid.ts     # 광역 충돌 격자
```

## 좌표 체계 약속

- 캔버스 백버퍼 크기는 `cssSize × devicePixelRatio`.
- 매 프레임 `Scene.draw` 호출 직전에 2D 컨텍스트가 `dpr`-only 변환으로 리셋됩니다. 씬 안에서는 **항상 CSS 픽셀 단위로 그리세요.**
- `Scene.onDown/onMove/onUp`에 전달되는 포인터/마우스 좌표는 캔버스 기준 CSS 픽셀입니다.

이 한 가지 규칙만 지키면 Retina, 스마트폰, 윈도우 리사이즈 후에도 게임이 항상 선명하게 보입니다 — 더 이상 신경 쓸 필요 없습니다.

## 루프 모드

`App`은 내부적으로 `GameLoop`을 사용하며 두 가지 모드를 지원합니다:

- **고정 타임스텝**(기본값): `update(dt)`를 정확히 `1000/targetFPS` ms 간격으로 호출, accumulator가 RAF 지터를 흡수, `render(interpolation)`에 0~1 사이 보간 계수를 전달. 물리 위주거나 결정론적 게임에 적합.
- **가변 타임스텝**(`variableTimestep: true`): `update(dt)`가 RAF마다 한 번씩 실제 델타로 호출됨. UI 중심의 캐주얼 게임에 적합.

## 영속화 (저장)

```ts
import { IndexedDbStore } from "hengine";

const store = new IndexedDbStore({ dbName: "mygame", version: 1 });
await store.init();
await store.set("save", { level: 3, hp: 22 });
const save = await store.get<{ level: number; hp: number }>("save");
```

IndexedDB를 쓸 수 없거나 트랜잭션이 실패하면 store는 조용히 `MemoryStore`로 강등됩니다. 읽기/쓰기 호출은 그대로 성공합니다 — 단, 새로고침 후 데이터가 사라질 뿐. "지속 저장 없이 플레이 중" 표시를 사용자에게 띄우고 싶다면 `store.isUsingFallback()`을 확인하세요.

## 오디오 주의 사항

브라우저는 사용자 상호작용 전까지 `AudioContext`를 시작하지 않습니다. `Synth`와 `AssetSound`는 모두 컨텍스트를 지연 생성합니다. 첫 포인터/키 다운 핸들러 안에서 `synth.ensureCtx()` + `synth.resume()`을 호출하세요.

## 빌드

```bash
npm run typecheck    # 타입 검사만, emit 없음
npm run build        # tsc → dist/ (.d.ts 포함)
```

## 라이선스

MIT — [LICENSE](./LICENSE) 참조.
