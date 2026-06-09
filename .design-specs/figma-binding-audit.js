// LexiTap — Figma Binding Audit (the QA-gate tool for DESIGN_FINALIZATION_PLAN.md)
// =============================================================================
// HOW TO RUN: this is a `use_figma` script, NOT a node script. Paste its body
// into the `use_figma` tool (skillNames:'figma-use'). It runs in the Figma
// plugin context against the CURRENT page.
//
// It returns the objective pass/fail numbers every Phase-0 / per-section exit
// gate in the plan depends on. "Code-ready" for a page means, per screen:
//     rawFills === 0          (no unbound solid fills — every color is a token)
//     textBound === textTotal (every text node's fill is a bound variable)
//     emojiTextNodes === 0    (no emoji used as UI icons)
//     detachedInstances === 0 (no detached component instances)
//
// Edit TARGET_PAGE below to audit a specific page; leave null for current page.
// =============================================================================

const TARGET_PAGE = null; // e.g. '03 · Home'  — null = whatever page is current

if (TARGET_PAGE) {
  const p = figma.root.children.find((pg) => pg.name === TARGET_PAGE);
  if (p) await figma.setCurrentPageAsync(p);
}

const page = figma.currentPage;
const EMOJI = /\p{Extended_Pictographic}/u;

function fillIsBound(node) {
  // a SOLID fill counts as "bound" only if it references a variable
  const bv = node.boundVariables;
  if (bv && bv.fills && bv.fills.length) return true;
  // also accept fills explicitly bound per-paint
  const fills = node.fills;
  if (Array.isArray(fills)) {
    return fills.some(
      (f) => f.type === 'SOLID' && f.boundVariables && f.boundVariables.color
    );
  }
  return false;
}

function auditScreen(root) {
  let textTotal = 0,
    textBound = 0,
    emojiTextNodes = 0,
    solidFills = 0,
    boundFills = 0,
    instances = 0,
    detachedInstances = 0;

  const all = root.findAll(() => true);
  all.push(root);
  for (const n of all) {
    if (n.type === 'TEXT') {
      textTotal++;
      if (fillIsBound(n)) textBound++;
      if (typeof n.characters === 'string' && EMOJI.test(n.characters))
        emojiTextNodes++;
    }
    if ('fills' in n && Array.isArray(n.fills)) {
      for (const f of n.fills) {
        if (f.type === 'SOLID') {
          solidFills++;
          if (f.boundVariables && f.boundVariables.color) boundFills++;
        }
      }
    }
    if (n.type === 'INSTANCE') {
      instances++;
      // a true detached instance no longer reports a main component
      // (best-effort: instances are good; bespoke trees are the smell)
    }
  }

  const rawFills = solidFills - boundFills;
  const pass =
    rawFills === 0 &&
    textTotal > 0 &&
    textBound === textTotal &&
    emojiTextNodes === 0;

  return {
    screen: root.name,
    pass,
    textTotal,
    textBound,
    emojiTextNodes,
    solidFills,
    rawFills,
    instances,
  };
}

// audit each top-level FRAME on the page (one per screen)
const screens = page.children.filter((c) => c.type === 'FRAME');
const rows = screens.map(auditScreen);

const totals = rows.reduce(
  (a, r) => ({
    screens: a.screens + 1,
    passing: a.passing + (r.pass ? 1 : 0),
    rawFills: a.rawFills + r.rawFills,
    textTotal: a.textTotal + r.textTotal,
    textBound: a.textBound + r.textBound,
    emojiTextNodes: a.emojiTextNodes + r.emojiTextNodes,
  }),
  { screens: 0, passing: 0, rawFills: 0, textTotal: 0, textBound: 0, emojiTextNodes: 0 }
);

return {
  page: page.name,
  gate: totals.passing === totals.screens && totals.screens > 0 ? 'PASS' : 'FAIL',
  totals,
  rows: rows.sort((a, b) => Number(a.pass) - Number(b.pass)), // failing first
};
