import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseFig, nodeId } from 'openfig-core';

const sourceFig = 'ref.figma/data center_ detail.fig';
const extractedImages = '.codex-work/data_center_detail_analysis/images';
const assetDir = 'assets/data-center/detail';
const output = 'data-center-detail-data.js';
const floorIds = ['b1', 'floor-12', 'floor-3', 'floor-5', 'floor-6', 'floor-8'];
const ignoredText = new Set(['@yeeunkim', 'work', 'about', 'contact', '1)']);
const doc = parseFig(new Uint8Array(readFileSync(sourceFig)));
const hex = (value) => value && Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
const page = doc.nodes.find((node) => node.type === 'CANVAS' && node.name === 'Page 1');
const roots = (doc.childrenMap.get(nodeId(page)) ?? [])
  .filter((node) => node.type === 'FRAME' && node.size?.x === 1440 && node.size?.y === 1048)
  .sort((a, b) => a.transform.m02 - b.transform.m02);

function extension(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return '.png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return '.jpg';
  if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF') return '.webp';
  return '.bin';
}

function toHex(color) {
  const channel = (value) => Math.round(value * 255).toString(16).padStart(2, '0');
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`;
}

function imageHash(node) {
  return hex(node.fillPaints?.find((paint) => paint.type === 'IMAGE')?.image?.hash);
}

function copyImage(hash) {
  const bytes = doc.images.get(hash);
  const ext = extension(bytes);
  const filename = `${hash}${ext}`;
  copyFileSync(`${extractedImages}/${hash}`, `${assetDir}/${filename}`);
  return `${assetDir}/${filename}`;
}

mkdirSync(assetDir, { recursive: true });
const frames = roots.map((root, index) => {
  const items = [];
  const visit = (parent, offsetX = 0, offsetY = 0) => {
    for (const child of doc.childrenMap.get(nodeId(parent)) ?? []) {
      const x = offsetX + (child.transform?.m02 ?? 0);
      const y = offsetY + (child.transform?.m12 ?? 0);
      const children = doc.childrenMap.get(nodeId(child)) ?? [];
      const directImages = children.filter((node) => imageHash(node));
      const markerText = children.find((node) => ['01', '02', '03'].includes(node.textData?.characters));
      const markerDot = children.find((node) => node.type === 'ELLIPSE');

      if (directImages.length === 2 && directImages.length === children.length) {
        items.push({
          type: 'axon-group', x, y, w: child.size?.x, h: child.size?.y,
          children: directImages.map((image) => ({
            src: copyImage(imageHash(image)), alt: image.name,
            x: image.transform?.m02 ?? 0, y: image.transform?.m12 ?? 0,
            w: image.size?.x, h: image.size?.y,
          })),
        });
        continue;
      }

      if (markerText && markerDot) {
        items.push({
          type: 'marker', x, y, w: child.size?.x, h: child.size?.y,
          text: markerText.textData.characters,
          textX: markerText.transform?.m02 ?? 0, textY: markerText.transform?.m12 ?? 0,
          fontSize: markerText.fontSize ?? 15,
          family: markerText.fontName?.family ?? 'Gothic A1',
          weight: markerText.derivedTextData?.fontMetaData?.[0]?.fontWeight ?? 600,
          dot: { x: markerDot.transform?.m02 ?? 0, y: markerDot.transform?.m12 ?? 0, w: markerDot.size?.x, h: markerDot.size?.y },
          shadowY: 3, shadowBlur: 4, shadowOpacity: 0.78,
        });
        continue;
      }

      const text = child.textData?.characters;
      const hash = imageHash(child);
      if (y < 1048 && child.name === 'Rectangle 4714') {
        const solid = child.fillPaints?.find((paint) => paint.type === 'SOLID');
        items.push({ type: 'zone-background', x, y, w: child.size?.x, h: child.size?.y, color: toHex(solid.color) });
      }
      if (y < 1048 && text && text.trim() !== 'UI DESIGN' && !ignoredText.has(text.trim())) {
        const solid = child.fillPaints?.find((paint) => paint.type === 'SOLID');
        items.push({
          type: 'text', text, x, y, w: child.size?.x, h: child.size?.y,
          fontSize: child.fontSize === 12 ? 15 : (child.fontSize ?? 15),
          family: child.fontName?.family ?? 'Gothic A1',
          weight: child.derivedTextData?.fontMetaData?.[0]?.fontWeight ?? 400,
          color: solid?.color ? toHex(solid.color) : '#ffffff',
          nowrap: child.fontSize === 12 && /^[A-Za-z& ]+$/.test(text.trim()) ? true : undefined,
        });
      }
      if (y < 1048 && hash) {
        items.push({ type: 'image', src: copyImage(hash), alt: child.name, x, y, w: child.size?.x, h: child.size?.y, radius: child.cornerRadius ?? 0 });
      }
      visit(child, x, y);
    }
  };
  visit(root);
  const uiImageAlts = {
    b1: new Set(['지하 1층 2']),
    'floor-12': new Set(['쇼핑 1']),
    'floor-3': new Set(['스마트팜 1']),
    'floor-5': new Set(['지하 1층 2', '지하 1층 3']),
    'floor-6': new Set(['data 1']),
    'floor-8': new Set(['drone 1']),
  };
  const uiCaptionPrefixes = {
    b1: '01, 02 공간에 대한 정보와',
    'floor-12': '오프라인 공간에서 등록한 이미지는',
    'floor-3': '어플에서 식물 상태와 닉네임,',
    'floor-5': '02 미팅룸의 에약은',
  };
  for (const item of items) {
    const isUiImage = item.type === 'image' && uiImageAlts[floorIds[index]].has(item.alt);
    const isUiCaption = item.type === 'text' && item.text.startsWith(uiCaptionPrefixes[floorIds[index]] ?? '\0');
    if (isUiImage || isUiCaption) {
      item.ui = true;
      item.y += 33;
    }
  }
  if (floorIds[index] === 'b1') {
    const image = items.find((item) => item.type === 'image' && item.alt === 'b1f');
    const markers = items.filter((item) => item.type === 'marker');
    const original = { x: image.x, y: image.y, w: image.w, h: image.h };
    const targetWidth = 670.8494873046875;
    const scale = targetWidth / original.w;
    const targetHeight = original.h * scale;
    const targetX = (1440 - targetWidth) / 2;
    const targetY = (1048 - targetHeight) / 2;
    for (const marker of markers) {
      marker.x = targetX + (marker.x - original.x) * scale;
      marker.y = targetY + (marker.y - original.y) * scale;
    }
    Object.assign(image, { x: targetX, y: targetY, w: targetWidth, h: targetHeight });
  }
  const floorGuideAxon = {
    'floor-12': {
      w: 358.858, h: 175.058,
      left: { x: 0, y: 61.428, w: 168.746, h: 113.630, ix: -56.163, iy: -24.910, iw: 289.815, ih: 163.021 },
      right: { x: 144.708, y: 0, w: 214.150, h: 131.598, ix: -53.442, iy: -25.727, iw: 314.888, ih: 177.124 },
    },
    'floor-3': {
      w: 355.217, h: 154.649,
      left: { x: 0, y: 70.155, w: 164.861, h: 84.494, ix: -60.427, iy: -38.706, iw: 289.815, ih: 163.021 },
      right: { x: 141.310, y: 0, w: 213.907, h: 107.318, ix: -52.676, iy: -34.783, iw: 314.888, ih: 177.124 },
    },
    'floor-5': {
      w: 359.830, h: 167.773,
      left: { x: 0, y: 70.896, w: 168.989, h: 96.877, ix: -57.058, iy: -25.062, iw: 289.815, ih: 163.021 },
      right: { x: 141.067, y: 0, w: 218.763, h: 122.614, ix: -49.065, iy: -18.671, iw: 314.888, ih: 177.124 },
    },
    'floor-6': {
      w: 358.130, h: 147.377,
      left: { x: 0, y: 55.113, w: 168.018, h: 92.264, ix: -58.712, iy: -30.741, iw: 289.815, ih: 163.021 },
      right: { x: 142.281, y: 0, w: 215.849, h: 105.861, ix: -51.832, iy: -40.513, iw: 314.888, ih: 177.124 },
    },
    'floor-8': {
      w: 359.096, h: 152.481,
      left: { x: 0, y: 54.872, w: 164.850, h: 97.609, ix: -57.484, iy: -22.990, iw: 287.677, ih: 161.818 },
      right: { x: 144.218, y: 0, w: 214.878, h: 109.746, ix: -51.639, iy: -33.336, iw: 314.888, ih: 177.124 },
    },
  };
  const guide = floorGuideAxon[floorIds[index]];
  if (guide) {
    const group = items.find((item) => item.type === 'axon-group');
    const original = { x: group.x, y: group.y, w: group.w };
    const targetWidth = 670.8494873046875;
    const targetCenterX = 705.4784545898438;
    const targetCenterY = 567.1337127685547 + (floorIds[index] === 'floor-12' ? 0 : 15);
    const guideScale = targetWidth / guide.w;
    const targetHeight = guide.h * guideScale;
    const targetX = targetCenterX - targetWidth / 2;
    const targetY = targetCenterY - targetHeight / 2;
    const left = group.children.reduce((result, item) => item.x < result.x ? item : result);
    const right = group.children.reduce((result, item) => item.x > result.x ? item : result);
    const placePart = (part, role, spec, z) => Object.assign(part, {
      role, z,
      x: spec.x * guideScale, y: spec.y * guideScale,
      w: spec.w * guideScale, h: spec.h * guideScale,
      image: {
        x: spec.ix * guideScale, y: spec.iy * guideScale,
        w: spec.iw * guideScale, h: spec.ih * guideScale,
      },
    });
    placePart(left, 'left', guide.left, 2);
    placePart(right, 'right', guide.right, 1);
    Object.assign(group, { x: targetX, y: targetY, w: targetWidth, h: targetHeight });

    if (floorIds[index] !== 'floor-12') {
      const markerScale = targetWidth / original.w;
      for (const marker of items.filter((item) => item.type === 'marker')) {
        marker.x = targetX + (marker.x - original.x) * markerScale;
        marker.y = targetY + (marker.y - original.y) * markerScale;
      }
    }
  }
  return { id: floorIds[index], items };
});

writeFileSync(output, `(function (root) {\n  root.DataCenterDetailData = ${JSON.stringify(frames, null, 2)};\n}(typeof globalThis !== 'undefined' ? globalThis : this));\n`);
