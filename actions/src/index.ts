import * as path from 'path';
import * as core from '@actions/core';
import klaw from 'klaw';
import { readFile } from 'fs-extra';

import { IRank, IRecord } from './types';

const RecordDir = path.join(process.cwd(), core.getInput('record'));

const Uma = core.getInput('uma').trim().split(',').map(t => Number.parseInt(t.trim()));

const TargetScore = Number.parseInt(core.getInput('target').trim());

function parseRecord(content: string) {
  const ranks: IRank[] = [];
  for (const row of content.split('\n')) {
    const splited = row.trim().split(',').map(t => t.trim());
    if (splited.length !== 2) {
      throw new Error(`Load Rank Error at: "${row}"`);
    }
    const [name, score] = splited;
    ranks.push({
      name,
      score: Number.parseInt(score),
      pt: 0
    });
  }

  if (ranks.length !== 4) {
    throw new Error(`The number of player should be 4`)
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
    ranks[i].pt = Math.round((ranks[i].score - TargetScore) / 100) + Uma[i] * 10;
  }

  return ranks;
}

function parsePt(score: number) {
  const base = (Math.abs(score) / 10).toFixed(0);
  const float = Math.abs(score) % 10;
  const text = `${base}.${float}`;
  if (base === '0' && float === 0) {
    return text;
  } else if (score > 0) {
    return `+${text}`;
  } else {
    return `-${text}`;
  }
}

function printRecords(records: IRecord[]) {
  for (const record of records) {
    core.startGroup(`Day ${record.day}, Round ${record.round} - Winner ${record.rank[0].name}`);
    for (let i = 0; i < 4; i++) {
      const { name, score, pt } = record.rank[i];
      core.info(`${i + 1}: ${name}, ${score}, ${parsePt(pt)}`)
    }
    core.endGroup();
  }
}

async function load() {
  const records: IRecord[] = [];

  for await (const file of klaw(RecordDir)) {
    if (file.stats.isFile()) {
      const filename = path.basename(file.path);
      const [day, round] = filename.trim().replace(/.\s*$/, '').split('-');
      try {
        const content = (await readFile(file.path)).toString().replace(/\r?\n/, '\n').trim();
        records.push({
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

async function run() {
  const records = await load();
  printRecords(records);
}

run();
