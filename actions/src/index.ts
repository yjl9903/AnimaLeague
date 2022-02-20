import * as path from 'path';
import * as core from '@actions/core';
import klaw from 'klaw';
import { ensureDir, readFile, writeFile } from 'fs-extra';
import { bold, blue } from 'kolorist';

import { IRecord, Summary } from './types';
import { draw, drawSummary, setupFonts } from './draw';
import { parsePt, parseRecord } from './utils';

const RecordDir = path.join(process.cwd(), core.getInput('record'));

const OutDir = path.join(process.cwd(), core.getInput('outdir'));

function printRecords(records: IRecord[]) {
  for (const record of records) {
    core.startGroup(
      `Day ${bold(record.day)}, Round ${bold(record.round)} - ${blue('Winner')} ${
        record.rank[0].name
      }`
    );
    const maxScoreLen = record.rank.reduce(
      (mx, { score }) => Math.max(mx, score.toString().length),
      0
    );
    const ptLen = record.rank.reduce((mx, { pt }) => Math.max(mx, parsePt(pt).length), 0);
    for (let i = 0; i < 4; i++) {
      const { name, score, pt } = record.rank[i];
      core.info(
        `${i + 1} ${name}: ${bold(score.toString().padStart(maxScoreLen, ' '))} ${parsePt(
          pt
        ).padStart(ptLen, ' ')}`
      );
    }
    core.endGroup();
  }
}

function printSummary(records: IRecord[]): Summary {
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

  const sorted = [...report.values()].sort((lhs, rhs) => {
    if (lhs.pt !== rhs.pt) {
      return rhs.pt - lhs.pt;
    } else if (lhs.round !== rhs.round) {
      return rhs.round - rhs.round;
    } else {
      return lhs.name.localeCompare(rhs.name);
    }
  });

  if (report.size === 0) return sorted;

  core.startGroup(`${bold('Summary')} - ${blue('Top')} ${sorted[0].name} ${parsePt(sorted[0].pt)}`);
  for (let i = 0; i < sorted.length; i++) {
    const { name, round, pt } = sorted[i];
    core.info(`${i + 1} ${name}: ${bold(round)} rounds ${parsePt(pt)}`);
  }
  core.endGroup();

  return sorted;
}

async function load() {
  const records: IRecord[] = [];

  for await (const file of klaw(RecordDir)) {
    if (file.stats.isFile()) {
      const filename = path.basename(file.path);
      const [day, round] = filename
        .trim()
        .replace(/\.[^/.]+$/, '')
        .split('-');
      try {
        const content = (await readFile(file.path)).toString().replace(/\r?\n/, '\n').trim();
        records.push({
          filename: path.join(OutDir, `${Number.parseInt(day)}-${Number.parseInt(round)}.svg`),
          day: Number.parseInt(day),
          round: Number.parseInt(round),
          rank: parseRecord(content)
        });
      } catch (error) {
        core.error(`In ${filename}, ${error}`);
      }
    }
  }

  return records;
}

function replaceSection(raw: string, tag: string, content: string) {
  const reg = new RegExp(`<!-- START_SECTION: ${tag} -->([\s\S]*)<!-- END_SECTION: ${tag} -->`, 'g');
  raw.replace(reg, `<!-- START_SECTION: ${tag} -->\n${content}\n<!-- END_SECTION: ${tag} -->`);
}

async function drawRecords(records: IRecord[], summary: Summary) {
  await setupFonts();
  for (const record of records) {
    const svg = draw(record);
    await writeFile(record.filename, svg);
  }
  {
    const summaryFile = path.join(process.cwd(), `summary.svg`);
    const svg = drawSummary(summary);
    await writeFile(summaryFile, svg);
  }
  {
    const readme = (await readFile('README.md')).toString();
    replaceSection(readme, 'summary', '![summary](./summary.svg)');
    const day = [];
    for (const record of records) {
      if (record.round === 1) {
        day.push(`## Day ${record.day}`);
      }
      day.push(`### Round ${record.round}`);
      day.push(`![${record.day}-${record.round}](${record.filename})`);
    }
    replaceSection(readme, 'day', day.join('\n\n'));
  }
}

async function run() {
  await ensureDir(RecordDir);
  await ensureDir(OutDir);
  const records = await load();
  printRecords(records);
  const summary = printSummary(records);
  drawRecords(records, summary);
}

run();
