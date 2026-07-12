import type { Graph } from "../graph";

import { GraphIndex } from "../graph";

import { ExecutionStepStatus } from "./execution-step-status";

import type { ExecutionPlan } from "./execution-plan";

export class ExecutionPlanner {
  public create(graph: Graph): ExecutionPlan {
    const index = new GraphIndex(graph);

    const steps = [];

    for (const node of graph.nodes) {
      const incoming = index.incomingEdges(node.id);

      const outgoing = index.outgoingEdges(node.id);

      steps.push({
        id: node.id,

        dependencies: incoming.map((edge) => edge.from),

        dependents: outgoing.map((edge) => edge.to),

        level: 0,

        parallelGroup: 0,

        status: ExecutionStepStatus.WAITING,
      });
    }

    return {
      id: "plan" as any,

      steps,
    };
  }
}
