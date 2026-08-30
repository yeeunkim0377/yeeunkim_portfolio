import { readFileSync } from 'node:fs';
import { parseFig } from 'openfig-core';
const doc = parseFig(new Uint8Array(readFileSync('ref.figma/hyundai_ card news.fig')));
for (const id of ['17:411','17:429','17:430','17:440','17:441','17:465','17:479','17:490','17:502']) {
  const node = doc.nodeMap.get(id);
  console.log(id, JSON.stringify({
    type: node.type, name: node.name, fills: node.fillPaints, strokes: node.strokePaints,
    strokeWeight: node.strokeWeight, effects: node.effects, opacity: node.opacity,
    blendMode: node.blendMode, clipsContent: node.clipsContent,
  }, null, 2));
}
