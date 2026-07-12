import type { JsonObject } from "@gwe/foundation";

import type { NodeId } from "./node-id";

import type { NodeInput } from "./node-input";

import type { NodeOutput } from "./node-output";

import { NodeKind } from "./node-kind";

import { NodeStatus } from "./node-status";

export interface Node {
  readonly id: NodeId;

  readonly name: string;

  readonly kind: NodeKind;

  readonly inputs: readonly NodeInput[];

  readonly outputs: readonly NodeOutput[];

  readonly config: JsonObject;

  readonly metadata: JsonObject;

  readonly status: NodeStatus;
}
