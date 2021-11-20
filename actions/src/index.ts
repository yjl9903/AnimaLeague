import * as path from "path";
import * as core from "@actions/core";
import klaw from "klaw";
import { ensureDir, readFile, writeFile } from "fs-extra";
import { bold, blue } from "kolorist";

import { IRecord } from "./types";
import { draw, setupFonts } from "./draw";
import { parsePt, parseRecord } from "./utils";

const RecordDir = path.join(process.cwd(), core.getInput("record"));

const OutDir = path.join(process.cwd(), core.getInput("outdir"));

function printRecords(records: IRecord[]) {
  for (const record of records) {
    core.startGroup(
      `Day ${bold(record.day)}, Round ${bold(record.round)} - ${blue(
        "Winner"
      )} ${record.rank[0].name}`
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
        `${i + 1} ${name}: ${bold(
          score.toString().padStart(maxScoreLen, " ")
        )} ${parsePt(pt).padStart(ptLen, " ")}`
      );
    }
    core.endGroup();
  }
}

function printSummary(records: IRecord[]) {
  const report = new Map<string, { name: string; round: number; pt: number }>();

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

  if (report.size === 0) return;

  const sorted = [...report.values()].sort((lhs, rhs) => {
    if (lhs.pt !== rhs.pt) {
      return rhs.pt - lhs.pt;
    } else if (lhs.round !== rhs.round) {
      return rhs.round - rhs.round;
    } else {
      return lhs.name.localeCompare(rhs.name);
    }
  });

  core.startGroup(
    `${bold("Summary")} - ${blue("Top")} ${sorted[0].name} ${parsePt(
      sorted[0].pt
    )}`
  );
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
      const [day, round] = filename
        .trim()
        .replace(/\.[^/.]+$/, "")
        .split("-");
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

async function drawRecords(records: IRecord[]) {
  await setupFonts();
  for (const record of records) {
    const svg = draw(record);
    await writeFile(
      path.join(OutDir, `${record.day}-${record.round}.svg`),
      svg
    );
  }
}

async function run() {
  await ensureDir(RecordDir);
  await ensureDir(OutDir);
  const records = await load();
  printRecords(records);
  printSummary(records);
  drawRecords(records);
}

run();
