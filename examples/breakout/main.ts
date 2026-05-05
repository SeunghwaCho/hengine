import {
  App,
  type Scene,
  type Layout,
  Synth,
  NOTE,
  IndexedDbStore,
  Button,
  Modal,
  KeyboardInput,
  drawText,
  fillRoundRect,
  drawCircle,
  fillRect,
  clamp,
  mulberry32,
  rollDie,
  type Rng,
} from "../../dist/index.js";

const PADDLE_W = 100;
const PADDLE_H = 14;
const BALL_R = 7;
const BRICK_COLS = 8;
const BRICK_ROWS = 5;
const BRICK_GAP = 4;
const TOP_HUD = 48;

interface Brick { x: number; y: number; w: number; h: number; alive: boolean; color: string; }

interface SaveState { highScore: number; }

const SAVE_KEY = "breakout.save";

const sound = new Synth();
const store = new IndexedDbStore({ dbName: "hengine.breakout" });
const kb = new KeyboardInput();

class GameScene implements Scene {
  private ballX = 0;
  private ballY = 0;
  private ballVx = 0;
  private ballVy = 0;
  private paddleX = 0;
  private bricks: Brick[] = [];
  private score = 0;
  private highScore = 0;
  private lives = 3;
  private launched = false;
  private gameOverModal: Modal | null = null;
  private rng: Rng = mulberry32(Date.now() & 0xffffffff);

  enter(): void {
    kb.attach();
    void this.loadHighScore();
  }

  leave(): void {
    kb.detach();
  }

  private async loadHighScore(): Promise<void> {
    await store.init();
    const save = await store.get<SaveState>(SAVE_KEY);
    if (save && typeof save.highScore === "number") this.highScore = save.highScore;
  }

  private async persistHighScore(): Promise<void> {
    await store.set(SAVE_KEY, { highScore: this.highScore } satisfies SaveState);
  }

  private resetBall(layout: Layout): void {
    this.paddleX = layout.width / 2 - PADDLE_W / 2;
    this.ballX = this.paddleX + PADDLE_W / 2;
    this.ballY = layout.height - 60 - BALL_R;
    this.ballVx = 0;
    this.ballVy = 0;
    this.launched = false;
  }

  private buildBricks(layout: Layout): void {
    const margin = 16;
    const totalGap = BRICK_GAP * (BRICK_COLS - 1);
    const w = (layout.width - margin * 2 - totalGap) / BRICK_COLS;
    const h = 22;
    const colors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];
    this.bricks = [];
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        this.bricks.push({
          x: margin + c * (w + BRICK_GAP),
          y: TOP_HUD + 16 + r * (h + BRICK_GAP),
          w,
          h,
          alive: true,
          color: colors[r % colors.length],
        });
      }
    }
  }

  private maybeInit(layout: Layout): void {
    if (this.bricks.length === 0 && layout.width > 0) {
      this.buildBricks(layout);
      this.resetBall(layout);
    }
  }

  update(dt: number, layout: Layout): void {
    if (this.gameOverModal) {
      this.gameOverModal.setLayout(layout);
      kb.endFrame();
      return;
    }
    this.maybeInit(layout);

    // Paddle controls
    const speed = 520;
    if (kb.isDown("ArrowLeft") || kb.isDown("KeyA")) this.paddleX -= speed * dt;
    if (kb.isDown("ArrowRight") || kb.isDown("KeyD")) this.paddleX += speed * dt;
    this.paddleX = clamp(this.paddleX, 0, layout.width - PADDLE_W);

    if (!this.launched) {
      this.ballX = this.paddleX + PADDLE_W / 2;
      this.ballY = layout.height - 60 - BALL_R;
      if (kb.wasPressed("Space")) {
        this.launched = true;
        this.ballVx = (this.rng() < 0.5 ? -1 : 1) * 220;
        this.ballVy = -340;
        sound.tone({ freq: NOTE.C5, duration: 0.06, type: "triangle", gain: 0.18 });
      }
      kb.endFrame();
      return;
    }

    // Ball physics
    this.ballX += this.ballVx * dt;
    this.ballY += this.ballVy * dt;

    // Wall collision
    if (this.ballX - BALL_R < 0) {
      this.ballX = BALL_R;
      this.ballVx = -this.ballVx;
      sound.tone({ freq: NOTE.E4, duration: 0.04, type: "square", gain: 0.1 });
    }
    if (this.ballX + BALL_R > layout.width) {
      this.ballX = layout.width - BALL_R;
      this.ballVx = -this.ballVx;
      sound.tone({ freq: NOTE.E4, duration: 0.04, type: "square", gain: 0.1 });
    }
    if (this.ballY - BALL_R < TOP_HUD) {
      this.ballY = TOP_HUD + BALL_R;
      this.ballVy = -this.ballVy;
      sound.tone({ freq: NOTE.E4, duration: 0.04, type: "square", gain: 0.1 });
    }

    // Paddle collision
    const padY = layout.height - 40;
    if (
      this.ballVy > 0 &&
      this.ballY + BALL_R >= padY &&
      this.ballY + BALL_R <= padY + PADDLE_H + 4 &&
      this.ballX >= this.paddleX &&
      this.ballX <= this.paddleX + PADDLE_W
    ) {
      this.ballY = padY - BALL_R;
      const offset = (this.ballX - (this.paddleX + PADDLE_W / 2)) / (PADDLE_W / 2);
      const angle = offset * 1.0; // up to ~57°
      const speed2 = Math.hypot(this.ballVx, this.ballVy) * 1.02;
      this.ballVx = Math.sin(angle) * speed2;
      this.ballVy = -Math.abs(Math.cos(angle) * speed2);
      sound.tone({ freq: NOTE.A4, duration: 0.05, type: "triangle", gain: 0.15 });
    }

    // Brick collision (simple AABB, choose nearest axis to flip)
    for (const b of this.bricks) {
      if (!b.alive) continue;
      if (
        this.ballX + BALL_R > b.x &&
        this.ballX - BALL_R < b.x + b.w &&
        this.ballY + BALL_R > b.y &&
        this.ballY - BALL_R < b.y + b.h
      ) {
        b.alive = false;
        this.score += 10;
        const overlapX = Math.min(this.ballX + BALL_R - b.x, b.x + b.w - (this.ballX - BALL_R));
        const overlapY = Math.min(this.ballY + BALL_R - b.y, b.y + b.h - (this.ballY - BALL_R));
        if (overlapX < overlapY) this.ballVx = -this.ballVx;
        else this.ballVy = -this.ballVy;
        sound.tone({ freq: NOTE.C5 + rollDie(this.rng, 6) * 30, duration: 0.06, type: "sine", gain: 0.18 });
        break;
      }
    }

    // Bottom — life lost
    if (this.ballY - BALL_R > layout.height) {
      this.lives--;
      sound.noise(0.18, 0.18);
      if (this.lives <= 0) {
        if (this.score > this.highScore) {
          this.highScore = this.score;
          void this.persistHighScore();
        }
        this.openGameOver();
      } else {
        this.resetBall(layout);
      }
    }

    // Win
    if (this.bricks.every((b) => !b.alive)) {
      this.score += 100;
      this.buildBricks(layout);
      this.resetBall(layout);
      sound.sequence([
        { freq: NOTE.C5, duration: 0.1 },
        { freq: NOTE.E5, duration: 0.1, delay: 0.08 },
        { freq: NOTE.G5, duration: 0.14, delay: 0.18 },
      ]);
    }

    kb.endFrame();
  }

  private openGameOver(): void {
    this.gameOverModal = new Modal({
      title: "Game Over",
      message: `Score: ${this.score}   High: ${this.highScore}`,
      actions: [
        {
          label: "Play again",
          onPress: () => {
            this.score = 0;
            this.lives = 3;
            this.bricks = [];
            this.gameOverModal = null;
          },
        },
      ],
    });
  }

  draw(ctx: CanvasRenderingContext2D, layout: Layout): void {
    // background
    fillRect(ctx, { x: 0, y: 0, w: layout.width, h: layout.height }, "#0f172a");

    // HUD
    fillRect(ctx, { x: 0, y: 0, w: layout.width, h: TOP_HUD }, "#1e293b");
    drawText(ctx, `Score ${this.score}`, 16, TOP_HUD / 2, {
      color: "#f8fafc", size: 18, baseline: "middle",
    });
    drawText(ctx, `High ${this.highScore}`, layout.width / 2, TOP_HUD / 2, {
      color: "#cbd5e1", size: 16, align: "center", baseline: "middle",
    });
    drawText(ctx, `Lives ${this.lives}`, layout.width - 16, TOP_HUD / 2, {
      color: "#f8fafc", size: 18, align: "right", baseline: "middle",
    });

    // bricks
    for (const b of this.bricks) {
      if (!b.alive) continue;
      fillRoundRect(ctx, b.x, b.y, b.w, b.h, 4, b.color);
    }

    // paddle
    fillRoundRect(
      ctx,
      this.paddleX,
      layout.height - 40,
      PADDLE_W,
      PADDLE_H,
      6,
      "#e2e8f0",
    );

    // ball
    drawCircle(ctx, this.ballX, this.ballY, BALL_R, "#fbbf24");

    if (!this.launched && !this.gameOverModal) {
      drawText(
        ctx,
        "← →   to move    Space   to launch",
        layout.width / 2,
        layout.height - 80,
        { color: "#94a3b8", size: 14, align: "center", baseline: "middle" },
      );
    }

    if (this.gameOverModal) this.gameOverModal.draw(ctx, layout);
  }

  onDown(x: number, y: number): void {
    sound.ensureCtx();
    sound.resume();
    if (this.gameOverModal) this.gameOverModal.onDown(x, y);
  }

  onMove(x: number, y: number): void {
    if (this.gameOverModal) this.gameOverModal.onMove(x, y);
  }

  onUp(x: number, y: number): void {
    if (this.gameOverModal) this.gameOverModal.onUp(x, y);
  }

  onKeyDown(code: string): void {
    if (code === "Space" && !this.gameOverModal) {
      sound.ensureCtx();
      sound.resume();
    }
  }
}

const canvas = document.getElementById("game") as HTMLCanvasElement;
const app = new App(canvas, { clearColor: "#0f172a", sizing: "parent" });
app.setScene(new GameScene());
app.start();
// Silence "unused" lints if a tree-shaker prunes Button — re-import to surface API.
void Button;
