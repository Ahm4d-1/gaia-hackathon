import { DynamicTool } from "langchain/tools";
import { Api } from "@/types/Api.ts";

type Input = {
  room_number: number;
  special_note?: string;
  food_order_items: {
    food_item_id: number | string;
    quantity: number;
  }[];
};

export const orderFoodTool = new DynamicTool({
  name: "order food",
  description: `useful for reporting an issue to the hotel staff. The input is a JSON string matching the following schema \`\`\`typescript
          {{
            room_number: number;
            special_note?: string;
            food_order_items: {{
              food_item_id: number; // this is the id of the food item from the food menu
              quantity: number;
            }}[];
        }}
        \`\`\`.
        make sure you get the room number from the user.
        `,
  func: async (input) => {
    try {
      const api = new Api({
        baseUrl: `https://determined-boot-55a0a0a0d0.strapiapp.com/api`,
        baseApiParams: {
          headers: {
            Authorization: `Bearer ${process.env.STRAPI_API_KEY}`,
            accept: "application/json",
          },
        },
      });
      
      console.log("input food order", input);
      const parsedInput: Input = JSON.parse(input);

      if (!parsedInput.room_number) {
        return "Ask the user for the room number before calling the food order tool.";
      }

      if (!parsedInput.food_order_items?.length) {
        return "Ask the user for the food order items before calling the food order tool.";
      }

      const foodOrderItemIds = [];
      for (const foodOrderItem of parsedInput.food_order_items) {
        const foodOrderItemResponse = await api.foodOrderItems.postFoodOrderItems({
          data: {
            in_room_dining_food_menu: foodOrderItem.food_item_id,
            quantity: foodOrderItem.quantity,
          },
        });
        console.log('foodOrderItemResponse', foodOrderItemResponse);
        if (foodOrderItemResponse.data.data?.id)
          foodOrderItemIds.push(foodOrderItemResponse.data.data.id);
      }
      
      await api.inRoomDiningFoodOrders.postInRoomDiningFoodOrders({
        data: {
          food_order_items: foodOrderItemIds,
          room_number: parsedInput.room_number.toString(),
          special_note: parsedInput.special_note || "",
        },
      });

      return "Order placed successfully";
    } catch (e) {
      console.error("strapi caught error while placing an order", e);
      return "An error occured while placing the order.";
    }
  },
});
