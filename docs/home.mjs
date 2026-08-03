import { createBlocksSystem } from "../blocks.system.mjs?v=0.1.3";

const board = document.querySelector("#home-board");
const blocks = createBlocksSystem({ variant: "regular" });

blocks.attach(board);
blocks.setGrid(6, 8);
blocks.snap = true;
blocks.draggable = true;

const title = blocks.add('<h1 class="home-title">Blocks. System.</h1>', { id: "home-title" });
title.menu("blocks.system");
title.span(3, 3);
title.place(2, 3);

const intro = blocks.add(`
  <div class="home-intro">
    <p>dependency-free esm for addressable dom objects.</p>
    <a href="docs/">open manual →</a>
  </div>
`, { id: "home-intro" });
intro.menu("start", { minimize: false });
intro.span(2, 1);
intro.place(5, 7);

board.dataset.homeReady = "true";
