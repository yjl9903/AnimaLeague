import * as core from "@actions/core";
import { red, green } from "kolorist";

import { IRank } from "./types";

const Uma = core
  .getInput("uma")
  .trim()
  .split(",")
  .map((t) => Number.parseInt(t.trim()));

const TargetScore = Number.parseInt(core.getInput("target").trim());

export function parseRecord(content: string) {
  const ranks: IRank[] = [];
  for (const row of content.split("\n")) {
    const splited = row
      .trim()
      .split(",")
      .map((t) => t.trim());
    if (splited.length !== 2) {
      throw new Error(`Load Rank Error at: "${row}"`);
    }
    const [name, score] = splited;
    ranks.push({
      name,
      score: Number.parseInt(score),
      pt: 0,
    });
  }

  if (ranks.length !== 4) {
    throw new Error(`The number of player should be 4`);
  }

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3 - i; j++) {
      if (ranks[j].score < ranks[j + 1].score) {
        const tmp = ranks[j];
        ranks[j] = ranks[j + 1];
        ranks[j + 1] = tmp;
      }
    }
  }

  for (let i = 0; i < 4; i++) {
    ranks[i].pt =
      Math.round((ranks[i].score - TargetScore) / 100) + Uma[i] * 10;
  }

  return ranks;
}

export function parsePt(score: number) {
  const base = Math.floor(Math.abs(score) / 10);
  const float = Math.abs(score) % 10;
  const text = `${base}.${float}`;
  if (base === 0 && float === 0) {
    return text;
  } else if (score > 0) {
    return red(`+${text}`);
  } else {
    return green(`-${text}`);
  }
}
