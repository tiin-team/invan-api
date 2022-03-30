const cronJob = require("node-cron");

const startCron = async (instance) => {
  const cronString = "*/5 * * * * *";

  if (cronJob.validate(cronString)) {
    instance.log.error("Invalid CRON_TIME is specified:", cronString);
    return;
  }

  let receiptsCount = 5350;

  cronJob.schedule(cronString, async () => {
    const recepits = await instance.Receipts.find({
      organization: {$ne: "5f5641e8dce4e706c062837a"},
    })
      .sort({_id: -1})
      .skip(receiptsCount)
      .limit(5);
    console.log(receiptsCount);
    for (const r of recepits) {
      const sold_item_list = [];
      for (const s of r.sold_item_list) {
        try {
          const item = await instance.goodsSales.findById(s.product_id);

          if (item) {
            try {
              const category = await instance.goodsCategory.findById(
                item.category
              );

              if (category) {
                s.category_id = category._id;
                s.category_name = category.name;
              }
            } catch (error) {
              instance.log.error(error.message);
            }

            try {
              const supplier = await instance.adjustmentSupplier.findById(
                item.primary_supplier_id
              );

              if (supplier) {
                s.supplier_id = supplier._id;
                s.supplier_name = supplier.supplier_name;
              }
            } catch (error) {
              instance.log.error(error.message);
            }
          }
        } catch (error) {
          instance.log.error(error.message);
        }
        sold_item_list.push(s);
      }
      try {
        await instance.Receipts.updateOne(
          {_id: r._id},
          {
            $set: {
              sold_item_list: sold_item_list,
            },
          }
        );
      } catch (error) {
        instance.log.error(error.message);
      }
    }
    receiptsCount += 5;
  });
};

async function startDeleteUnused(instance) {
  try {
    const cronString = "*/1 * * * * * *";
    if (cronJob.validate(cronString)) {
      instance.log.error("Invalid CRON_TIME is specified:", cronString);
      return;
    }
    let receiptsCount = 170;

    cronJob.schedule(cronString, async () => {
      let skip = receiptsCount;

      const receipts = await instance.Receipts.find({
        date: {$gte: 1569519885523},
      })
        .skip(receiptsCount)
        .limit(1);
      if (receipts.length == 0) {
        instance.log.info("No receipts");
      }
      const r = receipts[0];
      // for (const r of receipts) {
      const result = await instance.Receipts.deleteMany({
        organization: r.organization,
        service: r.service,
        receipt_no: r.receipt_no,
        date: r.date,
        pos_id: r.pos_id,
        _id: {$ne: r._id},
      });
      instance.log.info(JSON.stringify(result));
      try {
        if (result.deletedCount < receiptsCount)
          receiptsCount -= result.deletedCount;
        else {
          receiptsCount = 0;
        }
      } catch (error) { }
      // }
      instance.log.info(receiptsCount);
      receiptsCount += 1;
    });
  } catch (error) {
    instance.log.error(error.message);
  }
}

async function phoneToNull(supplier, instance) {
  await instance.adjustmentSupplier.updateOne({_id: supplier._id}, {contact: supplier.phone_number, phone_number: null});
}

function isPhone(str) {
  return /^\+[0-9]{12}$/.test(str);
}

async function checkSuppliers(instance) {
  try {
    const suppliers = await instance.adjustmentSupplier.find({});
    for (const s of suppliers) {
      if (typeof s.phone_number != 'string') {
        await phoneToNull(s, instance)
        continue;
      }
      s.phone_number = `+${s.phone_number.replace(/[^0-9]/g, '')}`;

      if (isPhone(s.phone_number)) {
        await instance.adjustmentSupplier.updateOne({_id: s._id}, {phone_number: s.phone_number})
      }
      else {
        await phoneToNull(s, instance)
      }
    }
  } catch (error) {
    console.log(error)
  }

}

async function setItemsCategory(instance) {
  try {
    const organizations = await instance.organizations.find({});
    for (const org of organizations) {
      const category = await instance.goodsCategory.findOne({
        organization: org._id,
        is_other: true
      });
      if (!category) continue;
      // const good = await instance.goodsSales.findOne({
      //   organization: org._id,
      //   category: ''
      // });
      // if (!good) continue;
      await instance.goodsSales.updateMany(
        {
          category: category._id
        },
        {
          $set: {
            last_updated: new Date().getTime(),
            last_stock_updated: new Date().getTime()
          }
        }
      );
    }

    console.log(`Done -> ${organizations.length}`)
  } catch (error) {
    console.log(error);
  }
}

async function setSupplierBalance(instance) {
  try {

    const data = `5fd4c9858e2ccc7f1971ee26	469171817.4
    5fd4e45a8e2ccc7f19720126	539009470
    5f5643c1dce4e706c06284a8	180212865
    5f981b7450e01a66dea0251e	46590206.37
    5f92846d47a7594ce3be2342	104807455.1
    5f5643c1dce4e706c0628520	43100000
    5f5643c1dce4e706c06284fe	9020815
    5f5643c1dce4e706c06284d7	185763746
    5ff9b5c54e035e3ae4b6ded2	231663727.5
    6060a83936c9101492cfd097	0.02100002766
    5fb4ef4e21b62e438681ff7d	1816718.416
    601d671ef2dc9a62cfccc70f	146047286
    601ced6f13d0910edd4c3379	130836205.8
    5f5643c1dce4e706c062851e	70504669
    5f5643c1dce4e706c06284fd	133453682
    609c0b0a7fd8b933de0ee888	0
    5f5643c1dce4e706c062854d	0
    5f5643c1dce4e706c06284f6	99145456
    5faf9d38e47a3063d7b5d507	18528000
    5f5643c1dce4e706c06284b4	117489936
    5f5643c1dce4e706c06284ce	90862753.83
    5f5643c1dce4e706c06284c5	29847493
    5f5d143c4f89d4717810ee0e	20285500
    5f5643c1dce4e706c06284f0	111915943
    616fc71b121b0ff994dd68db	229707923.7
    5f5643c1dce4e706c06284e8	82631938
    5fbdde97e4c8485e3ae518a5	75836555
    5f5643c1dce4e706c06284dd	187932943
    5f5643c1dce4e706c06284cd	110939133
    5f5643c1dce4e706c062850c	66124920.61
    606e0309243218283bb1baf9	155889026
    5f5643c1dce4e706c06284b1	4650794
    5f5643c1dce4e706c062850a	31804129.5
    6030a003cea2ee06119d379a	10950088
    604780804f68906c95ba583a	201820
    6043acb7cea2ee0611ac63d4	85824165.84
    5fb4f1ef21b62e43868200d1	6360000
    5f5643c1dce4e706c0628508	19945889
    5fabf69fb8c2d715818a89bd	22363439
    5f58d7679e0f7c132d47c6b4	313011967.8
    6102bd3f9500352c2bdf3b23	14765013.69
    5f5643c1dce4e706c06284cb	864000
    5f5643c1dce4e706c0628500	58295653
    5f5643c1dce4e706c06284fb	26453680
    5f5ba4e56786602b6cf1789d	61585312.67
    5f5643c1dce4e706c06284aa	75477045
    5f5ba5906786602b6cf178c5	52240522
    6025274400489d57b26a2f4e	30865
    5f5643c1dce4e706c062855f	39228038
    5f5643c1dce4e706c0628544	228606.93
    5f5c70186786602b6cf1d82b	9451320
    60a37b647fd8b933de15b4d5	37807088
    5f5643c1dce4e706c06284cf	33683786.2
    5f5643c1dce4e706c06284b5	88202706
    5fa261da81ca55194b9ad971	12847350
    5f5643c1dce4e706c062854e	0.09999999404
    60211070a4a477728bf016fc	10645511
    5f5643c1dce4e706c06284d0	62066788.8
    5f5643c1dce4e706c0628569	2018151
    5fc8d343a53d2408adb33fb2	31606113
    5f5643c1dce4e706c06284d5	8958175.4
    60154d68c6d12d2ada62c3a4	90917999
    5f5643c1dce4e706c062852b	44209638
    5f5643c1dce4e706c06284ff	7597590
    5f5643c1dce4e706c0628528	73458946
    60409c40cea2ee0611a95fd0	10433000
    5f5f22432b2d737bdf071de6	8863515.019
    61569d1751cb61f523a25789	87723340
    5f5643c1dce4e706c0628547	47164120.4
    5f58da0bb2543915e6705aad	33647502
    5f5643c1dce4e706c06284c4	62775000
    5f9d1c982015bc22dc4ed772	0
    5fe1c2d20d2a6f1e48086fc1	21180600
    5fa3b1b5d062913033129155	8186520
    5f5ba5096786602b6cf178b1	25016000
    607725ab79561815abc5bd0d	0
    601e4d1af2dc9a62cfcd2132	29700312
    5f5643c1dce4e706c06284e6	3974124
    5fc8f7d1a53d2408adb36537	34465586
    5f5643c1dce4e706c06284bf	258502
    6066c147d455fc16311a3fdb	14955850
    611671ff709f220e792a73ba	229285000
    5f5643c1dce4e706c06284ee	9255
    5f5643c1dce4e706c06284b7	41377622
    5f5643c1dce4e706c06284dc	121060
    5f5643c1dce4e706c062854c	10635200
    5f5b1975f2742364cce3513b	26354410
    5f5643c1dce4e706c0628566	1797075
    5f5f6c3466e2171290cc90a4	21754482
    5f5643c1dce4e706c06284df	15458200
    5f5643c1dce4e706c06284f3	6360
    60e69a315449aa4cf4d6ae5f	24509335
    5f5643c1dce4e706c06284f1	15087650
    5f5643c1dce4e706c0628507	15702759
    5f5643c1dce4e706c0628542	25289000
    5f5643c1dce4e706c0628506	7840372.6
    5f5643c1dce4e706c06284d9	9957200
    602e667fafb40b016c43c9e7	500
    61024ddf9500352c2bde39a1	23951211
    5f58c2cd4774fc5214b577a3	24099250
    5f68b52e0437d8793d1dd780	29859193
    61960d34763b26c02b37863e	101900450.6
    5f5643c1dce4e706c062853e	0
    5f9a4ddeed27944511c5fe0c	0
    5f5a28d0fdcf9e5d54058f8e	0.3589999974
    5f5643c1dce4e706c0628512	47345290
    5f5ba5256786602b6cf178bd	17158062
    607b149479561815abc97636	21838800
    5f5f32ae2b2d737bdf07248c	7744000
    5f6463b8a55c36613babbed5	7100000
    60869a6e3ca09c0c71d5bb0e	55651240
    5f5643c1dce4e706c062852a	14608160
    5f58cdd49e0f7c132d47c053	25620400
    603e130dcea2ee0611a78c30	0
    5fd726758e2ccc7f1972be62	34900
    6041c42ecea2ee0611aa4ce4	37408220
    5fca2a01704a404f600e8f60	6261600
    5f5ba5326786602b6cf178be	620000
    6043e488cea2ee0611ac7963	35294748
    60730f4751f0215b151345c4	2250000
    5f5643c1dce4e706c06284c6	36304532
    602b54dda567ab7b7015fdda	20000080
    5f8e7c1711e95b3fb693e35a	12967500
    5f57c25c4774fc5214b550ca	18662106
    5fe349f00d2a6f1e480920f4	2250000
    5fa54870d062913033135663	0
    5f5643c1dce4e706c06284e7	0
    5f5643c1dce4e706c06284d6	645406
    5f5643c1dce4e706c06284ac	26708766
    5f5643c1dce4e706c0628532	23889288
    60727c0951f0215b15124e8e	10954700
    5f6efcc97fc86c48ae29b77f	0
    5f5643c1dce4e706c06284ae	14917042
    5f5643c1dce4e706c06284c2	34820138
    5f5643c1dce4e706c0628514	0
    607bfaa979561815abca136b	8654850
    5f5643c1dce4e706c0628552	0
    5f5643c1dce4e706c062851d	42573446
    60be063339399a333bd95a24	120400
    5f5643c1dce4e706c0628517	0
    605e26e877a779348f7e776d	42682810
    607064e3046c734f7d350f55	6238200
    6126424fae3b219343f96efc	0
    5f5643c1dce4e706c0628554	4000000
    6043c6b0cea2ee0611ac75e1	17801763
    5f5643c1dce4e706c0628558	4661500
    5f58ef90b8e68c1a7a42124a	32237380
    602cc490afb40b016c42631c	1408200
    5f5643c1dce4e706c062855a	0
    5f5643c1dce4e706c06284d1	5719091
    5f5643c1dce4e706c0628511	22844200
    5f5ba42f6786602b6cf1787d	0
    610d22d813dab83c791bf37c	1211400
    601f87a6a4a477728bef1737	16436200
    5f5643c1dce4e706c0628557	0
    5f58e21fb2543915e6705e39	0
    5f8936ccd514da6381e97769	5798065
    60213657a4a477728bf04981	10749000
    5f5643c1dce4e706c062853c	0
    6054468377a779348f7589e9	400
    60c03a3439399a333bdbce02	31110472
    5f5643c1dce4e706c06284af	17809088
    5f78421081c28f430c0ddef1	136662
    611a30d3709f220e792f334d	29161900
    5f5643c1dce4e706c0628565	47561145
    5f7ed4486b297e122df5ca0a	6243469
    60d60195fafc8d6774237149	10954378
    5f5643c1dce4e706c0628560	5163832
    601139bc43591b1c044adb78	19988593
    5f5643c1dce4e706c06284fc	4
    5ff45c410d2a6f1e4810b594	7413728
    5f5643c1dce4e706c062852f	0
    5f5f581a0c2a300cf5b80b1c	8337200
    5fda17bf62e95d7fa0bfd9c3	2575704
    5f5643c1dce4e706c0628534	748
    5f5643c1dce4e706c06284a9	13413125
    6105197f9500352c2be24535	47112746
    6161ac0051cb61f523b11bff	25276866
    5fd87ab88c1119587791ddf2	5241029
    5f9005d3c89ca54e79bfdefd	7890378.5
    5f5643c1dce4e706c06284e2	487532
    60221a42d66ae51acab5a723	9875700
    5f63281da71de93dfb703885	23799338
    5f5643c1dce4e706c0628505	4999960
    5f5643c1dce4e706c06284b2	9704533
    608014e73ca09c0c71cf9d91	4069040
    5f5643c1dce4e706c062853f	0
    5fa00f6f170a9c47321914fc	0.5
    60ed5be02cee992a468915fc	12600000
    60c488bc822e4376d715849a	0
    5f5643c1dce4e706c0628529	21612340
    5f5643c1dce4e706c06284f7	821
    5f5643c1dce4e706c0628563	5149595
    6018c59adb2c7c1486f25120	20349248
    5f5ba2a16786602b6cf177ed	3561400
    5f5643c1dce4e706c0628530	7542617
    5f6dfae1bea53b1307cae551	1070
    60d45e90fafc8d6774217895	20821232
    5f5643c1dce4e706c06284de	5861517
    6024a51226684a61201b0e07	33480000
    6084007e3ca09c0c71d37889	0
    5f5643c1dce4e706c06284fa	813022
    5f5643c1dce4e706c062850d	18613199
    5f5643c1dce4e706c0628502	21657800
    5f5643c1dce4e706c06284cc	6289134
    60ae5dce05315204eabe9156	0
    5fcb443917cf605317aba701	3833199.8
    6013e1b646eedf0bc33274ce	17949400
    5ff1acef0d2a6f1e480f9e64	0
    60657ecbd455fc1631193f93	17650200
    5f5ba3c36786602b6cf1784f	20713764
    5f5643c1dce4e706c062856b	120000
    5f5643c1dce4e706c0628509	15649213
    60815cb33ca09c0c71d0d736	15817000
    5f5643c1dce4e706c0628559	1980000
    5f5643c1dce4e706c06284db	7561577
    5f5643c1dce4e706c06284c1	12697094
    60769bf179561815abc4d1c9	0
    5f5643c1dce4e706c062852d	5139987
    601f8673a4a477728bef1554	0
    5f5643c1dce4e706c06284c0	15183383
    5f7d6ab4be7ee9367f5bdf1d	0
    605ee49677a779348f7ed51e	0
    603f3c43cea2ee0611a84084	625000
    5fe82bf00d2a6f1e480b0331	6660801
    5f5ca2ae6786602b6cf1e814	0
    613ad11e2089df852348ab38	0
    600950cf7352a4633140df18	16897440
    608040263ca09c0c71cffeac	100
    5f7440d66359a52458f7ee79	10
    607aa87379561815abc8b93f	6817800
    5f5643c1dce4e706c062852c	5493500
    606ae7f2d455fc16311e2ed2	217627
    6080f5e03ca09c0c71d0334d	11519926
    5fa116d881ca55194b9a5c64	0.1999999993
    60dee9535449aa4cf4ce29cb	13012150
    617cfd45121b0ff994eee3ac	26642846
    604884264f68906c95bae5a6	3841540
    5f5643c1dce4e706c0628537	56160
    617bf410121b0ff994edd1d1	25455338
    601d10f3051b4258e66835bc	0
    60a8f3bcc5b271642828299c	3120000
    610135859500352c2bdce4e4	2694100
    5f8594d44031361ca2456dee	3818300
    5fbe5a64e4c8485e3ae56a56	3888288.8
    6017a1070e1118507f5c4fde	0
    5f5643c1dce4e706c06284b0	9914985
    5f69b8e67f9b0f7af484f478	21157790.33
    5fbfbaa47270a41ea988d82a	11304104
    60ad2131e7e80a05e481dd7c	33036000
    6043597bcea2ee0611abd291	9362140
    5f5643c1dce4e706c0628533	750
    5f5643c1dce4e706c0628524	834848
    5fe4aec20d2a6f1e4809b77e	7810337
    6006d6797352a463313ff2ad	1123269
    5f5643c1dce4e706c06284bb	4976814
    5f5643c1dce4e706c0628551	6349640
    5fc0f52f2283a62473b3419c	1004767
    602ba614539f7943a11a65d6	4819860
    60196f62d5a81654bae574f3	17635580
    5f5643c1dce4e706c062851f	26050
    5f5643c1dce4e706c06284e1	0
    60840e953ca09c0c71d39bdd	4047102
    60f3e36adf0e5b153de91279	19010830
    614485d957ac530a74239f5b	8009375
    5fa0eeba170a9c4732193378	0
    603611eecea2ee0611a19933	8001551
    5f5ba39e6786602b6cf1784e	550
    61938fa1146eefa8cd7d0700	3300000
    5fc2087226499c0f995e1434	0
    5f5643c1dce4e706c06284e3	8786730
    60dd8b324c2ae83d48e02bd4	5970825
    602209e5d66ae51acab5999d	415978
    6124a4bac061da7ec950923e	7435000
    5f5643c1dce4e706c0628510	2147797
    5f9bf9beba173f13ab8caf56	0
    6017d741db2c7c1486f1d6c7	0
    5f5643c1dce4e706c0628515	0
    6090ce983ca09c0c71df6cfb	6142190
    607fee113ca09c0c71cf624b	6111203
    5f5643c1dce4e706c0628545	1800000
    60f3e37fdf0e5b153de91292	1604879.84
    5f5643c1dce4e706c062854f	0
    605eec3077a779348f7ee0a9	0
    607fe88c3ca09c0c71cf5bd0	12524000
    5f86e45859302709af911c69	4129900
    5fe9cd770d2a6f1e480be6af	6653000
    5f5643c1dce4e706c06284d2	8149917.667
    5fd992c262e95d7fa0bf6f2f	4922817
    6050717a77a779348f721c34	1701000
    615c1db051cb61f523a97689	16497107
    5f5643c1dce4e706c062853d	0
    610e685c13dab83c791e5071	6303825
    5fb639e599e7bf4e1d36206c	7025800
    5fd89b768c1119587791f9a5	0
    5f69abfa7f9b0f7af484eebc	0
    5fad5e7ae47a3063d7b51db7	0
    616af1e7121b0ff994d73d74	7001511
    607e635e0e948e35f98662d9	10731472
    612c9d111018e0dc5fbc9785	8121000
    5f5643c1dce4e706c06284ab	7941472
    5fc0eb412283a62473b337c3	10368400
    5f5643c1dce4e706c06284e5	3307850
    609031a23ca09c0c71df44f3	22531650
    5fd75df28c11195877918399	0
    613f4a9d7724fbd7cb8d57a3	6862700
    6153058551cb61f5239de1de	2036900
    5f5643c1dce4e706c06284d8	0
    5f5643c1dce4e706c062855d	3873165
    5fe9f8760d2a6f1e480c175a	866773.1
    5f8a93b360ab9d4f97b39b60	0
    602246b2c6f4c14e65e8694d	1605050
    60c62513822e4376d7174dd0	6480000
    5f900fb814366152a09a3751	52600
    5f96a43bbc73461712321601	4739107
    5faea109e47a3063d7b59555	0
    5fa3e503d06291303312b45b	0
    5f6a1c85821e8b7a8a4fb757	0
    619ceba2763b26c02b4153cb	0
    5f5643c1dce4e706c062855e	1703460
    5f59dc393cf7974aba728ad0	2953500
    5fdb298f0f38c66b426e1ff9	2013100
    5f5643c1dce4e706c062856a	0
    611f7cc3649dd01b5ee342a4	10015000
    60531f3677a779348f747aab	2230720
    5f9553a10d070925ddb06865	0
    5f5643c1dce4e706c0628525	0
    601e5d5ff2dc9a62cfcd3905	0
    5fcb25a7ac51a54a020e5568	804000
    5fb373e58bb24d490caca4d8	1482590
    5f98fe705c7dad7e31ab2a01	2597027
    60728f8051f0215b151268fa	163582
    5ffee3f1832b766051699d11	1741875
    6103f3039500352c2be0d24a	6258200
    60c5a957822e4376d7169b3e	2826000
    61092eefa7f5c72c762b8abf	3689800
    5f5643c1dce4e706c062856c	0
    5f5643c1dce4e706c0628523	12970000
    5f5643c1dce4e706c062854b	6075110
    619b4dea763b26c02b3ec274	5465166
    6040b314cea2ee0611a981e5	1671600
    604257b3cea2ee0611ab2a91	1294600
    61545f5451cb61f5239fba34	5879900
    5fd21a9b998e3605d0eeef9f	0
    600e56516e5de25023f86aed	0
    5f5643c1dce4e706c06284c7	0
    600033e7832b7660516a2731	1525900
    6128a40ce9c1a3be03189096	2195102.5
    5f6884f368fa525a0f30f2d1	1000
    60969aa47567fa061c0bc7ea	5735700
    607af21e79561815abc94b5d	2610300
    5f92ad0647a7594ce3be3f08	1000219
    5f5643c1dce4e706c0628539	5642586
    5fc8aa62a53d2408adb31cf2	0
    5f818aa142a48549a590c0a3	1555000
    6043cb68cea2ee0611ac778b	438300
    5f7dbdd46b297e122df58386	0
    608adc743ca09c0c71da2901	0
    60113e8b43591b1c044ae0fe	400
    5fb51f1e99e7bf4e1d35d2c7	15000
    6091831a3ca09c0c71e0941f	0
    602e033fafb40b016c435a4d	5584550
    5f5643c1dce4e706c0628531	4489000
    5f5643c1dce4e706c06284ea	3355625
    5fd88c338c1119587791eca2	0
    5f5643c1dce4e706c06284b3	3306288
    60f18dc08e2a5e0ecb0f9a35	2147000
    608d61683ca09c0c71dc9b06	988000
    5fc6422fdb94d1643c970e39	0
    5f72f4024f3b7f0f9642421b	0
    5f5643c1dce4e706c06284ba	974505
    6034a7dbcea2ee0611a06318	1890500
    5f5643c1dce4e706c0628526	0
    604c7c122e57ca06dfd031af	20000072
    5f5643c1dce4e706c062854a	0
    60c87851822e4376d719bb11	1110000
    610ce9d613dab83c791b76a3	6386000
    60fa7219e750380651191664	4123700
    6113c10d709f220e79263977	6480000
    5f58e48db2543915e6705f1b	1498300
    60accc18e7e80a05e4814892	0
    60ae4d8605315204eabe70a2	0
    5f6c5cb4bea53b1307ca4930	0
    615c354651cb61f523a9ad1c	2200000
    5faa668096203340293ee48d	190900
    5f69965e7f9b0f7af484e9f6	0
    5f5ba3196786602b6cf17847	2111000
    5f5643c1dce4e706c0628540	0
    5fdd8d9b5cc0de064de8812d	0.5
    6061a800d455fc163115fa23	5000
    5fb4f9e921b62e43868207c0	862
    5f5d143c4f89d4717810ee0d	0
    6193bf4c49bc7da9ba14a2a4	2118000
    5f5643c1dce4e706c06284b6	0
    5f5643c1dce4e706c0628535	0
    61177199709f220e792b9c9f	0
    5f5643c1dce4e706c06284da	0
    6066e201d455fc16311a6f39	600000
    6049ea0d4f68906c95bc02fe	1800000
    5f981a5850e01a66dea02477	0
    5ff84fb8c7e1f46e6eb166f8	0.5
    5fc8ccf7a53d2408adb338d5	0
    6093dc403ca09c0c71e291b0	0
    5fb6243c99e7bf4e1d360f03	147700
    5f7c04ed81c28f430c0f1b8d	0
    60449071cea2ee0611acd13f	671960
    5f6352f6a71de93dfb703ec6	0
    60338843cea2ee06119fa7a1	0
    602a5fa0a567ab7b70155f13	1597900
    5f5643c1dce4e706c062853b	0
    5f61c2e0c6f6d54c2b5d3bf1	3
    6024fd78f2962646678942c0	0
    60b0cb9205315204eac0f616	558000
    60743ff151f0215b15145cc8	0
    609a71f97fd8b933de0cc321	0
    5f5643c1dce4e706c06284bd	12294339
    6155570e51cb61f523a0c247	4522000
    5f92dcc047a7594ce3be62a5	583600
    5fe44b3e0d2a6f1e48096555	0
    6017b079db2c7c1486f1a761	0
    61113b8f13dab83c7922627e	0
    5f5643c1dce4e706c06284f4	360380
    60b5e1078bcd62411deaf3c9	386
    5f5643c1dce4e706c0628536	1500000
    5fc77d1560633f22d0d9ef43	20
    618f9d95b45b1c92b771948c	2052000
    5f735436d8202569594ec88e	0
    61235e648f8673605733cb8a	3832600
    602b87b2539f7943a11a45f0	0
    5feb52940d2a6f1e480cd7a4	0
    6087c0af3ca09c0c71d6c8eb	1391400
    5f5cc6513550636330290341	0
    6034ee59cea2ee0611a0adab	0
    5fd9eff362e95d7fa0bfb0c1	0
    5fbe3583e4c8485e3ae54ca5	0
    5f5b613fdf9f45123cf19422	5249100
    608a91dc3ca09c0c71d996d0	444000
    5f5737dbdce4e706c06359d8	0
    6137193477da945055fb1f4a	0
    608010b33ca09c0c71cf94ec	2086000
    605ead1477a779348f7e8a14	0
    5f86f3c459302709af912c70	263000
    5f5643c1dce4e706c062853a	0
    5f98491a5c7dad7e31ab18e7	0
    608524ad3ca09c0c71d46c31	0
    5fbb7964e4c8485e3ae4490e	0
    60a63ee9c5b27164282550b6	0
    606d9b72243218283bb1269e	282
    5f6c93b4bea53b1307ca68c1	159500
    617aaecf121b0ff994ec4976	1656000
    6076dc6d79561815abc53b1f	0
    609bada77fd8b933de0e1b9b	0
    5f5b29dcdf9f45123cf1854f	0
    5fae9e00e47a3063d7b59223	0
    60407a11cea2ee0611a939e2	0
    5f5643c1dce4e706c06284e0	273408
    5f5643c1dce4e706c06284d3	0
    5f5643c1dce4e706c06284ec	0
    614c554657ac530a742e4d89	375080
    60befe6b39399a333bda716f	200
    60d72aa9fafc8d67742499d9	672400
    611f9356649dd01b5ee37abb	0
    60b8c75d39399a333bd34b95	0
    60226c118158d964a46ad5fb	0
    5fe33bc40d2a6f1e48091434	1070470
    610240b39500352c2bde1a8f	0
    606b30d5d455fc16311eb715	0
    5fe5fea00d2a6f1e480a38e4	0
    5fd09a1bb97b6e292684b54a	0
    5f5643c1dce4e706c0628548	0
    61418bd857ac530a741ec3fc	0
    6025143f89c5b85645ac3652	2
    5f5643c1dce4e706c06284ed	20069770
    5f64a2d92ebcbd2ad48413c2	0
    5fcf5aa2b97b6e2926843eed	0
    5f58912c4774fc5214b5621f	0
    5feb346c0d2a6f1e480cb9f3	0
    60f43cdfdf0e5b153de9e5c3	0
    60795c9479561815abc76fbc	0
    5fa8d59f02cb343f99895af9	0
    5fab798c96203340293f5457	0
    60221bb7d66ae51acab5a933	0
    6159bbdb51cb61f523a6aeca	0
    601e69c5f2dc9a62cfcd49b0	0
    5f880401d514da6381e9027d	0
    5fb0f456e47a3063d7b65fcb	0
    60929aa13ca09c0c71e17ee9	0
    616524fd51cb61f523b4e8cd	436000
    5f58db13b2543915e6705af6	0
    5fe5ecf40d2a6f1e480a283f	0
    5f89493360ab9d4f97b3167a	0.28
    6170da52121b0ff994dec965	300000
    5f65ddb43dc2221006aabab8	0
    5fd1cb7b998e3605d0eea5ea	0
    5fb3a45c8bb24d490cacc57a	0
    6003e700b6cd8e4a19d64a20	0
    5f72f3864f3b7f0f964241e4	0
    6054917a77a779348f75fe7a	0
    5f6c4189bea53b1307ca3b9f	0
    5fdc5db30f38c66b426e9755	0
    60bb649d39399a333bd6a1db	116
    5f98ff225c7dad7e31ab2a2a	0
    5f70632030d84b5dd198f14f	0
    606e8ea6243218283bb1e239	0
    601952dad5a81654bae54a94	0
    608aba0c3ca09c0c71d9e000	0
    60bf5f6239399a333bdb215d	160000
    5f71d4684f3b7f0f9641efb9	0
    5fb4f78b21b62e4386820526	0
    60bc85ce39399a333bd7c979	0
    5f8682bbbb780f32ccc3c35c	0
    600533c3b6cd8e4a19d6c2f2	0.05499999999
    605af8e777a779348f7b7f4d	0
    5fb8d396c6a87c5a51f56015	0
    5f5643c1dce4e706c0628567	0
    5fae8ca1e47a3063d7b57f93	0
    5fdae47762e95d7fa0bffe52	0
    5f5643c1dce4e706c0628527	0
    5fabf934b8c2d715818a8bfa	0
    5f7dce976b297e122df59341	0
    5fe5c24f0d2a6f1e480a01d1	0
    601a560e13d0910edd4a9c08	0
    5ff719dac7e1f46e6eb0fb3e	0
    5f578629dce4e706c0637c6f	0
    6188d70b62a741f07ce1957a	39600
    5f5ba4f66786602b6cf1789e	0
    5f817dc242a48549a590b6e2	0
    616ad9c8121b0ff994d6f8c0	0
    5fcf5049b97b6e292684365a	0
    5f5643c1dce4e706c0628521	0
    60d361a1fafc8d677420bf9e	0
    5f5ba4c96786602b6cf1789c	0
    5f5ba3506786602b6cf17849	1146000
    5f5643c1dce4e706c0628504	0
    5f5643c1dce4e706c0628556	0
    5f5643c1dce4e706c0628564	0
    5f5643c1dce4e706c06284b9	832000
    5f5643c1dce4e706c06284c8	767800
    5f89ab2760ab9d4f97b3679d	0
    5f5643c1dce4e706c06284f5	2033190
    5f5ba3706786602b6cf1784b	0
    5f5643c1dce4e706c0628541	4983400
    5f5643c1dce4e706c06284c3	1107500
    5f5643c1dce4e706c0628516	0
    5f5643c1dce4e706c06284d4	171384
    60e968f05449aa4cf4da3954	5488360
    5f5643c1dce4e706c06284e9	1124538
    5f5643c1dce4e706c0628513	6043980
    5f702ca330d84b5dd198dc15	0
    5f5ba3266786602b6cf17848	0
    5f5643c1dce4e706c062850e	7033000
    5f5643c1dce4e706c06284ca	132396
    6051a26e77a779348f730b4d	0
    5f5643c1dce4e706c0628562	0
    6037d2dfcea2ee0611a304ae	39170431
    5f5643c1dce4e706c06284c9	1577562
    5f5643c1dce4e706c06284f8	14623172
    5f5643c1dce4e706c062852e	0`
    const arr = data.split('	').join('\n').split('\n').map(v => v.replace(/ /g, ''))
    const mongoose = require('mongoose')
    console.log(arr.length)
    if (arr.length % 2 != 0) return
    for (let i = 0; i < arr.length; i += 2) {

      console.log(mongoose.Types.ObjectId(arr[i]))
      await instance.adjustmentSupplier.updateOne(
        {_id: mongoose.Types.ObjectId(arr[i])},
        {$set: {balance: parseFloat(arr[i + 1])}}
      )
      console.log('Done for',mongoose.Types.ObjectId(arr[i]))
    }
    console.log('Done')
  } catch (error) {
    console.log(error)
  }
}

module.exports = (instance, _, next) => {
  // startCron(instance);

  // startDeleteUnused(instance);

  // checkSuppliers(instance)

  // setItemsCategory(instance)

  // setSupplierBalance(instance)

  next();
};
