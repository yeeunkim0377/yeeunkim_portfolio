import { readFileSync } from 'node:fs';
import { parseFig, nodeId } from 'openfig-core';
const doc = parseFig(new Uint8Array(readFileSync('ref.figma/data center_ detail.fig')));
for (const target of ['22:612', '22:613']) {
  console.log(target, JSON.stringify(doc.nodeMap.get(target), null, 2));
}
