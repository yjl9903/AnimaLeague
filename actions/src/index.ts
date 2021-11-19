import * as path from "path";
import * as core from "@actions/core";
import klaw from "klaw";
import { readFile } from "fs-extra";
import { bold, blue, red, green } from "kolorist";

import { IRank, IRecord } from "./types";

const RecordDir = path.join(process.cwd(), core.getInput("record"));

const Uma = core
  .getInput("uma")
  .trim()
  .split(",")
  .map((t) => Number.parseInt(t.trim()));

const TargetScore = Number.parseInt(core.getInput("target").trim());

function parseRecord(content: string) {
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

function parsePt(score: number) {
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

function printRecords(records: IRecord[]) {
  for (const record of records) {
    core.startGroup(
      `Day ${bold(record.day)}, Round ${bold(record.round)} - ${blue('Winner')} ${record.rank[0].name}`
    );
    const maxScoreLen = record.rank.reduce(
      (mx, { score }) => Math.max(mx, score.toString().length),
      0
    );
    const ptLen = record.rank.reduce(
      (mx, { pt }) => Math.max(mx, parsePt(pt).length),
      0
    );
    for (let i = 0; i < 4; i++) {
      const { name, score, pt } = record.rank[i];
      core.info(
        `${i + 1} ${name}: ${bold(score
          .toString()
          .padStart(maxScoreLen, " "))} ${parsePt(pt).padStart(ptLen, " ")}`
      );
    }
    core.endGroup();
  }
}

function printSummary(records: IRecord[]) {
  const report = new Map<string, { name: string, round: number, pt: number }>();

  const addTo = (name: string, pt: number) => {
    if (report.has(name)) {
      const r = report.get(name)!;
      r.round = r.round + 1;
      r.pt = r.pt + pt;
    } else {
      report.set(name, { name, round: 1, pt });
    }
  };

  for (const record of records) {
    for (const rank of record.rank) {
      addTo(rank.name, rank.pt);
    }
  }

  if (report.size === 0) return ;

  const sorted = [...report.values()].sort((lhs, rhs) => {
    if (lhs.pt !== rhs.pt) {
      return rhs.pt - lhs.pt;
    } else if (lhs.round !== rhs.round) {
      return rhs.round - rhs.round;
    } else {
      return lhs.name.localeCompare(rhs.name);
    }
  });

  core.startGroup(`${bold('Summary')} - ${blue('Top')} ${sorted[0].name} ${parsePt(sorted[0].pt)}`);
  for (let i = 0; i < sorted.length; i++) {
    const { name, round, pt } = sorted[i];
    core.info(`${i + 1} ${name}: ${bold(round)} rounds ${parsePt(pt)}`);
  }
  core.endGroup();
}

async function load() {
  const records: IRecord[] = [];

  for await (const file of klaw(RecordDir)) {
    if (file.stats.isFile()) {
      const filename = path.basename(file.path);
      const [day, round] = filename.trim().replace(/.\s*$/, "").split("-");
      try {
        const content = (await readFile(file.path))
          .toString()
          .replace(/\r?\n/, "\n")
          .trim();
        records.push({
          day: Number.parseInt(day),
          round: Number.parseInt(round),
          rank: parseRecord(content),
        });
      } catch (error) {
        core.error(`In ${filename}, ${error}`);
      }
    }
  }

  return records;
}

async function run() {
  const records = await load();
  printRecords(records);
  printSummary(records);
}

run();
