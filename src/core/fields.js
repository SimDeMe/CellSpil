// Miljø-gitter: ét felt pr. parameter (lys, O2, CO2, pH, temp, kemi), opdateres med
// diffusion + faste gradienter + kilder/dræn. Se ENVIRONMENT.md §1 og ARCHITECTURE.md §6.

export class FieldGrid {
  constructor(cols, rows, cellSize, params = []) {
    this.cols = cols;
    this.rows = rows;
    this.cellSize = cellSize;
    this.params = params;
    /** @type {Record<string, Float32Array>} */
    this.data = {};
    for (const p of params) this.data[p] = new Float32Array(cols * rows);
  }

  idx(x, y) {
    const cx = Math.min(this.cols - 1, Math.max(0, (x / this.cellSize) | 0));
    const cy = Math.min(this.rows - 1, Math.max(0, (y / this.cellSize) | 0));
    return cy * this.cols + cx;
  }

  /** Lokal værdi af en parameter i verdens-koordinat (x,y). */
  sample(x, y, param) {
    const arr = this.data[param];
    return arr ? arr[this.idx(x, y)] : 0;
  }

  /** Tilføj/fjern stof lokalt (cellers udskillelse — se SOCIAL/ENVIRONMENT). */
  addSource(x, y, param, amount) {
    const arr = this.data[param];
    if (arr) arr[this.idx(x, y)] += amount;
  }

  // TODO: diffusion (udjævn mod naboer), faste gradienter (lys efter dybde, temp efter zone),
  //       henfald. Drives af environmentSystem hver tick.
  step(dt) {
    /* TODO */
  }
}
