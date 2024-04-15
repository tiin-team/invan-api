const fp = require("fastify-plugin");
const axios = require("axios");

module.exports = fp(function (fastify, opts, next) {
  /**
   *
   * @param {[{
   *   client: {
   *     inn: string | number, first_name: string, contract: { contractNo: string, contractDate: string }
   *   }
   *   sold_item_list: [any]
   *   receipt_no: string
   *   date: number
   * }]} receipts
   * @param {Record<string, any>} goodsObj
   * @param {string} organizationId
   */
  async function createDidoxOnSale(receipts, goodsObj, organizationId) {
    const organization = await fastify.organizations
      .findById(organizationId, {
        didox: 1,
        nds_value: 1,
        inn: 1,
        address: 1,
        name: 1,
        director_name: 1,
        accaunter: 1,
      })
      .lean();
    if (
      !organization ||
      !organization.didox ||
      !organization.didox.inn ||
      !organization.didox.password
    ) {
      return;
    }

    try {
      const { data: token, error } = await fastify.didoxGetToken(
        organization.didox.inn,
        organization.didox.password,
      );
      if (error) {
        return {
          statusCode: 400,
          error: "Error while login didox",
          message: "Invalid didox inn or password",
        };
      }
      if (!token) {
        return {
          statusCode: 400,
          error: "Invalid didox inn or password",
          message: "Invalid didox inn or password",
        };
      }

      for (const receipt of receipts) {
        index = 0;
        const didoxProducts = Array(receipt.sold_item_list.length);
        for (const sold_item of receipt.sold_item_list) {
          if (goodsObj[sold_item.product_id]) {
            sold_item.sold_by = goodsObj[sold_item.product_id].sold_by;
            sold_item.barcode = sold_item.barcode
              ? sold_item.barcode
              : goodsObj[sold_item.product_id].barcode &&
                goodsObj[sold_item.product_id].barcode[0]
              ? goodsObj[sold_item.product_id].barcode[0]
              : "";
            sold_item.product_name = goodsObj[sold_item.product_id].name;
            if (goodsObj[sold_item.product_id].item_type == "variant") {
              sold_item.product_name = `${
                goodsObj[sold_item.product_id].parent_name
              } (${goodsObj[sold_item.product_id].name})`;
            }
          }
          sold_item.total = sold_item.value * sold_item.price;
          nds_value = isNaN(
            parseFloat(goodsObj[sold_item.product_id].nds_value),
          )
            ? organization.nds_value
            : parseFloat(goodsObj[sold_item.product_id].nds_value);

          didoxProducts[index] = {
            id: "",
            ordno: index + 1,
            lgotaid: null,
            committentname: "",
            committenttin: "",
            committentvatregcode: "",
            committentvatregstatus: null,
            name: sold_item.product_name,
            catalogcode:
              goodsObj[sold_item.product_id] &&
              goodsObj[sold_item.product_id].mxik
                ? goodsObj[sold_item.product_id].mxik
                : "",
            catalogname: "",
            marks: null,
            barcode: sold_item.barcode,
            measureid: null,
            packagecode: "",
            packagename: "",
            count: sold_item.value,
            summa: ((sold_item.price * 100) / (100 + nds_value)).toFixed(3),
            deliverysum: parseFloat(
              ((sold_item.total * 100) / (100 + nds_value)).toFixed(2),
            ),
            vatrate: nds_value,
            vatsum: parseFloat(
              sold_item.total -
                ((sold_item.total * 100) / (100 + nds_value)).toFixed(2),
            ),
            exciserate: 0,
            excisesum: 0,
            deliverysumwithvat: sold_item.total,
            withoutvat: false,
            withoutexcise: true,
            warehouseid: null,
            // "origin": 2,
            // "lgotaname": null,
            // "lgotavatsum": 0,
            // "lgotatype": null
          };
          index++;
        }

        const docType = "002";

        const reqBody = {
          didoxcontractid: "",
          version: 1,
          waybillids: [],
          hasmarking: false,
          facturatype: 0,
          productlist: {
            hascommittent: false,
            haslgota: false,
            tin: "", // 207119963
            hasexcise: false,
            hasvat: true,
            products: didoxProducts,
            facturaproductid: "",
          },
          facturadoc: {
            facturano: receipt.receipt_no,
            facturadate: fastify.date_ddmmyy(receipt.date),
          },
          contractdoc: {
            contractno: receipt.client.contract.contractNo,
            contractdate: receipt.client.contract.contractDate,
          },
          contractid: null,
          lotid: "",
          oldfacturadoc: {
            oldfacturadate: "",
            oldfacturano: "",
            oldfacturaid: "",
          },
          sellertin: organization.inn,
          seller: {
            name: organization.name,
            branchcode: "",
            branchname: "",
            // "vatregcode": "326020089828", // 326020089828
            account: "",
            bankid: "",
            address: organization.address,
            director: organization.director_name,
            accountant: organization.accaunter,
            vatregstatus: 20,
          },
          itemreleaseddoc: {
            itemreleasedfio: "",
          },
          buyertin: receipt.client.inn,
          buyer: {
            name: receipt.client.first_name,
            branchcode: "",
            branchname: "",
            vatregcode: "",
            account: "",
            bankid: "",
            address: "",
            director: "",
            accountant: "",
            // "vatregstatus": 20
          },
          facturainvestmentobjectdoc: {
            objectid: "",
            objectname: "",
          },
          facturaempowermentdoc: {
            empowermentno: "",
            empowermentdateofissue: "",
            agentfio: "",
            agenttin: "",
            agentfacturaid: "",
          },
          expansion: {
            ordernumber: "",
          },
          foreigncompany: {
            countryid: "",
            name: "",
            address: "",
            bank: "",
            account: "",
          },
          facturaid: "",
        };

        await axios.default.post(
          `https://api.didox.uz/v1/documents/${docType}/create`,
          reqBody,
          {
            headers: {
              "user-key": token,
              "api-key": token,
            },
          },
        );

        // res.status == 200 && !res.data.error
        // { didoxId: res.data._id }
        // (res.data);
      }
    } catch (error) {
      return {
        statusCode: 400,
        error: "Error while create didox doc",
        message: error.message,
      };
    }
  }

  fastify.decorate("createDidoxOnSale", createDidoxOnSale);

  next();
});
