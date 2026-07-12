import type { JsonObject } from "@gwe/foundation";

import type { Edge } from "./edge";

import type { EdgeId } from "./edge-id";

import type { NodeId } from "./node-id";

import type { EdgeCondition } from "./edge-condition";

import { EdgeKind } from "./edge-kind";

import { EdgeStatus } from "./edge-status";

export class EdgeBuilder {
  private id!: EdgeId;

  private from!: NodeId;

  private to!: NodeId;

  private kind = EdgeKind.DEFAULT;

  private priority = 0;

  private metadata: JsonObject = {};

  private condition?: EdgeCondition;

  public withId(id: EdgeId): this {
    this.id = id;

    return this;
  }

  public fromNode(node: NodeId): this {
    this.from = node;

    return this;
  }

  public toNode(node: NodeId): this {
    this.to = node;

    return this;
  }

  public withKind(kind: EdgeKind): this {
    this.kind = kind;

    return this;
  }

  public withPriority(priority: number): this {
    this.priority = priority;

    return this;
  }

  public withCondition(condition: EdgeCondition): this {
    this.condition = condition;

    return this;
  }

  public withMetadata(metadata: JsonObject): this {
    this.metadata = metadata;

    return this;
  }

  public build(): Edge {
    return {
      id: this.id,

      from: this.from,

      to: this.to,

      kind: this.kind,

      priority: this.priority,

      condition: this.condition,

      metadata: this.metadata,

      status: EdgeStatus.IDLE,
    };
  }
}
