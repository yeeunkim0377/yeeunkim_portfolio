import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFig, nodeId, resolveVectorNodePaths, extractRenderableGradientFill, resolveGradientGeometry } from 'openfig-core';

const workspace = resolve('../..');
const doc = parseFig(new Uint8Array(readFileSync(resolve(workspace, 'ref.figma/pleats mama.fig'))));
const target = doc.nodeMap.get('24:5');
const hex = (value) => value && (typeof value === 'string' ? value : Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join(''));
const excluded = new Set(['24:7', '24:8', '24:9', '24:10', '24:11', '24:12', '24:13', '24:14', '24:130']);

const byteExtension = (bytes) => {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return '.jpg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return '.png';
  if (String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return '.webp';
  return '.bin';
};

const color = (value, opacity = 1) => {
  if (!value) return null;
  const a = (value.a ?? 1) * opacity;
  const channels = [value.r, value.g, value.b].map((channel) => Math.round(channel * 255));
  return `rgba(${channels[0]},${channels[1]},${channels[2]},${Number(a.toFixed(4))})`;
};

const firstSolid = (paints) => {
  const paint = paints?.find((item) => item.visible !== false && item.type === 'SOLID');
  return paint ? color(paint.color, paint.opacity ?? 1) : null;
};

const gradientCss = (node) => {
  const gradient = extractRenderableGradientFill(node.fillPaints);
  if (!gradient || !node.size) return null;
  const geometry = resolveGradientGeometry(gradient, node.size.x, node.size.y);
  if (!geometry) return null;
  const stops = gradient.stops.map((stop) => `${color(stop.color, gradient.opacity)} ${Number((stop.position * 100).toFixed(3))}%`).join(',');
  if (geometry.type === 'linear') {
    const angle = Math.atan2(geometry.end.y - geometry.start.y, geometry.end.x - geometry.start.x) * 180 / Math.PI + 90;
    return `linear-gradient(${Number(angle.toFixed(3))}deg,${stops})`;
  }
  return `radial-gradient(ellipse at ${geometry.center.x}px ${geometry.center.y}px,${stops})`;
};

const saveImage = (node) => {
  const paint = node?.fillPaints?.find((item) => item.visible !== false && item.type === 'IMAGE');
  const hash = hex(paint?.image?.hash);
  if (!hash) return null;
  const bytes = doc.images.get(hash);
  if (!bytes) throw new Error(`Missing embedded image ${hash} for ${nodeId(node)}`);
  const fileName = `${hash}${byteExtension(bytes)}`;
  mkdirSync(resolve(workspace, 'assets/pleats-mama'), { recursive: true });
  writeFileSync(resolve(workspace, 'assets/pleats-mama', fileName), bytes);
  return `assets/pleats-mama/${fileName}`;
};

const vectorPaths = (node) => {
  if (!['VECTOR', 'LINE', 'REGULAR_POLYGON', 'STAR'].includes(node.type)) return [];
  try {
    const result = resolveVectorNodePaths(doc, node);
    return [
      ...result.fill.map((item) => ({ d: item.svgPath, kind: 'fill', color: firstSolid(item.paints) ?? firstSolid(node.fillPaints) ?? 'transparent', rule: item.windingRule ?? 'nonzero' })),
      ...result.stroke.map((item) => ({ d: item.svgPath, kind: 'stroke', color: firstSolid(item.paints) ?? firstSolid(node.strokePaints) ?? '#000' })),
    ];
  } catch {
    return [];
  }
};

function serialize(node) {
  const id = nodeId(node);
  if (!id || excluded.has(id) || node.visible === false) return null;
  const baseline = node.derivedTextData?.baselines?.[0];
  const imagePaint = node.fillPaints?.find((item) => item.type === 'IMAGE');
  return {
    id,
    type: node.type,
    name: node.name,
    visible: true,
    opacity: node.opacity ?? 1,
    transform: node.transform ?? { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    size: node.size ?? { x: 0, y: 0 },
    clip: node.frameMaskDisabled === false,
    radius: node.cornerRadius ?? 0,
    fill: firstSolid(node.fillPaints),
    gradient: gradientCss(node),
    stroke: firstSolid(node.strokePaints),
    strokeWidth: node.strokeWeight ?? 0,
    dash: node.dashPattern ?? null,
    src: saveImage(node),
    imageScaleMode: imagePaint?.imageScaleMode ?? 'FILL',
    fillTransform: imagePaint?.transform ?? null,
    text: node.textData?.characters ?? null,
    fontFamily: node.fontName?.family ?? 'Gothic A1',
    fontSize: node.fontSize ?? null,
    fontWeight: node.derivedTextData?.fontMetaData?.[0]?.fontWeight ?? null,
    lineHeight: baseline?.lineHeight ?? null,
    textAlign: node.textAlignHorizontal?.toLowerCase() ?? null,
    paths: vectorPaths(node),
    children: (doc.childrenMap.get(id) ?? []).map(serialize).filter(Boolean),
  };
}

const toJs = (value, indent = 0) => {
  const space = '  '.repeat(indent);
  if (value === null) return 'null';
  if (typeof value === 'string') return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'").replaceAll('\n', '\\n').replaceAll('\r', '')}'`;
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return value.length ? `[\n${value.map((item) => `${'  '.repeat(indent + 1)}${toJs(item, indent + 1)}`).join(',\n')}\n${space}]` : '[]';
  const entries = Object.entries(value).filter(([, item]) => item !== undefined);
  return entries.length ? `{\n${entries.map(([key, item]) => `${'  '.repeat(indent + 1)}${key}: ${toJs(item, indent + 1)}`).join(',\n')}\n${space}}` : '{}';
};

if (process.argv[2] === 'export') {
const perspectiveSpecs = [
    { main: '24:130', plan: '24:6', label: '24:28', copy: '24:133', marker: '24:135' },
    { main: '24:137', plan: '24:138', label: '24:160', copy: '24:264', marker: '24:266' },
    { main: '24:396', plan: '24:268', label: '24:290', copy: '24:394', marker: '24:397' },
    { main: '24:400', plan: '24:399', label: '24:422', copy: '24:526', marker: '24:528' },
];

const perspectivePlanAssets = new Map([
  ['24:6', 'assets/pleats-mama/floorplan-1f-custom.png'],
  ['24:138', 'assets/pleats-mama/floorplan-2f-custom.png'],
  ['24:268', 'assets/pleats-mama/floorplan-2f-custom.png'],
  ['24:399', 'assets/pleats-mama/floorplan-1f-custom.png'],
]);

const perspectiveMarkerOverrides = new Map([
  ['24:135', { size: { x: 71.27127385250128, y: 139.4523523182987 }, transform: { m00: 1, m01: 0, m02: 1119.4678707199944, m10: 0, m11: 1, m12: 3124.6249308352362 } }],
  ['24:266', { size: { x: 73.34452540457825, y: 141.68487689129313 }, transform: { m00: 1, m01: 0, m02: 1016.7734399066318, m10: 0, m11: 1, m12: 3125.410835828898 } }],
  ['24:397', { size: { x: 69.28323591427123, y: 54.058527765576024 }, transform: { m00: 1, m01: 0, m02: 1128.1658029639, m10: 0, m11: 1, m12: 3124.8639776970094 } }],
  ['24:528', { size: { x: 42.74368231046931, y: 137.9090952328481 }, transform: { m00: 1, m01: 0, m02: 1211.2907819183863, m10: 0, m11: 1, m12: 3125.165642932852 } }],
]);

  const perspectives = perspectiveSpecs.map((spec) => {
    const main = doc.nodeMap.get(spec.main);
    const plan = doc.nodeMap.get(spec.plan);
    const planPaint = plan.fillPaints?.find((item) => item.type === 'IMAGE');
    const marker = doc.nodeMap.get(spec.marker);
    const markerOverride = perspectiveMarkerOverrides.get(spec.marker);
    return {
      main: { id: spec.main, src: saveImage(main), size: main.size, transform: main.transform },
    plan: {
      id: spec.plan,
      src: perspectivePlanAssets.get(spec.plan) ?? saveImage(plan),
        size: plan.size,
        transform: plan.transform,
        fillTransform: planPaint?.transform ?? null,
        imageScaleMode: planPaint?.imageScaleMode ?? 'FILL',
      },
      floorLabel: doc.nodeMap.get(spec.label)?.textData?.characters ?? '',
      description: doc.nodeMap.get(spec.copy)?.textData?.characters ?? '',
      marker: {
        size: markerOverride?.size ?? marker.size,
        transform: markerOverride?.transform ?? marker.transform,
        fill: firstSolid(marker.fillPaints),
      },
    };
  });
  const layers = (doc.childrenMap.get(nodeId(target)) ?? []).map(serialize).filter(Boolean);
  const data = {
    rootId: '24:5',
    sourceWidth: 1440,
    sourceHeight: 4097,
    hero: saveImage(doc.nodeMap.get('24:7')),
    perspective: saveImage(doc.nodeMap.get('24:130')),
    perspectiveNode: { id: '24:130' },
    perspectives,
    layers,
  };
  writeFileSync(resolve(workspace, 'pleats-mama-data.js'), `(function(root){\n  root.PleatsMamaFigma = ${toJs(data, 1)};\n})(typeof window === 'undefined' ? globalThis : window);\n`);
  console.log(`Exported ${layers.length} root layers; ${doc.images.size} embedded images available.`);
  process.exit(0);
}

console.log(JSON.stringify({ id: nodeId(target), type: target.type, name: target.name, w: target.size?.x, h: target.size?.y }));
