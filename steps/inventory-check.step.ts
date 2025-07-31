import { EventConfig, StepHandler } from "motia";
import { z } from "zod";

const inputSchema = z.object({
  eventId: z.string(),
  eventType: z.string(),
  paymentData: z.any(),
  timestamp: z.string(),
});

export const config: EventConfig = {
  type: "event",
  name: "InventoryCheck",
  description: "Checks product availability across warehouses",
  subscribes: ["payment.received"],
  emits: [
    {
      topic: "inventory.checked",
      label: "Inventory checked",
    },
  ],
  input: inputSchema,
  flows: ["order-processing"],
};

export const handler: StepHandler<typeof config> = async (
  input,
  { logger, emit, traceId }
) => {
  logger.info("Inventory check started", { traceId });

  try {
    const { paymentData } = input;

    const lineItems = paymentData.line_items || [];

    // Check inventory for each item (mock implementation)
    const inventoryResults = lineItems.map((item: any) => ({
      productId: item.price?.product || "unknown",
      quantity: item.quantity || 1,
      available: true, // Mock - would check real inventory
      warehouse: "MAIN_WAREHOUSE",
    }));

    await emit({
      topic: "inventory.checked",
      data: {
        orderId: paymentData.id,
        inventoryResults,
        allAvailable: inventoryResults.every(
          (item: { available: boolean }) => item.available
        ),
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Inventory check failed", { error: errorMessage, traceId });
  }
};
