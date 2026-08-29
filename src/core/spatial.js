// Spatial hash til hurtige nabo-opslag (kollision, opsluging, klynger, sky-effekter).
// Se ARCHITECTURE.md §6. Genopbygges hver tick (clear → insert alle → query).

export class SpatialHash {
  constructor(cellSize = 100) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  _key(cx, cy) {
    return cx + ',' + cy;
  }

  clear() {
    this.cells.clear();
  }

  insert(entity) {
    if (!entity.transform) return;
    const cx = (entity.transform.x / this.cellSize) | 0;
    const cy = (entity.transform.y / this.cellSize) | 0;
    const k = this._key(cx, cy);
    let bucket = this.cells.get(k);
    if (!bucket) {
      bucket = [];
      this.cells.set(k, bucket);
    }
    bucket.push(entity);
  }

  /** Alle entiteter i cellerne der overlapper cirklen (x,y,r). Bredt filter — finkald selv. */
  queryRadius(x, y, r) {
    const out = [];
    const minx = ((x - r) / this.cellSize) | 0;
    const maxx = ((x + r) / this.cellSize) | 0;
    const miny = ((y - r) / this.cellSize) | 0;
    const maxy = ((y + r) / this.cellSize) | 0;
    for (let cx = minx; cx <= maxx; cx++) {
      for (let cy = miny; cy <= maxy; cy++) {
        const bucket = this.cells.get(this._key(cx, cy));
        if (bucket) for (const e of bucket) out.push(e);
      }
    }
    return out;
  }
}
