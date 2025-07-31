from typing import Dict, Any, List
import json
from datetime import datetime

config = {
    "type": "event",
    "name": "FulfillmentPlanning",
    "description": "Plans order fulfillment with warehouse optimization",
    "subscribes": ["order.created"],
    "emits": [{"topic": "fulfillment.planned", "label": "Fulfillment planned"}],
    "flows": ["order-processing"],
}


def handler(input_data: Dict[str, Any], context: Dict[str, Any]) -> None:
    """
    Python fulfillment planning with warehouse optimization
    """
    logger = context["logger"]
    emit = context["emit"]
    state = context["state"]
    trace_id = context["traceId"]

    logger.info(
        f" Fulfillment planning started",
        {"orderId": input_data.get("id"), "traceId": trace_id},
    )

    try:
        # Extract order details
        order_id = input_data.get("id")
        items = input_data.get("items", [])
        customer_id = input_data.get("customerId")

        # Warehouse optimization logic
        fulfillment_plan = optimize_fulfillment(items, logger)

        # Calculate shipping options
        shipping_options = calculate_shipping(fulfillment_plan, logger)

        # Store fulfillment plan in state
        fulfillment_data = {
            "orderId": order_id,
            "fulfillmentPlan": fulfillment_plan,
            "shippingOptions": shipping_options,
            "estimatedShipDate": get_ship_date(),
            "trackingNumber": generate_tracking_number(),
        }

        state.set(trace_id, "fulfillment.plan", fulfillment_data)

        logger.info(
            f" Fulfillment planned successfully",
            {
                "orderId": order_id,
                "warehouseCount": len(fulfillment_plan),
                "traceId": trace_id,
            },
        )

        # Emit fulfillment planned event
        emit({"topic": "fulfillment.planned", "data": fulfillment_data})

    except Exception as e:
        error_message = str(e)
        logger.error(
            f" Fulfillment planning failed",
            {"error": error_message, "traceId": trace_id},
        )


def optimize_fulfillment(items: List[Dict], logger) -> List[Dict]:
    """
    Optimize warehouse assignments for order items
    """
    logger.info(" Running fulfillment optimization")

    # Mock optimization logic
    fulfillment_plan = []

    for item in items:
        warehouse_assignment = {
            "productId": item.get("productId", "unknown"),
            "quantity": item.get("quantity", 1),
            "warehouse": select_optimal_warehouse(item),
            "estimatedProcessingTime": 1,  # days
        }
        fulfillment_plan.append(warehouse_assignment)

    return fulfillment_plan


def select_optimal_warehouse(item: Dict) -> str:
    """
    Select optimal warehouse based on inventory and location
    """

    warehouses = ["EAST_COAST", "WEST_COAST", "CENTRAL"]

    product_id = item.get("productId", "default")
    warehouse_index = hash(product_id) % len(warehouses)

    return warehouses[warehouse_index]


def calculate_shipping(fulfillment_plan: List[Dict], logger) -> Dict:
    """
    Calculate shipping costs and delivery estimates
    """
    logger.info(" Calculating shipping options")

    total_weight = sum(
        item.get("quantity", 1) * 2.5 for item in fulfillment_plan
    )  # 2.5 lbs per item

    shipping_options = {
        "standard": {"cost": max(5.99, total_weight * 0.50), "days": 5},
        "expedited": {"cost": max(12.99, total_weight * 1.00), "days": 3},
        "overnight": {"cost": max(24.99, total_weight * 2.00), "days": 1},
    }

    return {
        "options": shipping_options,
        "totalWeight": total_weight,
        "recommended": "standard",
    }


def get_ship_date() -> str:
    """
    Calculate estimated ship date
    """
    from datetime import datetime, timedelta

    ship_date = datetime.now() + timedelta(days=1)
    return ship_date.isoformat()


def generate_tracking_number() -> str:
    """
    Generate tracking number
    """
    import uuid

    return f"TRK{str(uuid.uuid4())[:8].upper()}"
