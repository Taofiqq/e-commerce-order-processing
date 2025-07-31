import { ApiRouteConfig, StepHandler } from "motia";
import { z } from "zod";

export const config: ApiRouteConfig = {
  type: "api",
  name: "OrderStatusAPI",
  description: "Retrieves order status and details by order ID",
  path: "/order-status/:orderId",
  method: "GET",
  flows: ["order-processing"],
  emits: [],
};

export const handler: StepHandler<typeof config> = async (
  req,
  { logger, state }
) => {
  const { orderId } = req.pathParams as { orderId: string };
  logger.info(`Order status requested for ${orderId}`);

  try {
    const orderRecord = (await state.get(orderId, "order.record")) as any;
    const fulfillmentPlan = (await state.get(
      orderId,
      "fulfillment.plan"
    )) as any;
    const notificationRecord = (await state.get(
      orderId,
      "notification.record"
    )) as any;

    if (!orderRecord) {
      return {
        status: 404,
        body: {
          error: "Order not found",
          message: `No order found with ID: ${orderId}`,
        },
      };
    }

    const orderStatus = {
      orderId: orderRecord.id,
      status: orderRecord.status,
      amount: orderRecord.amount,
      currency: orderRecord.currency,
      createdAt: orderRecord.createdAt,
      paymentStatus: orderRecord.paymentStatus,
      fulfillment: fulfillmentPlan
        ? {
            trackingNumber: fulfillmentPlan.trackingNumber,
            estimatedShipDate: fulfillmentPlan.estimatedShipDate,
            shippingMethod: fulfillmentPlan.shippingOptions?.recommended,
            warehouseAssignments: fulfillmentPlan.fulfillmentPlan,
          }
        : null,
      notifications: notificationRecord
        ? {
            emailSent: true,
            sentAt: notificationRecord.emailSentAt,
            recipient: notificationRecord.recipient,
          }
        : null,
    };

    logger.info("Order status retrieved successfully", { orderId });

    return {
      status: 200,
      body: orderStatus,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Order status retrieval failed", {
      error: errorMessage,
      orderId,
    });

    return {
      status: 500,
      body: {
        error: "Failed to retrieve order status",
        message: errorMessage,
      },
    };
  }
};
