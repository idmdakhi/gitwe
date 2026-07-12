import type { Graph } from "./graph";

import type { Node } from "./node";

import type { Edge } from "./edge";

export class GraphIndex {
  private readonly nodes = new Map<string, Node>();

  private readonly outgoing = new Map<string, Edge[]>();

  private readonly incoming = new Map<string, Edge[]>();

  public constructor(graph: Graph) {
    for (const node of graph.nodes) {
      this.nodes.set(node.id, node);

      this.outgoing.set(node.id, []);

      this.incoming.set(node.id, []);
    }

    for (const edge of graph.edges) {
      this.outgoing.get(edge.from)?.push(edge);

      this.incoming.get(edge.to)?.push(edge);
    }
  }

  public node(id: string): Node | undefined {
    return this.nodes.get(id);
  }

  public outgoingEdges(id: string): readonly Edge[] {
    return this.outgoing.get(id) ?? [];
  }

  public incomingEdges(id: string): readonly Edge[] {
    return this.incoming.get(id) ?? [];
  }
}
