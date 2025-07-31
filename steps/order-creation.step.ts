import { EventConfig, StepHandler } from "motia";
import { z } from "zod";

const inputSchema = z.object({
  orderId: z.string(),
  customerId: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  validated: z.boolean().optional(),
  allAvailable: z.boolean().optional(),
  inventoryResults: z.array(z.any()).optional(),
  readyForCreation: z.boolean().optional(),
});

export const config: EventConfig = {
  type: "event",
  name: "OrderCreation",
  description: "Creates official order record after all validations pass",
  subscribes: ["order.ready"],
  emits: [
    {
      topic: "order.created",
      label: "Order created",
    },
  ],
  input: inputSchema,
  flows: ["order-processing"],
};

export const handler: StepHandler<typeof config> = async (
  input,
  { logger, emit, state, traceId }
) => {
  logger.info("Order creation started", { orderId: input.orderId, traceId });

  try {
    // Create order record (mock implementation)
    const orderRecord = {
      id: input.orderId,
      customerId: input.customerId,
      amount: input.amount,
      currency: input.currency,
      status: "confirmed",
      items: input.inventoryResults || [],
      createdAt: new Date().toISOString(),
      paymentStatus: "paid",
    };

    // Store complete order in state
    await state.set(traceId, "order.record", orderRecord);

    logger.info("Order created successfully", {
      orderId: input.orderId,
      amount: input.amount,
      traceId,
    });

    // Emit order created event
    await emit({
      topic: "order.created",
      data: {
        ...orderRecord,
        orderCreated: true,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Order creation failed", { error: errorMessage, traceId });
  }
};
