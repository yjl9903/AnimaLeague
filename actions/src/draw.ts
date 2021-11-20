import * as path from 'path';
import * as core from '@actions/core';
import klaw from 'klaw';
// @ts-ignore
import { createSVGWindow, config } from 'svgdom';
import { SVG, registerWindow } from '@svgdotjs/svg.js';

import { IRecord } from './types';
import { parsePt } from './utils';

const FontMappings: Record<string, string> = {};

function selectFont(type: 'normal' | 'mono' = 'normal') {
  for (const font in FontMappings) {
    if (font.startsWith('OpenSans')) continue;
    if (type === 'mono') {
      if (font.toLowerCase().includes(type)) {
        return font;
      }
    } else {
      return font;
    }
  }
  return undefined;
}

export async function setupFonts() {
  const FontsDir = path.join(process.cwd(), core.getInput('font'));
  for await (const file of klaw(FontsDir)) {
    if (file.stats.isFile()) {
      const basename = path.basename(file.path);
      const font = basename.trim().replace(/\.[^/.]+$/, '');
      FontMappings[font] = basename;
    }
  }
  config.setFontDir(FontsDir).setFontFamilyMappings(FontMappings).preloadFonts();
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

  const text = (t: string, family: 'mono' = 'mono') =>
    canvas.text(t).font({
      family: selectFont(family),
      size: FontSize,
      anchor: 'middle',
      leading: '1.5em'
    });

  const RankPos = Padding + 20;
  const AnimalPos = 120;
  const ScorePos = 220;
  const PTPos = 400;
  const Rank = text('顺位')
    .font('size', 24)
    .move(RankPos, FontOffset + Padding);
  const Animal = text('动物')
    .font('size', 24)
    .move(AnimalPos, FontOffset + Padding);
  const Score = text('得点')
    .font('size', 24)
    .move(ScorePos, FontOffset + Padding);
  text('PT')
    .font('size', 24)
    .move(PTPos, FontOffset + Padding);

  const scores = [];

  for (let i = 0; i < record.rank.length; i++) {
    const line = canvas
      .line(
        Padding,
        Padding + (i + 1) * LineHeight,
        Width - Padding,
        Padding + (i + 1) * LineHeight
      )
      .stroke({ width: 1, color: '#2c3e50' })
      .dy(FontOffset - 16);
    if (i === 0) {
      line.stroke({ width: 2 });
    }

    const DY = FontOffset + FontOffset - 20;

    const rank = text(`${i + 1}`, 'mono').move(RankPos, Padding + (i + 1) * LineHeight);
    rank.dx((Rank.length() - rank.length()) / 2).dy(DY);

    const animal = text(`${record.rank[i].name}`).move(AnimalPos, Padding + (i + 1) * LineHeight);
    animal.dx((Animal.length() - animal.length()) / 2).dy(DY);

    scores.push(text(`${record.rank[i].score}`, 'mono')
      .move(ScorePos, Padding + (i + 1) * LineHeight)
      .dy(DY));

    const parsedPt = parsePt(record.rank[i].pt, false);
    text(`${parsedPt}`, 'mono')
      .move(PTPos, Padding + (i + 1) * LineHeight)
      .dy(DY)
      .fill(parsedPt.startsWith('-') ? 'green' : 'red');
  }

  {
    const len = scores.reduce((mx, s) => Math.max(mx, s.length()), 0);
    for (const s of scores) {
      s.dx(len - s.length());
    }
    Score.x(scores[0].x() + scores[0].length() - Score.length() - 12);
  }

  // get your svg as string
  return canvas.svg();
}
