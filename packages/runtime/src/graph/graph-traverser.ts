import type { Graph } from "./graph";

import { GraphIndex } from "./graph-index";

import type { Node } from "./node";

export class GraphTraverser {
  public traverse(
    graph: Graph,

    visitor: (node: Node) => void,
  ): void {
    const index = new GraphIndex(graph);

    const visited = new Set<string>();

    const stack: Node[] = [];

    if (graph.nodes.length === 0) {
      return;
    }

    stack.push(graph.nodes[0]);

    while (stack.length > 0) {
      const current = stack.pop()!;

      if (visited.has(current.id)) {
        continue;
      }

      visited.add(current.id);

      visitor(current);

      for (const edge of index.outgoingEdges(current.id)) {
        const next = index.node(edge.to);

        if (next) {
          stack.push(next);
        }
      }
    }
  }
}
