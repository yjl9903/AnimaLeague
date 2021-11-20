import * as path from "path";
import * as core from "@actions/core";
import klaw from "klaw";
// @ts-ignore
import { createSVGWindow, config } from "svgdom";
import { SVG, registerWindow } from "@svgdotjs/svg.js";

import { IRecord } from "./types";

const FontMappings: Record<string, string> = {};

function selectFont() {
  for (const font in FontMappings) {
    console.log(font);

    return font;
  }
  return undefined;
}

export async function setupFonts() {
  const FontsDir = path.join(process.cwd(), core.getInput("font"));
  for await (const file of klaw(FontsDir)) {
    if (file.stats.isFile()) {
      const basename = path.basename(file.path);
      const font = basename.trim().replace(/\.[^/.]+$/, "");
      FontMappings[font] = basename;
    }
  }
  config
    .setFontDir(FontsDir)
    .setFontFamilyMappings(FontMappings)
    .preloadFonts();
}

export function draw(record: IRecord) {
  const window = createSVGWindow();
  const document = window.document;
  registerWindow(window, document);

  const canvas = (SVG(document.documentElement) as any).size(450, 300);

  canvas
    .rect(450, 300)
    .fill("white")
    .stroke({ color: "#f06", opacity: 0.6, width: 5 });

  for (let i = 0; i < record.rank.length; i++) {
    canvas
      .text(`${i + 1}`)
      .font({
        family: selectFont(),
        size: 36,
        anchor: "middle",
        leading: "1.5em",
      })
      .move(0, i * 60);
    canvas
      .text(`${record.rank[i].name}`)
      .font({
        family: selectFont(),
        size: 36,
        anchor: "middle",
        leading: "1.5em",
      })
      .move(60, i * 60);
  }

  // get your svg as string
  return canvas.svg();
}
