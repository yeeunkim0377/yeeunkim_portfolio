import { readFileSync } from 'node:fs';
import { parseFig, nodeId } from 'openfig-core';

const doc = parseFig(new Uint8Array(readFileSync('ref.figma/hyundai_ card news.fig')));
const hex = (value) => value && Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
const color = (paint) => paint?.color && {
  r: paint.color.r, g: paint.color.g, b: paint.color.b, a: paint.color.a, opacity: paint.opacity,
};
const page = doc.nodes.find((node) => node.type === 'CANVAS' && node.name === 'Page 1');
const roots = (doc.childrenMap.get(nodeId(page)) ?? []).filter((node) => node.type === 'FRAME' && node.size?.x === 1440);

for (const root of roots) {
  const items = [];
  const visit = (parent, ox = 0, oy = 0, depth = 0, path = '') => {
    for (const child of doc.childrenMap.get(nodeId(parent)) ?? []) {
      const lx = child.transform?.m02 ?? 0;
      const ly = child.transform?.m12 ?? 0;
      const x = ox + lx;
      const y = oy + ly;
      const imagePaint = child.fillPaints?.find((paint) => paint.type === 'IMAGE');
      const solidFill = child.fillPaints?.find((paint) => paint.type === 'SOLID');
      const solidStroke = child.strokePaints?.find((paint) => paint.type === 'SOLID');
      const text = child.textData?.characters;
      const children = doc.childrenMap.get(nodeId(child)) ?? [];
      const nextPath = `${path}/${child.name}`;
      if (text || imagePaint || solidFill || solidStroke || child.effects?.length || children.length === 0) {
        items.push({
          id: nodeId(child), parent: nodeId(parent), depth, path: nextPath,
          type: child.type, name: child.name, visible: child.visible,
          x, y, localX: lx, localY: ly, width: child.size?.x, height: child.size?.y,
          text, fontName: child.fontName, fontSize: child.fontSize,
          fontWeight: child.derivedTextData?.fontMetaData?.[0]?.fontWeight,
          lineHeight: child.lineHeight, letterSpacing: child.letterSpacing,
          fill: color(solidFill), stroke: color(solidStroke), strokeWeight: child.strokeWeight,
          cornerRadius: child.cornerRadius, opacity: child.opacity, blendMode: child.blendMode,
          image: hex(imagePaint?.image?.hash), imageScaleMode: imagePaint?.imageScaleMode,
          imageTransform: imagePaint?.transform,
          effects: child.effects,
          childCount: children.length,
        });
      }
      visit(child, x, y, depth + 1, nextPath);
    }
  };
  visit(root);
  console.log(JSON.stringify({ root: { id: nodeId(root), name: root.name, x: root.transform?.m02, y: root.transform?.m12, width: root.size?.x, height: root.size?.y }, items }, null, 2));
}
