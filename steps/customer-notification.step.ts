import { EventConfig, StepHandler } from "motia";
import { z } from "zod";

const inputSchema = z.object({
  orderId: z.string(),
  fulfillmentPlan: z.array(z.any()),
  shippingOptions: z.any(),
  estimatedShipDate: z.string(),
  trackingNumber: z.string(),
});

export const config: EventConfig = {
  type: "event",
  name: "CustomerNotification",
  description: "Sends order confirmation email to customer",
  subscribes: ["fulfillment.planned"],
  emits: [
    {
      topic: "notification.sent",
      label: "Notification sent",
    },
  ],
  input: inputSchema,
  flows: ["order-processing"],
};

export const handler: StepHandler<typeof config> = async (
  input,
  { logger, emit, state, traceId }
) => {
  logger.info("Customer notification started", {
    orderId: input.orderId,
    traceId,
  });

  try {
    // Get order details from state
    const orderRecord = (await state.get(traceId, "order.record")) as any;

    const emailData = {
      to: getCustomerEmail(orderRecord?.customerId), // Mock function
      subject: `Order Confirmation - ${input.orderId}`,
      template: "order_confirmation",
      data: {
        orderId: input.orderId,
        customerName: getCustomerName(orderRecord?.customerId), // Mock function
        items: input.fulfillmentPlan,
        total: orderRecord?.amount || 0,
        currency: orderRecord?.currency || "USD",
        trackingNumber: input.trackingNumber,
        estimatedDelivery: calculateDeliveryDate(input.estimatedShipDate),
        shippingMethod: input.shippingOptions?.recommended || "standard",
      },
    };

    // Send email (mock implementation)
    const emailResult = await sendEmail(emailData, logger);

    await state.set(traceId, "notification.record", {
      orderId: input.orderId,
      emailSentAt: new Date().toISOString(),
      emailId: emailResult.messageId,
      recipient: emailData.to,
    });

    logger.info("Customer notification sent successfully", {
      orderId: input.orderId,
      recipient: emailData.to,
      traceId,
    });

    // Emit notification sent event
    await emit({
      topic: "notification.sent",
      data: {
        orderId: input.orderId,
        notificationSent: true,
        emailId: emailResult.messageId,
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Customer notification failed", {
      error: errorMessage,
      traceId,
    });
  }
};

// Mock helper functions
function getCustomerEmail(customerId: string): string {
  // In real implementation,  we would query customer database
  return `customer-${customerId}@example.com`;
}

function getCustomerName(customerId: string): string {
  // In real implementation, we would query customer database
  return `Customer ${customerId}`;
}

function calculateDeliveryDate(shipDate: string): string {
  const ship = new Date(shipDate);
  const delivery = new Date(ship.getTime() + 5 * 24 * 60 * 60 * 1000); // +5 days
  return delivery.toDateString();
}

async function sendEmail(
  emailData: any,
  logger: any
): Promise<{ messageId: string }> {
  // Mock email sending - in real implementation would use SendGrid, etc.
  logger.info("📧 Sending email", {
    to: emailData.to,
    subject: emailData.subject,
  });

  return {
    messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
}
