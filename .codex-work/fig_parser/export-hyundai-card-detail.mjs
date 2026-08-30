import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseFig, nodeId } from 'openfig-core';

const doc = parseFig(new Uint8Array(readFileSync('ref.figma/hyundai_ card news.fig')));
const assetDir = 'assets/hyundai/card-detail';
const outputFile = 'hyundai-card-detail-data.js';
const hex = (value) => value && Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
const toHex = (color) => {
  const channel = (value) => Math.round(value * 255).toString(16).padStart(2, '0');
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`;
};
const extension = (bytes) => {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return '.png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return '.jpg';
  if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF') return '.webp';
  return '.bin';
};

const configurations = [
  { id: 'november', root: '17:411', panel: '17:429', textRoot: '17:430' },
  { id: 'june', root: '17:440', panel: '17:441' },
  { id: 'october', root: '17:465', panel: '17:479' },
  { id: 'april', root: '17:490', panel: '17:502' },
];

mkdirSync(assetDir, { recursive: true });

function descendants(root, baseX = 0, baseY = 0) {
  const items = [];
  const visit = (parent, ox, oy) => {
    for (const child of doc.childrenMap.get(nodeId(parent)) ?? []) {
      const x = ox + (child.transform?.m02 ?? 0);
      const y = oy + (child.transform?.m12 ?? 0);
      items.push({ node: child, x, y });
      visit(child, x, y);
    }
  };
  visit(root, baseX, baseY);
  return items;
}

const frames = configurations.map((configuration) => {
  const root = doc.nodeMap.get(configuration.root);
  const nodes = descendants(root);
  const imageNodes = nodes.filter(({ node }) => node.fillPaints?.some((paint) => paint.type === 'IMAGE'));
  const images = imageNodes.map(({ node, x, y }, index) => {
    const paint = node.fillPaints.find((candidate) => candidate.type === 'IMAGE');
    const hash = hex(paint.image?.hash);
    const bytes = doc.images.get(hash);
    const ext = extension(bytes);
    const filename = `${configuration.id}-${String(index + 1).padStart(2, '0')}${ext}`;
    writeFileSync(`${assetDir}/${filename}`, bytes);
    return { src: `${assetDir}/${filename}`, alt: `${configuration.id} card news ${index + 1}`, x, y, w: node.size?.x, h: node.size?.y };
  });

  const panelNode = doc.nodeMap.get(configuration.panel);
  const panelPaint = panelNode.fillPaints?.find((paint) => paint.type === 'SOLID');
  const panel = {
    x: panelNode.transform?.m02 ?? 0, y: panelNode.transform?.m12 ?? 0,
    w: panelNode.size?.x, h: panelNode.size?.y,
    color: toHex(panelPaint.color), opacity: panelPaint.opacity ?? 1,
  };

  const textNodes = configuration.textRoot
    ? descendants(doc.nodeMap.get(configuration.textRoot), doc.nodeMap.get(configuration.textRoot).transform?.m02 ?? 0, doc.nodeMap.get(configuration.textRoot).transform?.m12 ?? 0)
    : nodes;
  const texts = textNodes.filter(({ node }) => node.textData?.characters).map(({ node, x, y }) => {
    const paint = node.fillPaints?.find((candidate) => candidate.type === 'SOLID');
    return {
      text: node.textData.characters, x, y, w: node.size?.x, h: node.size?.y,
      family: node.fontName?.family ?? 'Gothic A1', size: node.fontSize ?? 15,
      weight: node.derivedTextData?.fontMetaData?.[0]?.fontWeight ?? 400,
      color: paint?.color ? toHex(paint.color) : '#1e1e1e',
    };
  });

  return { id: configuration.id, images, panel, texts };
});

writeFileSync(outputFile, `(function (root) {\n  root.HyundaiCardDetailData = ${JSON.stringify(frames, null, 2)};\n}(typeof globalThis !== 'undefined' ? globalThis : this));\n`);
console.log(JSON.stringify(frames.map((frame) => ({ id: frame.id, images: frame.images.length, texts: frame.texts.length, panel: frame.panel })), null, 2));
