import { BLOCKS, PARASITE_ADDS } from './blocks';

// Status options and their sort priority (lower = shown higher / more urgent)
export const SUPPLY_OPTIONS = ['Out', 'Ordered', 'Low', 'Half', 'Full'];
export const SUPPLY_PRIORITY = { Out: 0, Ordered: 1, Low: 2, Half: 3, Full: 4 };

export const SUPPLY_COLORS = {
  Full: '#4caf50',
  Half: '#8bc34a',
  Low: '#ff9800',
  Out: '#e53935',
  Ordered: '#42a5f5',
};

export const SUPPLY_TIER_LABELS = {
  critical: { label: 'Needs Attention', color: '#e53935' },
  low: { label: 'Running Low', color: '#ff9800' },
  good: { label: 'Well Stocked', color: '#4caf50' },
};

// Items that share the same physical product bottle
// Maps item ID → shared supply key
const SHARED_SUPPLY = {
  lymph2: 'lymph1',   // Lymphoria Drops 2nd dose = same bottle
  sfcl2: 'sfcl',      // Silver Fern Cleanse 2nd dose = same bottle
};

// Items tracked in the supply list but not (yet) scheduled in daily blocks.
// They appear in the supply tracker with no phase filtering so you can manage
// reorders for things you use situationally (flushes, cleanses, baths, etc).
export const UNSCHEDULED_SUPPLY = [
  { id: 'malic',   name: 'Malic Acid 600mg' },
  { id: 'palo',    name: 'Palo Azul Tea Bark' },
  { id: 'epsom',   name: 'Epsom Salt (pharmaceutical grade)' },
];

// Build the canonical supply item list from blocks + parasite adds
// Each entry: { id (supply key), name, itemIds (block item IDs it covers), phases }
function buildSupplyItems() {
  const seen = new Map(); // supplyKey → { name, itemIds, phases }

  const processItem = (item) => {
    const supplyKey = SHARED_SUPPLY[item.id] || item.id;

    if (seen.has(supplyKey)) {
      const existing = seen.get(supplyKey);
      existing.itemIds.add(item.id);
      for (const p of item.phases || []) existing.phases.add(p);
    } else {
      seen.set(supplyKey, {
        name: item.n,
        itemIds: new Set([item.id]),
        phases: new Set(item.phases || []),
        parasiteOnly: item.parasiteOnly || false,
      });
    }
  };

  for (const block of BLOCKS) {
    for (const item of block.items) {
      processItem(item);
    }
  }
  for (const item of PARASITE_ADDS) {
    processItem(item);
  }

  // Unscheduled items: not in any block, but tracked for reorder/supply purposes.
  // phases: [] means they show in all phases (no phase filter).
  for (const extra of UNSCHEDULED_SUPPLY) {
    if (!seen.has(extra.id)) {
      seen.set(extra.id, {
        name: extra.name,
        itemIds: new Set([extra.id]),
        phases: new Set(),
        parasiteOnly: false,
      });
    }
  }

  return Array.from(seen.entries()).map(([id, data]) => ({
    id,
    name: data.name,
    itemIds: Array.from(data.itemIds),
    phases: Array.from(data.phases).sort(),
    parasiteOnly: data.parasiteOnly,
  }));
}

export const SUPPLY_ITEMS = buildSupplyItems();

// Default supply entry for a new item
export function defaultSupplyEntry() {
  return {
    status: 'Full',
    offRoster: false,
    subscription: false,
    purchaseSource: '',
    purchaseUrl: '',
  };
}

// Sort supply items by urgency tier
export function sortBySupplyLevel(items, supplyData) {
  return [...items].sort((a, b) => {
    const sa = supplyData[a.id] || defaultSupplyEntry();
    const sb = supplyData[b.id] || defaultSupplyEntry();

    // Off-roster items always go to bottom
    if (sa.offRoster !== sb.offRoster) return sa.offRoster ? 1 : -1;
    // Subscription items sink below non-subscription at same level
    const priA = SUPPLY_PRIORITY[sa.status] ?? 4;
    const priB = SUPPLY_PRIORITY[sb.status] ?? 4;
    if (priA !== priB) return priA - priB;
    if (sa.subscription !== sb.subscription) return sa.subscription ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}

// Get tier for a supply status
export function getSupplyTier(status) {
  if (status === 'Out' || status === 'Ordered') return 'critical';
  if (status === 'Low') return 'low';
  return 'good';
}
