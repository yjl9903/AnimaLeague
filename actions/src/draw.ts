import * as path from "path";
import * as core from "@actions/core";
import klaw from "klaw";
// @ts-ignore
import { createSVGWindow, config } from "svgdom";
import { SVG, registerWindow } from "@svgdotjs/svg.js";

import { IRecord } from "./types";
import { parsePt } from "./utils";

const FontMappings: Record<string, string> = {};

function selectFont() {
  for (const font in FontMappings) {
    if (font.startsWith("OpenSans")) continue;
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

  const Width = 600;
  const Height = 340;
  const Padding = 20;
  const LineHeight = Math.round((Height - Padding * 2) / 5);
  const FontSize = 36;
  const FontOffset = Math.round((LineHeight - FontSize) / 2);

  const canvas = (SVG(document.documentElement) as any).size(Width, Height);

  // canvas
  //   .rect(Width, Height)
  //   .fill("white")
  //   .stroke({ color: "#f06", opacity: 0.6, width: 5 });

  const text = (t: string) =>
    canvas.text(t).font({
      family: selectFont(),
      size: FontSize,
      anchor: "middle",
      leading: "1.5em",
    });
  
  const RankPos = Padding;
  const AnimalPos = 120;
  const ScorePos = 240;
  const PTPos = 450;
  text("顺位")
    .font("size", 24)
    .move(RankPos, FontOffset + Padding);
  text("动物")
    .font("size", 24)
    .move(AnimalPos, FontOffset + Padding);
  text("得点")
    .font("size", 24)
    .move(ScorePos, FontOffset + Padding);
  text("PT")
    .font("size", 24)
    .move(PTPos, FontOffset + Padding);

  for (let i = 0; i < record.rank.length; i++) {
    const line = canvas
      .line(
        Padding,
        Padding + (i + 1) * LineHeight,
        Width - Padding,
        Padding + (i + 1) * LineHeight
      )
      .stroke({ width: 1, color: "#2c3e50" })
      .dy(FontOffset - 16);
    if (i === 0) {
      line.stroke({ width: 2 });
    }

    text(`${i + 1}`)
      .move(RankPos, Padding + (i + 1) * LineHeight)
      .dy(FontOffset + FontOffset - 16);
    text(`${record.rank[i].name}`)
      .move(AnimalPos, Padding + (i + 1) * LineHeight)
      .dy(FontOffset + FontOffset - 16);

    text(`${record.rank[i].score}`)
      .move(ScorePos, Padding + (i + 1) * LineHeight)
      .dy(FontOffset + FontOffset - 16);

    const parsedPt = parsePt(record.rank[i].pt, false);
    text(`${parsedPt}`)
      .move(PTPos, Padding + (i + 1) * LineHeight)
      .dy(FontOffset + FontOffset - 16)
      .fill(parsedPt.startsWith("-") ? "green" : "red");
  }

  // get your svg as string
  return canvas.svg();
}
