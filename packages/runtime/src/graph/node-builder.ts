import type { JsonObject } from "@gwe/foundation";

import type { Node } from "./node";

import type { NodeId } from "./node-id";

import { NodeKind } from "./node-kind";

import { NodeStatus } from "./node-status";

export class NodeBuilder {
  private id!: NodeId;

  private name = "";

  private kind = NodeKind.ACTION;

  private config: JsonObject = {};

  private metadata: JsonObject = {};

  public withId(id: NodeId): this {
    this.id = id;

    return this;
  }

  public withName(name: string): this {
    this.name = name;

    return this;
  }

  public withKind(kind: NodeKind): this {
    this.kind = kind;

    return this;
  }

  public withConfig(config: JsonObject): this {
    this.config = config;

    return this;
  }

  public build(): Node {
    return {
      id: this.id,

      name: this.name,

      kind: this.kind,

      inputs: [],

      outputs: [],

      config: this.config,

      metadata: this.metadata,

      status: NodeStatus.CREATED,
    };
  }
}
