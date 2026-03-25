// === 定数 ===
const GAP = 40;
const PADDING = 100;

// === メイン処理 ===
const selection = figma.currentPage.selection;

if (selection.length === 0) {
  figma.notify("⚠️ フレームを選択してください");
  figma.closePlugin();
} else {
  const targets = selection.filter(
    (n) => n.type === "FRAME" || n.type === "SECTION"
  );
  if (targets.length === 0) {
    figma.notify("⚠️ フレームまたはセクションを選択してください");
    figma.closePlugin();
  } else {
    for (const root of targets) {
      processNode(root);
    }
    figma.notify("✅ スペーシングを適用しました（" + targets.length + "件）");
    figma.closePlugin();
  }
}

// === ノードを再帰処理 ===
function processNode(node) {
  const children = getLayoutChildren(node);
  if (children.length === 0) return;

  // SECTIONのみ再帰する。FRAMEは位置だけ動かすので中には入らない
  for (const child of children) {
    if (child.type === "SECTION") {
      processNode(child);
    }
  }

  // padding をセット（FRAMEはプロパティ、SECTIONは子座標オフセットで擬似再現）
  setPadding(node, PADDING);

  // 子の並び方向を判定して並べ直す
  const direction = detectDirection(children);
  layoutChildren(node, children, direction, PADDING, GAP);
}

// === レイアウト対象の子を取得（FRAME・SECTION・WIDGETが対象） ===
function getLayoutChildren(node) {
  if (!("children" in node)) return [];
  return node.children.filter(
    (c) => c.type === "FRAME" || c.type === "SECTION" || c.type === "WIDGET"
  );
}

// === padding をセット ===
function setPadding(node, padding) {
  if (node.type === "FRAME") {
    node.paddingTop = padding;
    node.paddingBottom = padding;
    node.paddingLeft = padding;
    node.paddingRight = padding;
  }
}

// === 縦横判定（x分散 > y分散 → 横並び） ===
function detectDirection(children) {
  if (children.length <= 1) return "vertical";
  const xs = children.map((c) => c.x);
  const ys = children.map((c) => c.y);
  return variance(xs) > variance(ys) ? "horizontal" : "vertical";
}

function variance(arr) {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
}

// === 子ノードを並べ直す ===
function layoutChildren(parent, children, direction, padding, gap) {
  const sorted = [...children].sort((a, b) =>
    direction === "horizontal" ? a.x - b.x : a.y - b.y
  );

  let cursor = padding;
  for (const child of sorted) {
    if (direction === "horizontal") {
      child.x = cursor;
      child.y = padding;
      cursor += child.width + gap;
    } else {
      child.x = padding;
      child.y = cursor;
      cursor += child.height + gap;
    }
  }

  resizeParent(parent, sorted, direction, padding, gap);
}

// === 親サイズをコンテンツに合わせて更新 ===
function resizeParent(parent, sortedChildren, direction, padding, gap) {
  let totalWidth, totalHeight;

  if (direction === "horizontal") {
    totalWidth =
      padding +
      sortedChildren.reduce((sum, c) => sum + c.width, 0) +
      gap * (sortedChildren.length - 1) +
      padding;
    totalHeight =
      padding +
      Math.max(...sortedChildren.map((c) => c.height)) +
      padding;
  } else {
    totalWidth =
      padding +
      Math.max(...sortedChildren.map((c) => c.width)) +
      padding;
    totalHeight =
      padding +
      sortedChildren.reduce((sum, c) => sum + c.height, 0) +
      gap * (sortedChildren.length - 1) +
      padding;
  }

  if (parent.type === "SECTION") {
    parent.resizeWithoutConstraints(totalWidth, totalHeight);
  } else {
    parent.resize(totalWidth, totalHeight);
  }
}
