import { createBlocksSystem } from "../blocks.system.mjs?v=0.1.3";
import { loadDocsContent } from "./shell.mjs?v=0.1.3";

const board = document.querySelector("#home-board");
const blocks = createBlocksSystem({ variant: "regular" });
const homeIds = ["home-title", "home-intro"];
const content = await loadDocsContent("home", homeIds);

blocks.attach(board);
blocks.setGrid(6, 8);
blocks.snap = true;
blocks.draggable = true;

const heading = document.createElement("h1");
heading.className = "home-title";
heading.textContent = content["home-title"].heading;
const title = blocks.add(heading, { id: "home-title" });
title.menu(content["home-title"].title);
title.span(3, 3);
title.place(2, 3);

const introContent = document.createElement("div");
introContent.className = "home-intro";
const tagline = document.createElement("p");
tagline.textContent = content["home-intro"].tagline;
const action = document.createElement("a");
action.href = content["home-intro"].action.href;
action.textContent = content["home-intro"].action.label;
introContent.append(tagline, action);
const intro = blocks.add(introContent, { id: "home-intro" });
intro.menu(content["home-intro"].title, { minimize: false });
intro.span(2, 1);
intro.place(5, 7);

board.dataset.homeReady = "true";
