import { describe, expect, it } from "vitest";

import { InMemoryEventBus } from "../src/events";

describe("EventBus", () => {
  it("dispatches event", async () => {
    const bus = new InMemoryEventBus();

    let executed = false;

    bus.subscribe(
      "user.created",

      {
        async handle() {
          executed = true;
        },
      },
    );

    await bus.publish({
      id: "1",

      type: "user.created",

      occurredAt: new Date(),

      payload: {},
    });

    expect(executed).toBe(true);
  });
});
