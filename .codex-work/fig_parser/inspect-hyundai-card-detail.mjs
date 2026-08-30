import { readFileSync } from 'node:fs';
import { parseFig, nodeId } from 'openfig-core';

const doc = parseFig(new Uint8Array(readFileSync('ref.figma/hyundai_ card news.fig')));
const rows = [];
for (const page of doc.nodes.filter((node) => node.type === 'CANVAS')) {
  const children = doc.childrenMap.get(nodeId(page)) ?? [];
  rows.push({
    page: page.name,
    children: children.map((child) => ({
      id: nodeId(child), type: child.type, name: child.name,
      x: child.transform?.m02, y: child.transform?.m12,
      width: child.size?.x, height: child.size?.y, visible: child.visible,
    })),
  });
}
console.log(JSON.stringify({ pages: rows, imageCount: doc.images.size }, null, 2));
