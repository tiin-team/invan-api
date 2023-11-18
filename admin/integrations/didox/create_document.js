const fp = require('fastify-plugin')
const axios = require("axios");

module.exports = fp(function (fastify, opts, next) {

  fastify.get('/integrations/didox/create-receipt-document/:receipt_id', opts.version, async (request, reply) => {
    const { receipt_id } = request.params

    const receipt = await fastify.Receipts.findById(receipt_id).lean();
    if (!receipt || receipt.organization != '5f5641e8dce4e706c062837a') {
      return reply.fourorfour('receipt')
    }

    const organization = await fastify.organizations.findById(receipt.organization).lean()
    if (!organization) {
      return reply.fourorfour('organization')
    }

    const clientPhone = receipt.cashback_phone.replace('+', '')
    const client = await fastify.clientsDatabase
      .findOne({
        organization: organization._id,
        $or: [
          { phone_number: { $in: [clientPhone, `+${clientPhone}`] } },
          { user_id: receipt.user_id },
          { client_id: fastify.ObjectId(receipt.client_id) },
        ]
      })
      .lean();
    if (!client) {
      return reply.fourorfour('client')
    }

    let clientContract = {
      contractNo: '',
      contractDate: '',
    }
    if (Array.isArray(client.contract_numbers)) {
      clientContract = client.contract_numbers.find(contractNumber => contractNumber.isDefault)
    }


    const product_ids = receipt.sold_item_list.map(e => e.product_id)
    const goods = await instance.goodsSales
      .find(
        { _id: { $in: product_ids } },
        { name: 1, barcode: 1, sold_by: 1, item_type: 1, parent_name: 1, barcode: 1, mxik: 1, nds_value: 1 })
      .lean()
    const goodsObj = {}
    for (const g of goods) {
      goodsObj[g._id] = g
    }


    index = 0
    const didoxProducts = Array(receipt.sold_item_list.length)
    for (const sold_item of receipt.sold_item_list) {
      // let amount = sold_item.quality * sold_item.purchase_cost
      if (goodsObj[sold_item.product_id]) {
        sold_item.sold_by = goodsObj[sold_item.product_id].sold_by
        sold_item.barcode = sold_item.barcode
          ? sold_item.barcode
          : goodsObj[sold_item.product_id].barcode && goodsObj[sold_item.product_id].barcode[0]
            ? goodsObj[sold_item.product_id].barcode[0]
            : ''
        sold_item.product_name = goodsObj[sold_item.product_id].name
        if (goodsObj[sold_item.product_id].item_type == 'variant') {
          sold_item.product_name = `${goodsObj[sold_item.product_id].parent_name} (${goodsObj[sold_item.product_id].name})`
        }
      }
      sold_item.total = sold_item.value * sold_item.price
      nds_value = isNaN(parseFloat(goodsObj[it.product_id].nds_value)) ?
        organization.nds_value :
        parseFloat(goodsObj[it.product_id].nds_value);

      didoxProducts[index] = {
        "id": "",
        "ordno": index + 1,
        "lgotaid": null,
        "committentname": "",
        "committenttin": "",
        "committentvatregcode": "",
        "committentvatregstatus": null,
        "name": sold_item.product_name,
        "catalogcode": "", // 08471011002000000
        "catalogname": "", // Электронная книга
        "marks": null,
        "barcode": sold_item.barcode,
        "measureid": null,
        "packagecode": "",
        "packagename": "",
        "count": sold_item.value,
        "summa": sold_item.total,
        "deliverysum": "",
        "vatrate": nds_value,
        "vatsum": parseFloat((it.total * 100 / (100 + nds_value)).toFixed(2)),
        "exciserate": 0,
        "excisesum": 0,
        "deliverysumwithvat": "",
        "withoutvat": false,
        "withoutexcise": true,
        "warehouseid": null,
        // "origin": 2,
        // "lgotaname": null,
        // "lgotavatsum": 0,
        // "lgotatype": null
      }
      index++
    }

    const docType = '002'
    try {
      const { data: token } = await fastify.didoxGetToken()
      if (!token) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Invalid didox inn or password",
          message: "Invalid didox inn or password"
        })
      }

      const reqBody = {
        "didoxcontractid": "",
        "version": 1,
        "waybillids": [],
        "hasmarking": false,
        "facturatype": 0,
        "productlist": {
          "hascommittent": false,
          "haslgota": false,
          "tin": "", // 207119963
          "hasexcise": false,
          "hasvat": true,
          "products": didoxProducts,
          "facturaproductid": ""
        },
        "facturadoc": {
          "facturano": `${receipt.receipt_no} ${fastify.date_ddmmyy_hhmm(receipt.date)}`,
          "facturadate": fastify.date_ddmmyy_hhmm(receipt.date)
        },
        "contractdoc": {
          "contractno": clientContract.contractNo,
          "contractdate": clientContract.contractDate
        },
        "contractid": null,
        "lotid": "",
        "oldfacturadoc": {
          "oldfacturadate": "",
          "oldfacturano": "",
          "oldfacturaid": ""
        },
        "sellertin": organization.inn,
        "seller": {
          "name": organization.name,
          "branchcode": "",
          "branchname": "",
          // "vatregcode": "326020089828", // 326020089828
          "account": "",
          "bankid": "",
          "address": organization.address,
          "director": organization.director_name,
          "accountant": organization.accaunter,
          "vatregstatus": 20
        },
        "itemreleaseddoc": {
          "itemreleasedfio": ""
        },
        "buyertin": client.inn,
        "buyer": {
          "name": client.first_name,
          "branchcode": "",
          "branchname": "",
          "vatregcode": "", // 326040002521
          "account": "", // 20208000400308125001
          "bankid": "", // 00974
          "address": "",
          "director": "",
          "accountant": "",
          // "vatregstatus": 20
        },
        "facturainvestmentobjectdoc": {
          "objectid": "",
          "objectname": ""
        },
        "facturaempowermentdoc": {
          "empowermentno": "",
          "empowermentdateofissue": "",
          "agentfio": "",
          "agenttin": "",
          "agentfacturaid": ""
        },
        "expansion": {
          "ordernumber": ""
        },
        "foreigncompany": {
          "countryid": "",
          "name": "",
          "address": "",
          "bank": "",
          "account": ""
        },
        "facturaid": ""
      }

      reqBody.productlist.products = receipt.sold_item_list.map(e => e.product_id);

      const res = await axios.default.post(
        `https://api.didox.uz/v1/documents/${docType}/create`,
        reqBody,
        {
          headers: {
            "user-key": token,
            "api-key": token,
          }
        }
      )

      return res.status == 200 ?
        reply.ok({ didoxId: res.data._id }) :
        reply.error(res.data)

    } catch (err) {
      return reply.error(err.message)
    }

  });

  next()
})
