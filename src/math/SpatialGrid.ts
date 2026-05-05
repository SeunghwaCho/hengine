/**
 * Uniform spatial hash for broad-phase collision queries.
 * Stores entity *indices* (not references) to avoid GC pressure.
 *
 * Per-frame use:
 *   grid.clear();
 *   for each active entity i: grid.insert(i, x, y, radius);
 *   const set = new Set<number>();
 *   grid.queryRadius(qx, qy, qr, set);  // candidates
 */
export class SpatialGrid {
  private readonly cellSize: number;
  private readonly cols: number;
  private readonly rows: number;
  private readonly cells: number[][];

  constructor(worldWidth: number, worldHeight: number, cellSize: number) {
    if (cellSize <= 0) throw new Error("SpatialGrid: cellSize must be > 0");
    this.cellSize = cellSize;
    this.cols = Math.max(1, Math.ceil(worldWidth / cellSize));
    this.rows = Math.max(1, Math.ceil(worldHeight / cellSize));
    this.cells = Array.from({ length: this.cols * this.rows }, () => []);
  }

  clear(): void {
    for (let i = 0; i < this.cells.length; i++) this.cells[i].length = 0;
  }

  insert(index: number, x: number, y: number, radius: number): void {
    const minCol = Math.max(0, Math.floor((x - radius) / this.cellSize));
    const maxCol = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellSize));
    const minRow = Math.max(0, Math.floor((y - radius) / this.cellSize));
    const maxRow = Math.min(this.rows - 1, Math.floor((y + radius) / this.cellSize));
    for (let row = minRow; row <= maxRow; row++) {
      const rowBase = row * this.cols;
      for (let col = minCol; col <= maxCol; col++) {
        this.cells[rowBase + col].push(index);
      }
    }
  }

  /** Pre-allocated `result` set will be filled with unique candidate indices. */
  queryRadius(cx: number, cy: number, radius: number, result: Set<number>): void {
    const minCol = Math.max(0, Math.floor((cx - radius) / this.cellSize));
    const maxCol = Math.min(this.cols - 1, Math.floor((cx + radius) / this.cellSize));
    const minRow = Math.max(0, Math.floor((cy - radius) / this.cellSize));
    const maxRow = Math.min(this.rows - 1, Math.floor((cy + radius) / this.cellSize));
    for (let row = minRow; row <= maxRow; row++) {
      const rowBase = row * this.cols;
      for (let col = minCol; col <= maxCol; col++) {
        const cell = this.cells[rowBase + col];
        for (let k = 0; k < cell.length; k++) result.add(cell[k]);
      }
    }
  }

  get cellCount(): number {
    return this.cells.length;
  }
}
