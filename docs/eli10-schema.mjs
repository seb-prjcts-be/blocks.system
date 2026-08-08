/**
 * ELI10 schema — div / blocks / block.
 *
 * Three panels are drawn cumulatively: an empty container, the system attached
 * to that container, and one individual block inside it. The instance owns its
 * host, so this small explanatory sketch cannot collide with the manual.
 */
export function mountEli10Schema(host) {
  if (!(host instanceof HTMLElement)) throw new TypeError("ELI10 needs its visual host.");
  if (host.dataset.eli10Mounted === "true") return null;
  if (typeof window.p5 !== "function") throw new Error("ELI10 needs the local p5 runtime.");

  host.dataset.eli10Mounted = "true";

  const eli10Schema = (p) => {
    // Fixed 900 × 250 design space: the host scales the whole diagram together.
    const W = 900;
    const H = 250;

    const PAD_X = 30;
    const ARROW_W = 44;
    const PANEL_W = (W - PAD_X * 2 - ARROW_W * 2) / 3;

    const FIELD_W = PANEL_W * 0.86;
    const FIELD_H = 118;
    const FIELD_Y = 74;
    const FIELD_INSET = 10;

    const COLS = 3;
    const ROWS = 2;

    const STEP_MS = 1800;
    const ENTER_MS = 620;

    const PAPER = "#f5f5f2";
    const INK = "#111";
    const MUTED = "#666";
    const FIELD = "#d9d8d2";

    const STEPS = [
      { title: "1 / container", code: '<div id="blocks-field"></div>' },
      { title: "2 / blocks", code: 'blocks.attach("#blocks-field")' },
      { title: "3 / block", code: 'const block = blocks.add(\n  "<p>Hello.</p>"\n)' }
    ];

    let scaleFactor = 1;
    let resizeFrame = 0;
    let hostObserver = null;

    p.setup = () => {
      const canvas = p.createCanvas(W, H);
      canvas.parent(host);
      canvas.elt.setAttribute("role", "img");
      canvas.elt.setAttribute("aria-label", "A container div, the blocks system attached to it, and one block inside it.");
      p.pixelDensity(Math.min(2, p.displayDensity()));
      p.textFont("Consolas");
      fitToHost();
      scheduleFitToHost();
      if (typeof window.ResizeObserver === "function") {
        hostObserver = new window.ResizeObserver(fitToHost);
        hostObserver.observe(host);
      }
    };

    p.windowResized = scheduleFitToHost;

    function scheduleFitToHost() {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(fitToHost);
    }

    function fitToHost() {
      const hostWidth = host.clientWidth || W;
      const hostHeight = host.clientHeight || H;
      scaleFactor = Math.min(1, hostWidth / W, hostHeight / H);
      p.resizeCanvas(W * scaleFactor, H * scaleFactor);
    }

    p.draw = () => {
      p.background(PAPER);
      p.push();
      p.scale(scaleFactor);

      const elapsed = p.millis() % (STEP_MS * STEPS.length);
      const active = Math.floor(elapsed / STEP_MS);
      const enter = p.constrain((elapsed % STEP_MS) / ENTER_MS, 0, 1);

      for (let index = 0; index < STEPS.length; index += 1) {
        const x = PAD_X + index * (PANEL_W + ARROW_W);
        drawPanel(index, x, active, active === index ? easeOut(enter) : 1);
        if (index < STEPS.length - 1) drawArrow(x + PANEL_W + ARROW_W / 2, FIELD_Y + FIELD_H / 2);
      }

      p.pop();
    };

    function drawPanel(index, x, active, grow) {
      const step = STEPS[index];
      const isActive = index === active;
      const fieldX = x + (PANEL_W - FIELD_W) / 2;

      p.noStroke();
      p.fill(isActive ? INK : MUTED);
      p.textSize(12);
      p.textAlign(p.LEFT, p.BASELINE);
      p.text(step.title.toUpperCase(), fieldX, FIELD_Y - 18);

      if (index === 0) {
        drawDashedField(fieldX, FIELD_Y, isActive, grow);
      } else {
        p.push();
        p.noStroke();
        p.fill(FIELD);
        p.rect(fieldX, FIELD_Y, FIELD_W, FIELD_H);
        p.pop();
        drawGrid(fieldX, FIELD_Y, index === 1 ? grow : 1);
      }

      if (index === 2) drawBlock(fieldX, FIELD_Y, grow);

      p.noStroke();
      p.fill(isActive ? INK : MUTED);
      p.textSize(11);
      p.textAlign(p.LEFT, p.TOP);
      p.text(step.code, fieldX, FIELD_Y + FIELD_H + 20);
    }

    function drawDashedField(x, y, isActive, grow) {
      p.push();
      p.noFill();
      p.stroke(isActive ? INK : MUTED);
      p.strokeWeight(1.5);
      p.drawingContext.setLineDash([7, 6]);
      p.drawingContext.lineDashOffset = isActive ? -p.millis() / 45 : 0;
      p.rect(x, y, FIELD_W, FIELD_H);
      p.drawingContext.setLineDash([]);
      p.pop();

      p.push();
      p.noStroke();
      p.fill(MUTED);
      p.textSize(11);
      p.textAlign(p.CENTER, p.CENTER);
      p.text("empty", x + FIELD_W / 2, y + FIELD_H / 2 + (1 - grow) * 6);
      p.pop();
    }

    function drawGrid(x, y, grow) {
      const innerX = x + FIELD_INSET;
      const innerY = y + FIELD_INSET;
      const innerW = FIELD_W - FIELD_INSET * 2;
      const innerH = FIELD_H - FIELD_INSET * 2;

      p.push();
      p.stroke(INK);
      p.strokeWeight(1);
      p.drawingContext.setLineDash([3, 4]);

      for (let column = 1; column < COLS; column += 1) {
        const lineX = innerX + (innerW / COLS) * column;
        p.line(lineX, innerY, lineX, innerY + innerH * grow);
      }
      for (let row = 1; row < ROWS; row += 1) {
        const lineY = innerY + (innerH / ROWS) * row;
        p.line(innerX, lineY, innerX + innerW * grow, lineY);
      }

      p.drawingContext.setLineDash([]);
      p.noFill();
      p.rect(innerX, innerY, innerW, innerH);
      p.pop();
    }

    function drawBlock(x, y, grow) {
      const innerX = x + FIELD_INSET;
      const innerY = y + FIELD_INSET;
      const cellW = (FIELD_W - FIELD_INSET * 2) / COLS;
      const cellH = (FIELD_H - FIELD_INSET * 2) / ROWS;
      const barH = 9;

      p.push();
      p.translate(0, (1 - grow) * -14);
      p.stroke(INK);
      p.strokeWeight(1.5);
      p.fill(PAPER);
      p.rect(innerX, innerY, cellW, cellH);

      p.noStroke();
      p.fill(INK);
      p.rect(innerX, innerY, cellW, barH);

      p.stroke(PAPER);
      p.strokeWeight(1);
      const markY = innerY + barH / 2;
      p.line(innerX + cellW - 15, markY, innerX + cellW - 11, markY);
      p.line(innerX + cellW - 8, markY - 2, innerX + cellW - 4, markY + 2);
      p.line(innerX + cellW - 8, markY + 2, innerX + cellW - 4, markY - 2);

      p.noStroke();
      p.fill(INK);
      p.textSize(10);
      p.textAlign(p.CENTER, p.CENTER);
      p.text("block", innerX + cellW / 2, innerY + barH + (cellH - barH) / 2);
      p.pop();
    }

    function drawArrow(centerX, y) {
      p.push();
      p.stroke(MUTED);
      p.strokeWeight(1.5);
      p.line(centerX - 11, y, centerX + 7, y);
      p.line(centerX + 2, y - 5, centerX + 7, y);
      p.line(centerX + 2, y + 5, centerX + 7, y);
      p.pop();
    }

    function easeOut(value) {
      return 1 - Math.pow(1 - value, 3);
    }
  };

  return new window.p5(eli10Schema);
}
