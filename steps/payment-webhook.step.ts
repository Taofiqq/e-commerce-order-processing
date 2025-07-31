import { ApiRouteConfig, StepHandler, Handlers } from "motia";
import { z } from "zod";

const bodySchema = z.object({
  id: z.string(),
  object: z.literal("event"),
  api_version: z.string(),
  created: z.number(),
  type: z.string(),
  data: z.object({
    object: z.any(),
    previous_attributes: z.record(z.any()).optional(),
  }),
  livemode: z.boolean(),
  pending_webhooks: z.number(),
  request: z
    .object({
      id: z.string().nullable(),
      idempotency_key: z.string().nullable(),
    })
    .nullable(),
});

export const config: ApiRouteConfig = {
  type: "api",
  name: "PaymentWebhookHandler",
  description: "Receives Stripe payment webhooks and starts order processing",
  path: "/stripe-webhook",
  method: "POST",
  emits: [
    {
      topic: "payment.received",
      label: "Payment received",
    },
  ],
  bodySchema: bodySchema,
  flows: ["order-processing"],
};

export const handler: StepHandler<typeof config> = async (
  req,
  { logger, emit, traceId }
) => {
  logger.info("Stripe webhook received", { type: req.body.type, traceId });

  try {
    // Extract payment data from webhook
    const { type, data, id: eventId } = req.body;

    // Emit payment received event
    await emit({
      topic: "payment.received",
      data: {
        eventId,
        eventType: type,
        paymentData: data.object,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      status: 200,
      body: { received: true },
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Webhook processing failed", { error: errorMessage, traceId });

    return {
      status: 500,
      body: { error: "Webhook processing failed" },
    };
  }
};
