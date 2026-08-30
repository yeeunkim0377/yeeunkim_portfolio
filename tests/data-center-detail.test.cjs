const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('../data-center-core.js');
require('../data-center-detail-data.js');
const detailFrames = globalThis.DataCenterDetailData;

function nearlyEqual(actual, expected, epsilon = 0.01) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} must be within ${epsilon} of ${expected}`);
}

test('floor detail navigation advances upward and stops at the top floor', () => {
  const order = ['b1', 'floor-12', 'floor-3', 'floor-5', 'floor-6', 'floor-8'];

  assert.equal(core.nextFloorIndex(0, order.length), 1);
  assert.equal(core.nextFloorIndex(4, order.length), 5);
  assert.equal(core.nextFloorIndex(5, order.length), 5);
});

test('floor detail navigation moves downward and stops at B1F', () => {
  assert.equal(core.previousFloorIndex(5, 6), 4);
  assert.equal(core.previousFloorIndex(1, 6), 0);
  assert.equal(core.previousFloorIndex(0, 6), 0);
  assert.equal(core.isBottomFloor(0), true);
  assert.equal(core.isBottomFloor(1), false);
});

test('Figma image fill transforms resolve to complete source bounds inside fixed frames', () => {
  const bounds = core.detailImageFillBounds(
    { w: 282.23834228515625, h: 91.94873046875 },
    { m00: 0.7975544929504395, m02: 0.05782843008637428, m11: 0.3677842915058136, m12: 0.2820601463317871 },
  );

  nearlyEqual(bounds.x, -20.464307315419454);
  nearlyEqual(bounds.y, -70.51707473653131);
  nearlyEqual(bounds.w, 353.8796969735016);
  nearlyEqual(bounds.h, 250.00722595379406);
});

test('1F rounded interior renders retain their Figma fill transforms', () => {
  const firstFloor = detailFrames.find((frame) => frame.id === 'floor-12');
  const transformed = firstFloor.items.filter((item) => item.type === 'image' && item.radius === 10 && item.fillTransform);
  assert.deepEqual(
    transformed.map((item) => item.alt),
    ['데이터라운지_쇼데월 3', '1층 쇼데월(프레임x) 2', '[최종] 수공간_탑뷰 3', '[최종] 수공간_정면 2'],
  );
});

test('3-4F Green Terrace uses the supplied Figma export at fixed geometry with 10px corners', () => {
  const floor = detailFrames.find((frame) => frame.id === 'floor-3');
  const photos = floor.items.filter((item) => item.type === 'image' && item.radius === 10);

  assert.equal(photos[0].src, 'assets/data-center/detail/fae5f4f8b19bb0591845e419877dd71399fea68b.png');
  assert.deepEqual([photos[0].x, photos[0].y, photos[0].w, photos[0].h], [64.4697265625, 294.969482421875, 282.45196533203125, 508.5]);
  assert.equal(photos[0].radius, 10);
  assert.equal(photos[0].figmaFilter, undefined);
  assert.ok(photos.every((item) => item.fillTransform), 'both rounded 3-4F images must use their Figma fill transforms');
});

test('3-4F Smart Farm photo and its lower caption retain their prior positions', () => {
  const floor = detailFrames.find((frame) => frame.id === 'floor-3');
  const photo = floor.items.find((item) => item.alt === '1009 스팜 렌더 최종 1');
  const labels = floor.items.filter((item) => item.type === 'text' && ['01', 'Green Terrace', '복층의 수직 정원으로, 산책로에 자신의 식물을 확인할\n수 있는 키오스크가 배치되어 있습니다.'].includes(item.text));

  nearlyEqual(photo.x, 64.4697265625);
  assert.deepEqual(labels.map((item) => item.x), [45.92169189453125, 66.27667236328125, 63.92169189453125]);
});

test('3-4F right Smart Farm render and its lower copy move right together by 150px', () => {
  const floor = detailFrames.find((frame) => frame.id === 'floor-3');
  const group = floor.items.filter((item) => ['image', 'text'].includes(item.type) && (item.alt === '[최종] 스마트팜_정면 1'
    || ['02', 'Smart Farm', '토마토, 상추, 파프리카 등 다양한 식물을 재배할 수 있습니다.\n시민들은 스마트팜에서 자신의 식물을 재배합니다.'].includes(item.text)));

  assert.deepEqual(group.map((item) => item.x), [1149.109375, 1170.9365234375, 1167.04296875, 1149.109375]);
});

test('3-4F left axonometric piece uses the supplied fixed image without geometry changes', () => {
  const floor = detailFrames.find((frame) => frame.id === 'floor-3');
  const left = floor.items.find((item) => item.type === 'axon-group').children.find((child) => child.role === 'left');

  assert.equal(left.src, 'assets/data-center/fixed_3-4f.png');
  assert.deepEqual([left.x, left.y, left.w, left.h, left.z], [0, 113, 311.350293838803, 159.57219553208958, 2]);
  assert.equal(left.image, undefined, 'the supplied fixed image must fit the existing left frame without an inner crop');
});

test('floor detail pages omit ambiguous floor-number labels beside the up button', () => {
  const labels = detailFrames.flatMap((frame) => frame.items)
    .filter((item) => item.type === 'text' && /^(?:\d+|\d+-\d+)F\.$/.test(item.text))
    .map((item) => item.text);

  assert.deepEqual(labels, []);
});

test('floor detail pages omit centered current-floor labels', () => {
  const labels = new Set(['B1F.', '1-2F', '3-4F', '5F', '6-7F', '8-9F']);
  assert.equal(detailFrames.flatMap((frame) => frame.items).filter((item) => item.type === 'text' && labels.has(item.text)).length, 0);
});

test('1F Water Space moves right by 170px without changing either image size', () => {
  const floor = detailFrames.find((frame) => frame.id === 'floor-12');
  const group = floor.items.filter((item) => ['image', 'text'].includes(item.type) && (['[최종] 수공간_탑뷰 3', '[최종] 수공간_정면 2'].includes(item.alt)
    || ['02', 'Water Space'].includes(item.text) || item.text?.startsWith('수공간을 매개로')));

  assert.deepEqual(group.map((item) => item.x), [1169.109375, 1190.9365234375, 1187.04296875, 1169.109375, 1004.1806640625]);
  assert.deepEqual(
    group.filter((item) => item.type === 'image').map((item) => [item.w, item.h]),
    [[355.359375, 217.07566833496094], [155.64541625976562, 104.236328125]],
  );
});

test('1F Shopping Data wall images and copy move left together by 40px', () => {
  const floor = detailFrames.find((frame) => frame.id === 'floor-12');
  const group = floor.items.filter((item) => ['image', 'text'].includes(item.type) && (['데이터라운지_쇼데월 3', '1층 쇼데월(프레임x) 2'].includes(item.alt)
    || ['03', 'Shopping Data wall', '외부 창을 통해서 시민을 유입시키는 공간입니다'].includes(item.text) || item.text?.startsWith('동성로의 쇼핑')));

  assert.deepEqual(group.map((item) => item.x), [394.365234375, 96.31865936517625, 725.328125, 749.0166015625, 743.328125, 113.0573272705078]);
  assert.equal(group.at(-1).nowrap, true, 'the exterior-window caption must remain on one line');
});

test('floor detail navigation resolves every clickable floor to its fixed position', () => {
  const order = ['b1', 'floor-12', 'floor-3', 'floor-5', 'floor-6', 'floor-8'];

  assert.equal(core.floorIndexOf('b1', order), 0);
  assert.equal(core.floorIndexOf('floor-5', order), 3);
  assert.equal(core.floorIndexOf('floor-8', order), 5);
  assert.equal(core.floorIndexOf('floor-9', order), -1);
});

test('the detail closes only for Escape or a direct backdrop click', () => {
  assert.equal(core.shouldCloseDetail({ key: 'Escape' }), true);
  assert.equal(core.shouldCloseDetail({ backdrop: true }), true);
  assert.equal(core.shouldCloseDetail({ key: 'ArrowUp' }), false);
  assert.equal(core.shouldCloseDetail({ backdrop: false }), false);
});

test('only the final floor disables upward navigation', () => {
  assert.equal(core.isTopFloor(4, 6), false);
  assert.equal(core.isTopFloor(5, 6), true);
});

test('the full-screen detail canvas scales uniformly to the viewport', () => {
  assert.equal(core.detailCanvasScale(1440, 1048), 1);
  assert.equal(core.detailCanvasScale(720, 524), 0.5);
  assert.equal(core.detailCanvasScale(1920, 1080), 1080 / 1048);
});

test('every floor detail renders its Figma zone color behind the title', () => {
  const expected = {
    b1: '#8db7fa',
    'floor-12': '#8db7fa',
    'floor-3': '#9ad194',
    'floor-5': '#ffcc54',
    'floor-6': '#696969',
    'floor-8': '#8c65c1',
  };

  for (const frame of detailFrames) {
    assert.equal(frame.items.find((item) => item.type === 'zone-background')?.color, expected[frame.id]);
  }
});

test('all six floor details render explanatory copy at no less than 15px', () => {
  assert.equal(detailFrames.length, 6);
  for (const frame of detailFrames) {
    const undersized = frame.items.filter((item) => item.type === 'text' && item.fontSize < 15);
    assert.deepEqual(undersized, [], `${frame.id} still contains explanatory text below 15px`);
  }
});

test('space names stay on one line while explanatory paragraphs may wrap', () => {
  const expectedSpaceNames = [
    'Data Curation Zone', 'Data Debating Zone', 'Data Exhibition', 'Data Forum & Meeting room',
    'Data Library', 'Drone Exhibition', 'Drone Station', 'Drone playground', 'Exhibition zone',
    'Green Terrace', 'Server Trail', 'Shopping Data wall', 'Smart Farm', 'System', 'Water Space',
    '외부 창을 통해서 시민을 유입시키는 공간입니다',
  ];
  const spaceNames = detailFrames
    .flatMap((frame) => frame.items)
    .filter((item) => item.type === 'text' && item.nowrap)
    .map((item) => item.text.trim())
    .sort();

  assert.deepEqual(spaceNames, expectedSpaceNames.slice().sort());
  assert.equal(core.detailTextWhiteSpace({ nowrap: true }), 'nowrap');
  assert.equal(core.detailTextWhiteSpace({ text: '설명 문장' }), 'pre-wrap');
  assert.equal(core.detailTextWhiteSpace({ preserveBreaks: true }), 'pre');
});

test('explanatory text width can end at the associated interior image edge', () => {
  const item = { type: 'text', x: 100, y: 500, w: 200 };
  const image = { type: 'image', x: 100, y: 250, w: 350, h: 220 };
  assert.equal(core.detailTextWidth(item, [image]), 350);
  assert.equal(core.detailTextWidth({ ...item, nowrap: true }, [image]), 200);
});

test('Figma interior photographs retain their ten pixel corner radius', () => {
  const interiors = detailFrames.flatMap((frame) => frame.items.filter((item) => item.type === 'image' && item.radius === 10));
  assert.ok(interiors.length >= 12, 'the rounded interior image layers were not exported');
  assert.ok(interiors.every((item) => item.radius === 10));
});

test('each split axonometric floor is exported as one centered group', () => {
  const splitFloors = detailFrames.filter((frame) => frame.id !== 'b1');
  for (const frame of splitFloors) {
    const groups = frame.items.filter((item) => item.type === 'axon-group');
    assert.equal(groups.length, 1, `${frame.id} must have one axonometric group`);
    assert.equal(groups[0].children.length, 2, `${frame.id} must preserve its left and right halves`);
  }
});

test('1F axonometric halves reuse the floor-guide crop without distorting the 16:9 sources', () => {
  const frame = detailFrames.find((item) => item.id === 'floor-12');
  const group = frame.items.find((item) => item.type === 'axon-group');
  const left = group.children.find((item) => item.role === 'left');
  const right = group.children.find((item) => item.role === 'right');
  const scale = group.w / 358.858;

  assert.ok(left && right, '1F must identify its left and right image halves');
  assert.ok(left.z > right.z, 'the left half must render above the right half');
  nearlyEqual(left.w - right.x, 24.038 * scale);
  nearlyEqual(left.image.w / left.image.h, 16 / 9, 0.001);
  nearlyEqual(right.image.w / right.image.h, 16 / 9, 0.001);
  nearlyEqual(left.image.x, -56.163 * scale);
  nearlyEqual(right.image.x, -53.442 * scale);
});

test('upper-floor axonometric groups sit fifteen pixels below 1F with their markers', () => {
  const firstFloor = detailFrames.find((frame) => frame.id === 'floor-12');
  const reference = firstFloor.items.find((item) => item.type === 'axon-group');
  const expectedHeights = {
    'floor-3': 292.06429411369004,
    'floor-5': 312.78779155036915,
    'floor-6': 276.06674919862326,
    'floor-8': 284.8592038722404,
  };
  const expectedMarkerYs = {
    'floor-3': [570.6709753691123, 504.4313839694715],
    'floor-5': [571.3637206256865, 622.2876081305712, 522.805321221715],
    'floor-6': [618.1863797863019, 533.5366564650063],
    'floor-8': [624.9613655562121, 541.1320090488151],
  };

  for (const frame of detailFrames.filter((item) => expectedHeights[item.id])) {
    const group = frame.items.find((item) => item.type === 'axon-group');
    const left = group.children.find((item) => item.role === 'left');
    const right = group.children.find((item) => item.role === 'right');

    nearlyEqual(group.w, reference.w);
    nearlyEqual(group.h, expectedHeights[frame.id]);
    nearlyEqual(group.x + group.w / 2, reference.x + reference.w / 2);
    nearlyEqual(group.y + group.h / 2, reference.y + reference.h / 2 + 15);
    assert.ok(left && right && left.z > right.z, `${frame.id} left half must render above the right half`);
    if (left.image) nearlyEqual(left.image.w / left.image.h, 16 / 9, 0.001);
    nearlyEqual(right.image.w / right.image.h, 16 / 9, 0.001);
    assert.ok(left.w > right.x, `${frame.id} image halves must overlap`);
    frame.items.filter((item) => item.type === 'marker').forEach((marker, index) => {
      nearlyEqual(marker.y, expectedMarkerYs[frame.id][index]);
    });
  }
});

test('B1F central image matches the 1F width at page center and carries its markers with it', () => {
  const basement = detailFrames.find((item) => item.id === 'b1');
  const firstFloor = detailFrames.find((item) => item.id === 'floor-12');
  const image = basement.items.find((item) => item.type === 'image' && item.alt === 'b1f');
  const firstFloorAxon = firstFloor.items.find((item) => item.type === 'axon-group');
  const markers = Object.fromEntries(
    basement.items.filter((item) => item.type === 'marker').map((item) => [item.text, item]),
  );

  nearlyEqual(image.w, firstFloorAxon.w);
  nearlyEqual(image.x + image.w / 2, 720);
  nearlyEqual(image.y + image.h / 2, 524);
  nearlyEqual(image.w / image.h, 539.7591552734375 / 307.396484375, 0.001);
  nearlyEqual(markers['01'].x, 679.5804606940153);
  nearlyEqual(markers['01'].y, 475.12624122496806);
  nearlyEqual(markers['02'].x, 827.7530465038171);
  nearlyEqual(markers['02'].y, 500.38656630717753);
  nearlyEqual(markers['03'].x, 722.2545950706574);
  nearlyEqual(markers['03'].y, 581.7135677849477);
});

test('floor details omit the UI DESIGN title above the UI screenshots', () => {
  for (const frame of detailFrames) {
    const labels = frame.items.filter((item) => item.type === 'text' && item.text === 'UI DESIGN');
    assert.equal(labels.length, 0, `${frame.id} must not render a UI DESIGN label`);
  }
});

test('UI screenshots and their captions sit thirty-three pixels below their Figma positions', () => {
  const expectedY = {
    b1: [540.0319213867188, 770.6031494140625],
    'floor-12': [857.224609375, 540.03515625],
    'floor-3': [540.03515625, 755.60546875],
    'floor-5': [620.82421875, 715.4894409179688, 693.434814453125],
    'floor-6': [540.03515625],
    'floor-8': [540.03515625],
  };

  for (const frame of detailFrames) {
    const uiItems = frame.items.filter((item) => item.ui === true);
    assert.deepEqual(uiItems.map((item) => item.y), expectedY[frame.id], `${frame.id} UI elements must move together`);
  }
});

test('B1F, 1F, and 3-4F restore their UI decorative dash lines', () => {
  const expected = { b1: [1091, 509, 36, 395, 'left'], 'floor-12': [770, 862, 322, 0, 'top'], 'floor-3': [1397.06396484375, 483, 43, 376, 'right'] };
  for (const [id, values] of Object.entries(expected)) {
    const line = detailFrames.find((frame) => frame.id === id).items.find((item) => item.type === 'dash-line');
    assert.ok(line);
    assert.deepEqual([line.x, line.y, line.w, line.h, line.side], values);
  }
});

test('axonometric number markers include the Figma dot and requested shadow', () => {
  for (const frame of detailFrames) {
    const markers = frame.items.filter((item) => item.type === 'marker');
    assert.ok(markers.length >= 1, `${frame.id} must expose its axonometric markers`);
    for (const marker of markers) {
      assert.equal(marker.shadowY, 3);
      assert.equal(marker.shadowOpacity, 0.78);
      assert.equal(marker.dot.w, 3.27783203125);
      assert.equal(marker.dot.h, 3.27783203125);
    }
  }
});
