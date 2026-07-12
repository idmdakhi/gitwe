import type { JsonObject } from "@gwe/foundation";

import type { Graph } from "./graph";

import type { GraphId } from "./graph-id";

import type { Node } from "./node";

import type { Edge } from "./edge";

export class GraphBuilder {
  private id!: GraphId;

  private name = "";

  private version = "1.0.0";

  private readonly nodes: Node[] = [];

  private readonly edges: Edge[] = [];

  private metadata: JsonObject = {};

  public withId(id: GraphId): this {
    this.id = id;

    return this;
  }

  public withName(name: string): this {
    this.name = name;

    return this;
  }

  public withVersion(version: string): this {
    this.version = version;

    return this;
  }

  public addNode(node: Node): this {
    this.nodes.push(node);

    return this;
  }

  public addEdge(edge: Edge): this {
    this.edges.push(edge);

    return this;
  }

  public withMetadata(metadata: JsonObject): this {
    this.metadata = metadata;

    return this;
  }

  public build(): Graph {
    return {
      id: this.id,

      name: this.name,

      version: this.version,

      nodes: Object.freeze([...this.nodes]),

      edges: Object.freeze([...this.edges]),

      metadata: Object.freeze({
        ...this.metadata,
      }),
    };
  }
}
