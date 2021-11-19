import * as path from 'path';
import * as core from '@actions/core';
import klaw from 'klaw';
import { readFile } from 'fs-extra';

const RecordDir = path.join(process.cwd(), core.getInput('record'));

async function load() {
  const records: Array<{ day: number, round: number, content: string }> = [];

  for await (const file of klaw(RecordDir)) {
    if (file.stats.isFile()) {
      const filename = path.basename(file.path);
      const [day, round] = filename.trim().replace(/.\s*$/, '').split('-');
      const content = (await readFile(file.path)).toString().replace(/\r?\n/, '\n').trim();
      records.push({
        day: Number.parseInt(day),
        round: Number.parseInt(round),
        content
      });
    }
  }

  console.log(records);

  return records;
}

async function run() {
  await load();
}

run();
