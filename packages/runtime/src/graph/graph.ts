import type { JsonObject } from "@gwe/foundation";

import type { GraphId } from "./graph-id";

import type { Node } from "./node";

import type { Edge } from "./edge";

export interface Graph {
  readonly id: GraphId;

  readonly name: string;

  readonly version: string;

  readonly nodes: readonly Node[];

  readonly edges: readonly Edge[];

  readonly metadata: JsonObject;
}
