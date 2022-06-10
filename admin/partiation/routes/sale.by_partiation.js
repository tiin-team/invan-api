const fp = require('fastify-plugin');

module.exports = fp((instance, options, next) => {
  const version = { version: '2.0.0' };
  const receiptBody = {
    body: {
      type: "object",
      properties: {
        cashier_id: {
          type: "string",
          minLength: 24,
          maxLength: 24,
        },
        cashier_name: { type: "string" },
        currency: {
          type: "string",
          enum: ["uzs", "uzd"],
        },
        total_currency: {
          type: "string",
          enum: ["uzs", "uzd"],
        },
        date: {
          type: "number",
          minimum: new Date().getTime() - 3600000
        },
        is_refund: { type: "boolean", default: false },
        receipt_no: { type: "string" },
        service_id: {
          type: "string",
          minLength: 24,
          maxLength: 24,
        },
        receipt_no: { type: "string" },
        sold_item_list: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "product_id",
              "product_name",
              "created_time",
              "price",
              "cost",
              "value",
              "reset_count",
              "modifiers",
              "discount",
            ],
            properties: {
              product_id: { type: "string" },
              sold_item_id: { type: "string" },
              product_name: { type: "string" },
              parent_name: { type: "string" },
              created_time: { type: "number" },
              closing_time: { type: "number" },
              price: { type: "number" },
              price_currency: { type: "string" },
              price_type: {
                type: "string",
                enum: ["P", "P1", "P2", "P3"],
                default: "P",
              },
              cost: { type: "number" },
              currency: {
                type: 'string',
                default: 'uzs'
              },
              total: { type: "number" },
              value: { type: "number" },
              price_position: { type: "string" },
              reset_count: { type: "number" },
              reminder: {
                type: "number",
                default: 0,
              },
              count_by_type: {
                type: "number",
                default: 1,
              },
              sold_item_type: {
                type: "string",
                enum: ["item", "box_item", "pcs_item"],
                default: "item",
              },
              comment: { type: "string", default: "" },
              discount: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["name", "type", "value", "_id"],
                  properties: {
                    name: { type: "string" },
                    value: { type: "number" },
                    total: { type: "number" },
                    _id: { type: "string" },
                    type: {
                      type: "string",
                      enum: ["percentage", "sum"],
                    },
                  },
                },
              },
              modifiers: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["modifier_id", "modifier_name", "modifier_options"],
                  properties: {
                    modifier_id: { type: "string" },
                    modifier_name: { type: "string" },
                    modifier_options: {
                      type: "array",
                      items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["option_name", "price"],
                        properties: {
                          option_name: { type: "string" },
                          price: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
              taxes: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["name", "type", "tax", "_id"],
                  properties: {
                    name: { type: "string" },
                    type: {
                      type: "string",
                      enum: ["include", "exclude"],
                    },
                    tax: { type: "number" },
                    _id: { type: "string" },
                  },
                },
              },
            },
          },
        },
        payment: {
          type: "array",
          items: {
            type: "object",
            required: [
              "name",
              "value",
            ],
            properties: {
              name: { type: "string" },
              value: { type: "number" },
            },
          },
        },
        total_price: { type: "number", minimum: 0 }
      },
      required: [
        "cashier_id", "cashier_name",
        "currency", "date",
        "is_refund", "payment",
        "receipt_no", "service",
        "service_value", "sold_item_list",
        "total_currency", "total_price",
      ],
    },
  };

  instance.post('/admin-partiation-receipt/create',
    {
      ...version,
      ...receiptBody,
    },
    (request, reply) => {
      instance.oauth_admin(request, reply, async (admin) => {
        try {

        } catch (error) {
          instance.log.error(error.message)
          return reply.error(error.message);
        }

      });
    }
  );

  next();
});
