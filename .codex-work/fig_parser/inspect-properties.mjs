import { readFileSync } from 'node:fs';
import { parseFig, nodeId } from 'openfig-core';

const doc = parseFig(new Uint8Array(readFileSync('ref.figma/data center_ detail.fig')));
const wantedRoots = ['22:557', '22:601', '22:657', '22:695', '22:739', '22:777'];
const hex = (value) => value && Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
const color = (paint) => paint?.color && {
  r: paint.color.r, g: paint.color.g, b: paint.color.b, a: paint.color.a,
  opacity: paint.opacity,
};

for (const rootId of wantedRoots) {
  const root = doc.nodeMap.get(rootId);
  const rows = [];
  const visit = (parent, ox = 0, oy = 0) => {
    for (const child of doc.childrenMap.get(nodeId(parent)) ?? []) {
      const x = ox + (child.transform?.m02 ?? 0);
      const y = oy + (child.transform?.m12 ?? 0);
      const imagePaint = child.fillPaints?.find((paint) => paint.type === 'IMAGE');
      const text = child.textData?.characters;
      const zoneBox = child.name === 'Rectangle 4714';
      const numbered = ['01', '02', '03'].includes(text);
      if ((imagePaint || text || zoneBox || numbered) && y < 1048) rows.push({
        id: nodeId(child), parent: child.parentIndex?.guid && `${child.parentIndex.guid.sessionID}:${child.parentIndex.guid.localID}`,
        type: child.type, name: child.name, text, x, y, w: child.size?.x, h: child.size?.y,
        radius: child.cornerRadius, radii: child.rectangleCornerRadii,
        image: hex(imagePaint?.image?.hash), imageScaleMode: imagePaint?.imageScaleMode, imageTransform: imagePaint?.transform,
        originalImageWidth: imagePaint?.originalImageWidth, originalImageHeight: imagePaint?.originalImageHeight,
        fill: color(child.fillPaints?.find((paint) => paint.type === 'SOLID')),
        fontSize: child.fontSize, fontName: child.fontName, fontWeight: child.derivedTextData?.fontMetaData?.[0]?.fontWeight,
        effects: child.effects,
      });
      visit(child, x, y);
    }
  };
  visit(root);
  console.log(JSON.stringify({ root: rootId, rows }, null, 2));
}
