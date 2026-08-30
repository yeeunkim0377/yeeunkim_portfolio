import { readFileSync } from 'node:fs';
import { parseFig, nodeId } from 'openfig-core';

const doc = parseFig(new Uint8Array(readFileSync('ref.figma/data center_ detail.fig')));
const hex = (value) => value && Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
const page = doc.nodes.find((node) => node.type === 'CANVAS' && node.name === 'Page 1');
const roots = doc.childrenMap.get(nodeId(page)).filter((node) => node.type === 'FRAME' && node.size?.x === 1440);
for (const root of roots) {
  const descendants = [];
  const visit = (parent, offsetX = 0, offsetY = 0) => {
    for (const child of doc.childrenMap.get(nodeId(parent)) ?? []) {
      const x = offsetX + (child.transform?.m02 ?? 0);
      const y = offsetY + (child.transform?.m12 ?? 0);
      const text = child.textData?.characters?.replace(/\s+/g, ' ').trim();
      const image = child.fillPaints?.find((paint) => paint.type === 'IMAGE')?.image?.hash;
      if ((text || image) && y < 1048 && !['@yeeunkim', 'work', 'about', 'contact'].includes(text)) descendants.push({ name: child.name, text, image: hex(image), x, y, w: child.size?.x, h: child.size?.y });
      visit(child, x, y);
    }
  };
  visit(root);
  console.log(JSON.stringify({ id: nodeId(root), x: root.transform?.m02, descendants }, null, 2));
}
