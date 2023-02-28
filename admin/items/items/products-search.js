
module.exports = ((instance, _, next) => {

  const productsSearchSchema = {
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: [
          'search'
        ],
        properties: {
          search: {
            type: 'string'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            statusCode: {
              type: 'number'
            },
            error: {
              type: 'string'
            },
            message: {
              type: 'string'
            },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  barcode: {
                    type: 'string'
                  },
                  name: {
                    type: 'string'
                  },
                  sold_by: {
                    type: 'string'
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  instance.post(
    '/products/search',
    {
      version: '1.0.0',
      ...productsSearchSchema,
      attachValidation: true
    },
    async (request, reply) => {
      if (request.validationError) {
        return reply.validation(request.validationError.message)
      }
      try {
        const { search } = request.body;
        const nameFilter = [
          {
            name: {
              $regex: search,
              $options: 'i'
            }
          }
        ]

        const converted = instance.converter(search)
        if (converted != 'nothing_to_change') {
          nameFilter.push({
            name: {
              $regex: converted,
              $options: 'i'
            }
          })
        }

        const productFilterOr = [
          {
            $or: nameFilter
          }
        ]

        const only_digits = /^\d+$/.test(search);
        if (only_digits) {
          productFilterOr.push({
            barcode: {
              $regex: search,
              $options: 'i'
            }
          })
        }

        const filterProducts = {
          $match: {
            $or: productFilterOr
          }
        }

        const sortByName = {
          $sort: {
            name: 1
          }
        }
        const limitData = {
          $limit: 5
        }
        const items = await instance.Products.aggregate([
          filterProducts,
          sortByName,
          limitData
        ])
          .allowDiskUse(true)
          .exec();

        reply.ok(items)
      } catch (error) {
        reply.error(error.message)
      }
      return reply;
    }
  )

  next()
})
