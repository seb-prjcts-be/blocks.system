import { createBlocksSystem } from "../blocks.system.mjs?v=0.1.11";
import { loadDocsContent } from "./shell.mjs?v=0.1.30";

const board = document.querySelector("#home-board");
const blocks = createBlocksSystem({
  variant: "regular",
  snap: true,
  blockDefaults: {
    menu: { minimize: true, close: true }
  }
});
const homeIds = ["home-title", "home-photo", "home-intro"];
const content = await loadDocsContent("home", homeIds);

blocks.attach(board);
blocks.setGrid(6, 8);

const heading = document.createElement("h1");
heading.className = "home-title";
heading.textContent = content["home-title"].heading;
const title = blocks.add(heading, {
  id: "home-title",
  title: content["home-title"].title
});
title.span(3, 3);
title.place(2, 2);

const photoContent = document.createElement("figure");
photoContent.className = "home-photo";
const photoImage = document.createElement("img");
photoImage.src = new URL("./img/pexels-peter-dyllong-2158803154-37466849.jpg", import.meta.url).href;
photoImage.width = 3358;
photoImage.height = 5038;
photoImage.alt = content["home-photo"].alt;
photoImage.decoding = "async";
photoContent.append(photoImage);
const photo = blocks.add(photoContent, {
  id: "home-photo",
  title: content["home-photo"].title
});
photo.span(1, 3);
photo.place(5, 2);

const introContent = document.createElement("div");
introContent.className = "home-intro";
const introLead = document.createElement("span");
introLead.className = "home-intro-lead";
introLead.textContent = `${content["home-intro"].lead} `;
const introStatement = document.createElement("strong");
introStatement.className = "home-intro-object";
introStatement.textContent = content["home-intro"].statement;
const introRoute = document.createElement("div");
introRoute.className = "home-intro-route";
const introSequence = document.createElement("span");
introSequence.className = "home-intro-sequence";
introSequence.textContent = content["home-intro"].sequence;
const action = document.createElement("a");
action.href = content["home-intro"].action.href;
action.textContent = content["home-intro"].action.label;
introRoute.append(introSequence, action);
introContent.append(introLead, introStatement, introRoute);
const intro = blocks.add(introContent, {
  id: "home-intro",
  title: content["home-intro"].title
});
intro.span(2, 2);
intro.place(4, 6);

board.dataset.homeReady = "true";
