import { EventConfig, StepHandler } from "motia";
import { z } from "zod";

type Input = typeof inputSchema;

const inputSchema = z.object({
  eventId: z.string(),
  eventType: z.string(),
  paymentData: z.any(),
  timestamp: z.string(),
});

export const config: EventConfig = {
  type: "event",
  name: "OrderValidation",
  description: "Validates payment data and order details",
  subscribes: ["payment.received"],
  emits: [
    {
      topic: "order.validated",
      label: "Order validated",
    },
  ],
  input: inputSchema,
  flows: ["order-processing"],
};

export const handler: StepHandler<typeof config> = async (
  input,
  { logger, emit, traceId }
) => {
  logger.info("Order validation started", {
    eventType: input.eventType,
    traceId,
  });

  try {
    const { paymentData, eventType } = input;

    // Check if it's a successful payment event
    if (!eventType.includes("succeeded")) {
      throw new Error(`Invalid event type: ${eventType}`);
    }
    await emit({
      topic: "order.validated",
      data: {
        orderId: paymentData.id,
        customerId: paymentData.customer,
        amount: paymentData.amount,
        currency: paymentData.currency,
        validated: true,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Order validation failed", { error: errorMessage, traceId });
  }
};
