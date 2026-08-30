import { readFileSync } from 'node:fs';
import { parseFig, nodeId } from 'openfig-core';

const doc = parseFig(new Uint8Array(readFileSync('ref.figma/hyundai_ card news.fig')));
const hex = (value) => value && Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
const page = doc.nodes.find((node) => node.type === 'CANVAS' && node.name === 'Page 1');
const pageChildren = doc.childrenMap.get(nodeId(page)) ?? [];
const roots = pageChildren.filter((node) => node.type === 'FRAME' && node.size?.x === 1440);

function scan(root, baseX = 0, baseY = 0) {
  const images = [];
  const texts = [];
  const shapes = [];
  const visit = (parent, ox = baseX, oy = baseY) => {
    for (const child of doc.childrenMap.get(nodeId(parent)) ?? []) {
      const x = ox + (child.transform?.m02 ?? 0);
      const y = oy + (child.transform?.m12 ?? 0);
      const image = child.fillPaints?.find((paint) => paint.type === 'IMAGE');
      const solid = child.fillPaints?.find((paint) => paint.type === 'SOLID');
      if (image) images.push({ id: nodeId(child), name: child.name, x, y, w: child.size?.x, h: child.size?.y, hash: hex(image.image?.hash), radius: child.cornerRadius ?? 0 });
      if (child.textData?.characters) texts.push({ id: nodeId(child), text: child.textData.characters, x, y, w: child.size?.x, h: child.size?.y, family: child.fontName?.family, style: child.fontName?.style, size: child.fontSize, weight: child.derivedTextData?.fontMetaData?.[0]?.fontWeight });
      if (solid && !image && !child.textData?.characters) shapes.push({ id: nodeId(child), type: child.type, name: child.name, x, y, w: child.size?.x, h: child.size?.y, rgba: [solid.color?.r, solid.color?.g, solid.color?.b, solid.color?.a], paintOpacity: solid.opacity, radius: child.cornerRadius ?? 0 });
      visit(child, x, y);
    }
  };
  visit(root);
  return { images, texts, shapes };
}

for (const root of roots) console.log(JSON.stringify({ id: nodeId(root), name: root.name, ...scan(root) }));
const loose = pageChildren.filter((node) => !roots.includes(node) && node.visible !== false);
for (const node of loose) console.log(JSON.stringify({ id: nodeId(node), name: `LOOSE:${node.name}`, self: { type: node.type, x: node.transform?.m02, y: node.transform?.m12, w: node.size?.x, h: node.size?.y }, ...scan(node, node.transform?.m02 ?? 0, node.transform?.m12 ?? 0) }));
