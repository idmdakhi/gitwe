import type { Graph } from "./graph";

export class GraphValidator {
  public validate(graph: Graph): void {
    const ids = new Set<string>();

    for (const node of graph.nodes) {
      if (ids.has(node.id)) {
        throw new Error(`Duplicate node '${node.id}'.`);
      }

      ids.add(node.id);
    }
  }
}
