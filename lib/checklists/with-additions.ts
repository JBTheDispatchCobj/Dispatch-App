import type { ChecklistNode } from "./types";

/**
 * Returns a deep-cloned copy of `base` where any descendant node whose `id`
 * appears as a key in `additions` gets the corresponding nodes appended to its
 * children array.
 *
 * Used to express room-class variants as deltas on top of the single-queen
 * baseline. Example: "double" adds a 'Second bed' item under 'hk_turn.bed'
 * without restating the rest of the tree.
 */
export function withAdditions(
  base: ChecklistNode,
  additions: Record<string, ChecklistNode[]>,
): ChecklistNode {
  const next: ChecklistNode = { ...base };
  if (base.children) {
    next.children = base.children.map((child) => withAdditions(child, additions));
  }
  const extras = additions[base.id];
  if (extras) {
    next.children = [...(next.children ?? []), ...extras];
  }
  return next;
}
