import type { JsonObject } from "@gwe/foundation";

import type { EdgeId } from "./edge-id";

import type { NodeId } from "./node-id";

import type { EdgeCondition } from "./edge-condition";

import { EdgeKind } from "./edge-kind";

import { EdgeStatus } from "./edge-status";

export interface Edge {
  readonly id: EdgeId;

  readonly from: NodeId;

  readonly to: NodeId;

  readonly kind: EdgeKind;

  readonly priority: number;

  readonly condition?: EdgeCondition;

  readonly metadata: JsonObject;

  readonly status: EdgeStatus;
}
