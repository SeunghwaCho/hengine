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
const PLAYER_SPEED = 520;     // px/sec
const STAR_RADIUS = 10;
const SPAWN_INTERVAL = 0.7;   // sec; 점점 빨라짐
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
    const finalScore = this.score;
    const finalHigh = this.highScore;
    this.modal = new Modal({
      title: "게임 오버",
      message: `점수: ${finalScore}    최고: ${finalHigh}`,
      actions: [
        {
          label: "다시 시작",
          onPress: () => {
            const layout = (window as unknown as { __lastLayout?: Layout }).__lastLayout;
            if (layout) this.resetGame(layout);
          },
        },
      ],
    });
  }

  update(dt: number, layout: Layout): void {
    (window as unknown as { __lastLayout?: Layout }).__lastLayout = layout;
    if (this.playerX === 0 && this.score === 0 && this.lives === 3) {
      this.playerX = layout.width / 2 - PLAYER_W / 2;
    }
    if (this.modal) {
      this.modal.setLayout(layout);
      kb.endFrame();
      return;
    }

    // 1) 플레이어 이동
    if (kb.isDown("ArrowLeft") || kb.isDown("KeyA")) this.playerX -= PLAYER_SPEED * dt;
    if (kb.isDown("ArrowRight") || kb.isDown("KeyD")) this.playerX += PLAYER_SPEED * dt;
    this.playerX = clamp(this.playerX, 0, layout.width - PLAYER_W);

    // 2) 별 스폰 (시간이 갈수록 간격이 짧아짐)
    this.spawnTimer += dt;
    while (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer -= this.spawnInterval;
      this.spawnStar(layout);
    }
    this.spawnInterval = Math.max(MIN_SPAWN_INTERVAL, SPAWN_INTERVAL - this.score * 0.005);

    // 3) 별 낙하 + 충돌/이탈
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
    // 배경
    fillRect(ctx, { x: 0, y: 0, w: layout.width, h: layout.height }, "#0b1020");

    // 별
    for (const s of this.stars) {
      drawCircle(ctx, s.x, s.y, STAR_RADIUS, "#fbbf24");
    }

    // 플레이어
    const playerY = layout.height - 60;
    fillRoundRect(ctx, this.playerX, playerY, PLAYER_W, PLAYER_H, 8, "#22d3ee");

    // HUD
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
