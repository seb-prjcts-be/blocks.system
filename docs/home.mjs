import { createBlocksSystem } from "../blocks.system.mjs?v=0.1.2";

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

board.dataset.homeReady = "true";
