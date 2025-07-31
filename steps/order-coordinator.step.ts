import { EventConfig, StepHandler } from "motia";
import { z } from "zod";

const inputSchema = z.object({
  orderId: z.string(),
  validated: z.boolean().optional(),
  allAvailable: z.boolean().optional(),
  inventoryResults: z.array(z.any()).optional(),
  customerId: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
});

export const config: EventConfig = {
  type: "event",
  name: "OrderCoordinator",
  description:
    "Coordinates validation and inventory results before order creation",
  subscribes: ["order.validated", "inventory.checked"],
  emits: [
    {
      topic: "order.ready",
      label: "Order ready for creation",
    },
  ],
  input: inputSchema,
  flows: ["order-processing"],
};

export const handler: StepHandler<typeof config> = async (
  input,
  { logger, emit, state, traceId }
) => {
  logger.info("Order coordination started", {
    orderId: input.orderId,
    traceId,
  });

  try {
    // Track which processes have completed
    let completedTopics =
      (await state.get<string[]>(traceId, "completed.topics")) || [];
    const currentTopic =
      input.validated !== undefined ? "order.validated" : "inventory.checked";

    if (!completedTopics.includes(currentTopic)) {
      completedTopics.push(currentTopic);
      await state.set(traceId, "completed.topics", completedTopics);
    }

    // Store data from each step
    if (currentTopic === "order.validated") {
      await state.set(traceId, "order.data", input);
    } else {
      await state.set(traceId, "inventory.data", input);
    }

    const expectedTopics = ["order.validated", "inventory.checked"];
    if (!expectedTopics.every((topic) => completedTopics.includes(topic))) {
      logger.info("Waiting for other validations", {
        completed: completedTopics,
        traceId,
      });
      return;
    }

    const orderDataRaw = await state.get(traceId, "order.data");
    const inventoryDataRaw = await state.get(traceId, "inventory.data");
    const orderData =
      orderDataRaw && typeof orderDataRaw === "object" ? orderDataRaw : {};
    const inventoryData =
      inventoryDataRaw && typeof inventoryDataRaw === "object"
        ? inventoryDataRaw
        : {};

    await emit({
      topic: "order.ready",
      data: {
        ...orderData,
        ...inventoryData,
        readyForCreation: true,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Order coordination failed", { error: errorMessage, traceId });
  }
};
