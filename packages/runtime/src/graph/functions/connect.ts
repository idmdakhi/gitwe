import type { Edge } from "../edge";

import type { Node } from "../node";

export function connect(
  from: Node,

  to: Node,

  edge: Edge,
): readonly [Node, Edge, Node] {
  return [from, edge, to];
}
