const { authGuard, admin } = require("../middleware/auth");
const { transporter } = require("../middleware/sendEmail");
const fs = require("fs");
const _ = require("lodash");
const { Project, validateProject } = require("../models/project");
const { Company, validateCompany } = require("../models/company");
const { Tag, validateTag } = require("../models/tag");
const {
  ItemsCatAndGroup,
  validateItemsCatAndGroup,
} = require("../models/itemsCatAndGroup");
const {
  SupplierCategory,
  validateSupplierCategory,
} = require("../models/supplierCategory");
const { CostCenter, validateCostCenter } = require("../models/costCenter");
const { Item, validateItem } = require("../models/item");
const { Auction, validateAuction } = require("../models/auction");
const multer = require("multer");
const express = require("express");
const { validateBudget, Budget } = require("../models/budget");
const router = express.Router();

const fileStorageEngine = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "--" + file.originalname);
  },
});

const upload = multer({ storage: fileStorageEngine });

router.get("/getAllProjects/:companyId", authGuard, async (req, res) => {
  const project = await Project.find({
    companyId: req.params.companyId,
  }).select(
    "_id project_name startDate endDate description location currency project_reference_number project_manager business_unit unit department project_status image createdBy users"
  );

  project.length <= 0
    ? res
        .status(400)
        .send({ responseCode: "99", responseDescription: `No record found` })
    : res.status(200).send({
        project,
        responseCode: "00",
        responseDescription: `Succesfull`,
      });
});

router.post("/addProject", [authGuard, admin], async (req, res) => {
  const { error } = validateProject(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    let project = new Project(
      _.pick(req.body, [
        "project_name",
        "startDate",
        "endDate",
        "location",
        "description",
        "project_reference_number",
        "project_manager",
        "business_unit",
        "unit",
        "department",
        "currency",
        "project_status",
        "companyId",
        "image",
        "createdBy",
      ])
    );

    project = await project.save();
    res.send({
      project,
      responseCode: "00",
      responseDescription: "Project created Successfully",
    });
  } catch (ex) {
    console.log(ex.message);
  }
});

router.post(
  "/addProjectUser/:projectId",
  [authGuard, admin],
  async (req, res) => {
    // const { error } = validateProject(req.body);
    // if (error) return res.status(400).send(error.details[0].message);

    try {
      let project = await Project.findById(req.params.projectId);

      if (project) {
        project.users.push({
          user: req.body.userId,
          role: req.body.role,
        });
        project = await project.save();
        res.send({
          project,
          responseCode: "00",
          responseDescription: "User added Successfully",
        });
      }
    } catch (ex) {
      console.log(ex.message);
    }
  }
);

router.post("/saveProjectAsDraft", [authGuard, admin], async (req, res) => {
  try {
    let project = new Project(
      _.pick(req.body, [
        "project_name",
        "startDate",
        "endDate",
        "location",
        "description",
        "project_reference_number",
        "project_manager",
        "business_unit",
        "unit",
        "department",
        "currency",
        "project_status",
        "companyId",
        "image",
        "createdBy",
      ])
    );

    project = await project.save();
    res.send({
      project,
      responseCode: "00",
      responseDescription: "Project saved as draft Successfully",
    });
  } catch (ex) {
    console.log(ex.message);
  }
});

router.patch(
  "/editProjectUser/:projectId/:userId",
  [authGuard, admin],
  async (req, res) => {
    // const { error } = validateProject(req.body);
    // if (error) return res.status(400).send(error.details[0].message);

    try {
      let project = await Project.findOneAndUpdate(
        { _id: req.params.projectId, "users.user": req.params.userId },
        { $set: { "users.$.role": req.body.newRole } }
      );

      project = await project.save();
      res.send({
        // project,
        responseCode: "00",
        responseDescription: "User updated Successfully",
      });
    } catch (ex) {
      console.log(ex.message);
    }
  }
);

router.patch(
  "/EditsaveProjectDraft/:id",
  [authGuard, admin],
  async (req, res) => {
    let project = await Project.findOne({
      _id: req.params.id,
    });
    if (project) {
      try {
        project.project_name = req.body.project_name;
        project.startDate = req.body.startDate;
        project.endDate = req.body.endDate;
        project.location = req.body.location;
        project.description = req.body.description;
        project.project_reference_number = req.body.project_reference_number;
        project.project_manager = req.body.project_manager;
        project.business_unit = req.body.business_unit;
        project.unit = req.body.unit;
        project.department = req.body.department;
        project.currency = req.body.currency;
        project.project_status = req.body.project_status;
        project.company_name = req.body.company_name;
        project.image = req.body.image;

        project = await project.save();
        res.send({
          project,
          responseCode: "00",
          responseDescription: "Project updated Successfully",
        });
      } catch (ex) {
        console.log(ex.message);
      }
    } else {
      res.send({
        responseCode: "99",
        responseDescription: `Project with id ${req.params.id} does not exist`,
      });
    }
  }
);

router.get("/auctions/:getAllActionsByBuyerUserID", async (req, res) => {
  const auction = await Auction.find({
    userId: req.params.getAllActionsByBuyerUserID,
  });
  auction.length <= 0
    ? res
        .status(400)
        .send({ responseCode: "99", responseDescription: "No record found" })
    : res.status(200).send({
        auction,
        responseCode: "00",
        responseDescription: "Succesfull",
      });
});

router.get("/auctions/supplier/:getAllActionsByEmail", async (req, res) => {
  const auction = await Auction.find({
    "auctions.supplier_email": req.params.getAllActionsByEmail,
  });

  if (auction.length > 0) {
    const supplier_auctions = auction[0].auctions.filter(
      (x) => x.supplier_email === `${req.params.getAllActionsByEmail}`
    );

    const result = [];
    result.push(...supplier_auctions, {
      auctionId: auction[0]._id,
      link: auction[0].link,
      documentPath: auction[0].documentPath,
    });

    res.send({
      result,
      responseCode: "00",
      responseDescription: "Succesfull",
    });
  } else {
    res.send({
      responseCode: "99",
      responseDescription: "No record found",
    });
  }
});

router.post("/addAuction", upload.array("documents", 10), async (req, res) => {
  const { error } = validateAuction(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    let auction = new Auction(
      _.pick(req.body, [
        "name",
        "owner",
        "description",
        "start_date",
        "end_date",
        "starting_price",
        "cost_center",
        "currency",
        "link",
        "budget",
        "minimum_step",
        "cool_down_period",
        "item",
        "suppliers_email",
        "buyer_status",
        "supplier_status",
        "company_buyer_name",
        "userId",
      ])
    );

    const upload_url = `${process.env.VERIFICATION_URL}/uploads/`;
    const path = "uploads\\\\";

    const documentsPath = req.files;

    documentsPath.forEach((items) => {
      auction.documentPath.push({
        fileName: `${upload_url}${items.filename}`,
        path: `${path}${items.filename}`,
      });
    });

    const data = req.body.suppliers_email;
    data.forEach((items) => {
      auction.auctions.push({
        description: req.body.description,
        name: req.body.name,
        owner: req.body.owner,
        start_date: req.body.start_date,
        end_date: req.body.end_date,
        starting_price: req.body.starting_price,
        cost_center: req.body.cost_center,
        currency: req.body.currency,
        budget: req.body.budget,
        minimum_step: req.body.minimum_step,
        cool_down_period: req.body.cool_down_period,
        item: req.body.item,
        buyer_status: req.body.buyer_status,
        supplier_status: req.body.supplier_status,
        company_buyer_name: req.body.company_buyer_name,
        supplier_email: items,
      });
    });

    (auction.userId = req.body.userId),
      (auction.link = req.body.link),
      (auction = await auction.save());

    const notification_url = `${process.env.VERIFICATION_URL}`;
    // SEND THE SELLER A NOTIFICATION EMAIL
    const compose =
      `Hello! <br><br> You have been invited to be part of an auction by <b>${req.body.company_buyer_name}</b>.<br><br>` +
      `Kindly login to OKTIO to see auction.<br>` +
      `<h5><a style="color: #ee491f;" href="${notification_url}">Click here</a></h5><br> ` +
      `<p>Thank you for joining <span style="color: #ee491f;"><b>Oktio</b></span> and we look forward to seeing you onboard.</p>` +
      `Best Regards, <br/> OKTIO Team`;

    const mailOptions = {
      from: "noreply@otkio.com", // sender address
      bcc: `${req.body.suppliers_email}`, // list of receivers
      subject: "Auction Notification", // Subject line
      html: `${compose}`, // html body
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
    return res.send({
      auction,
      responseCode: "00",
      responseDescription:
        "Auction created and notification email sent Successfully",
    });
  } catch (ex) {
    console.log(ex.message);
  }
});

router.patch(
  "/auctions/supplier/EditsaveAuctionDraft/:id",
  async (req, res) => {
    const auction = await Auction.findOne({
      _id: req.params.id,
    });

    try {
      // Checking for newly added supplier email
      if (req.body.suppliers_email.length > 0) {
        const data = req.body.suppliers_email;
        data.forEach((items) => {
          auction.auctions.push({
            description: req.body.description,
            name: req.body.name,
            owner: req.body.owner,
            start_date: req.body.start_date,
            end_date: req.body.end_date,
            starting_price: req.body.starting_price,
            cost_center: req.body.cost_center,
            currency: req.body.currency,
            budget: req.body.budget,
            minimum_step: req.body.minimum_step,
            cool_down_period: req.body.cool_down_period,
            item: req.body.item,
            buyer_status: req.body.buyer_status,
            supplier_status: "Pending",
            company_buyer_name: req.body.company_buyer_name,
            supplier_email: items,
          });
        });

        await auction.save();
        return res.send({
          auction,
          responseCode: "00",
          responseDescription: "Seller added to auction succesfully",
        });
      } else if (req.body.suppliers_email.length <= 0) {
        let updateArray = auction.auctions.filter((x) => {
          (x.name = req.body.name),
            (x.owner = `${req.body.owner}`),
            (x.description = `${req.body.description}`),
            (x.start_date = `${req.body.start_date}`),
            (x.end_date = `${req.body.end_date}`),
            (x.starting_price = `${req.body.starting_price}`),
            (x.cost_center = `${req.body.cost_center}`),
            (x.currency = `${req.body.currency}`),
            (x.budget = `${req.body.budget}`),
            (x.minimum_step = `${req.body.minimum_step}`),
            (x.cool_down_period = `${req.body.cool_down_period}`),
            (x.item = `${req.body.item}`),
            (x.buyer_status = `${req.body.buyer_status}`);
        });

        auction.link = req.body.link;
        await auction.save(updateArray);

        res.send({
          auction,
          responseCode: "00",
          responseDescription: "Auction updated Successfully",
        });
      } else {
        res.send({
          responseCode: "99",
          responseDescription: `Auction with id ${req.params.id} does not exist`,
        });
      }
    } catch (ex) {
      console.log(ex.message);
    }
  }
);

router.post(
  "/suppier/saveAuctionAsDraft",
  upload.array("documents", 10),
  async (req, res) => {
    const { error } = validateAuction(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
      let auction = new Auction(
        _.pick(req.body, [
          "name",
          "owner",
          "description",
          "start_date",
          "end_date",
          "starting_price",
          "cost_center",
          "currency",
          "link",
          "budget",
          "minimum_step",
          "cool_down_period",
          "item",
          "suppliers_email",
          "buyer_status",
          "supplier_status",
          "company_buyer_name",
          "userId",
        ])
      );

      const upload_url = `${process.env.VERIFICATION_URL}/uploads/`;
      const path = "uploads\\\\";

      const documentsPath = req.files;

      documentsPath.forEach((items) => {
        auction.documentPath.push({
          fileName: `${upload_url}${items.filename}`,
          path: `${path}${items.filename}`,
        });
      });

      const data = req.body.suppliers_email;
      data.forEach((items) => {
        auction.auctions.push({
          description: req.body.description,
          name: req.body.name,
          owner: req.body.owner,
          start_date: req.body.start_date,
          end_date: req.body.end_date,
          starting_price: req.body.starting_price,
          cost_center: req.body.cost_center,
          currency: req.body.currency,
          budget: req.body.budget,
          minimum_step: req.body.minimum_step,
          cool_down_period: req.body.cool_down_period,
          item: req.body.item,
          buyer_status: req.body.buyer_status,
          supplier_status: req.body.supplier_status,
          company_buyer_name: req.body.company_buyer_name,
          supplier_email: items,
        });
      });

      (auction.userId = req.body.userId),
        (auction.link = req.body.link),
        (auction = await auction.save());
      return res.send({
        auction,
        responseCode: "00",
        responseDescription: "Auction saved as draft Successfully",
      });
    } catch (ex) {
      console.log(ex.message);
    }
  }
);

router.delete("/deleteProject", [authGuard, admin], async (req, res) => {
  let project = await Project.findOne({
    _id: req.body.id,
  });

  if (project) {
    try {
      project = await project.deleteOne();
      res.send({
        responseCode: "00",
        responseDescription: `Company project deleted Successfully`,
      });
    } catch (ex) {
      console.log(ex.message);
    }
  }
});

router.get(
  "/item/:getAllItemsByBuyerCompanyName",
  authGuard,
  async (req, res) => {
    const item = await Item.find({
      company_name: req.params.getAllItemsByBuyerCompanyName,
    }).select(
      "_id itemId item_name manufacturer notes unit category model group tagss image_upload company_name link status document"
    );

    console.log(item);

    item.length <= 0
      ? res
          .status(400)
          .send({ responseCode: "99", responseDescription: `No record found` })
      : res.status(200).send({
          item,
          responseCode: "00",
          responseDescription: `Succesfull`,
        });
  }
);

router.post(
  "/item/addItem",
  upload.array("documents", 10),
  async (req, res) => {
    const { error } = validateItem(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
      let item = new Item(
        _.pick(req.body, [
          "itemId",
          "item_name",
          "manufacturer",
          "notes",
          "unit",
          "category",
          "model",
          "group",
          "status",
          "tagss",
          "image_upload",
          "company_name",
          "link",
          "userId",
        ])
      );

      const url = `${process.env.VERIFICATION_URL}/uploads/`;
      const path = "uploads\\\\";

      const document = req.files;

      document.forEach((items) => {
        item.document.push({
          fileName: `${url}${items.filename}`,
          path: `${path}${items.filename}`,
        });
      });

      item = await item.save();
      res.send({
        item,
        responseCode: "00",
        responseDescription: "Item created Successfully",
      });
    } catch (ex) {
      console.log(ex.message);
    }
  }
);

router.post(
  "/item/saveItemAsDraft",
  [authGuard, admin],
  upload.array("documents", 10),
  async (req, res) => {
    try {
      let item = new Item(
        _.pick(req.body, [
          "itemId",
          "item_name",
          "manufacturer",
          "notes",
          "unit",
          "category",
          "model",
          "group",
          "tagss",
          "image_upload",
          "company_name",
          "link",
          "userId",
          "status",
        ])
      );

      const url = `${process.env.VERIFICATION_URL}/uploads/`;
      const path = "uploads\\\\";

      const documentsPath = req.files;

      documentsPath.forEach((items) => {
        item.document.push({
          fileName: `${url}${items.filename}`,
          path: `${path}${items.filename}`,
        });
      });
      item = await item.save();
      res.send({
        item,
        responseCode: "00",
        responseDescription: "Item saved as draft Successfully",
      });
    } catch (ex) {
      console.log(ex.message);
    }
  }
);

router.patch(
  "/item/EditsaveItemDraft/:id",
  [authGuard, admin],
  async (req, res) => {
    let item = await Item.findOne({
      _id: req.params.id,
    });
    if (item) {
      try {
        item = await item.updateOne({
          $set: {
            itemid: req.body.itemId,
            item_name: req.body.item_name,
            manufacturer: req.body.manufacturer,
            notes: req.body.notes,
            unit: req.body.unit,
            category: req.body.category,
            model: req.body.model,
            group: req.body.group,
            tagss: req.body.tagss,
            image_upload: req.body.image_upload,
            company_name: req.body.company_name,
            link: req.body.link,
            status: req.body.status,
          },
        });

        res.send({
          item,
          responseCode: "00",
          responseDescription: "Item updated Successfully",
        });
      } catch (ex) {
        console.log(ex.message);
      }
    } else {
      res.send({
        responseCode: "99",
        responseDescription: `Item with id ${req.params.id} does not exist`,
      });
    }
  }
);

router.patch("/item/deleteItemDocument", async (req, res) => {
  let item = await Item.findOne({
    "document._id": req.body.id,
  });

  var deletedItem = item.document;
  var result = deletedItem.filter((item) => {
    return item._id == req.body.id;
  });

  if (item) {
    try {
      item = await item.updateOne({
        $pull: {
          document: { fileName: req.body.fileName },
        },
      });

      fs.unlinkSync(req.body.path);

      res.send({
        result,
        responseCode: "00",
        responseDescription: `File deleted Successfully`,
      });
    } catch (ex) {
      console.log(ex.message);
    }
  }
});

router.patch(
  "/item/document/uploadDocument",
  upload.array("documents", 10),
  async (req, res) => {
    let item = await Item.findOne({
      _id: req.body.id,
    });

    if (item) {
      try {
        const url = `${process.env.VERIFICATION_URL}/uploads/`;
        const path = "uploads\\\\";

        const document = req.files;

        document.forEach((items) => {
          item.document.push({
            fileName: `${url}${items.filename}`,
            path: `${path}${items.filename}`,
          });
        });

        item = await item.save();
        const uploadedDocument = item.document.slice(-1);

        res.send({
          uploadedDocument,
          responseCode: "00",
          responseDescription: `File updated Successfully`,
        });
      } catch (ex) {
        console.log(ex.message);
      }
    }
  }
);

router.delete("/item/deleteItem", async (req, res) => {
  let item = await Item.findOne({
    _id: req.body.id,
  });
  try {
    item.document.forEach((items) => {
      fs.unlinkSync(items.path);
    });

    item = await item.deleteOne();
    res.send({
      responseCode: "00",
      responseDescription: `Company item deleted Successfully`,
    });
  } catch (ex) {
    console.log(ex.message);
  }
});

router.patch("/company/profile/:companyName", async (req, res) => {
  const companyProfile = await Company.find({
    company_name: req.params.companyName,
  });
  console.log(companyProfile);
  // .select("-_id name createdDate");

  // companyProfile.length <= 0
  //   ? res
  //       .status(400)
  //       .send({ responseCode: "99", responseDescription: `No record found` })
  //   : res.status(200).send({
  //       companyProfile,
  //       responseCode: "00",
  //       responseDescription: `Succesfull`,
  //     });
});

router.post("/company/addTag", async (req, res) => {
  const { error } = validateTag(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    let tag = new Tag({
      ..._.pick(req.body, ["name", "companyId", "userId"]),
      createdBy: req.body.userId,
    });

    tag = await tag.save();
    res.send({
      tag,
      responseCode: "00",
      responseDescription: "Tag created Successfully",
    });
  } catch (ex) {
    console.log(ex.message);
  }
});

router.get("/company/getItemsCatGroups/:companyId", async (req, res) => {
  const itemsCatAndGroups = await ItemsCatAndGroup.find({
    companyId: req.params.companyId,
  }).select("_id name itemType createdDate");
  // console.log(itemsCatAndGroups);
  itemsCatAndGroups.length <= 0
    ? res
        .status(400)
        .send({ responseCode: "99", responseDescription: `No record found` })
    : res.status(200).send({
        itemsCatAndGroups,
        responseCode: "00",
        responseDescription: `Succesfull`,
      });
});

router.get("/company/getSupplierCategories/:companyId", async (req, res) => {
  const supplierCategories = await SupplierCategory.find({
    companyId: req.params.companyId,
  }).select("_id name createdDate");
  // console.log(supplierCategories);
  supplierCategories.length <= 0
    ? res
        .status(400)
        .send({ responseCode: "99", responseDescription: `No record found` })
    : res.status(200).send({
        supplierCategories,
        responseCode: "00",
        responseDescription: `Succesfull`,
      });
});

router.get("/company/getCostCenter/:companyId", async (req, res) => {
  const costCenter = await CostCenter.find({
    companyId: req.params.companyId,
  }).select("_id name createdDate");
  //console.log(costCenter);
  costCenter.length <= 0
    ? res
        .status(400)
        .send({ responseCode: "99", responseDescription: `No record found` })
    : res.status(200).send({
        costCenter,
        responseCode: "00",
        responseDescription: `Succesfull`,
      });
});

router.get("/company/getTag/:companyId", async (req, res) => {
  const tag = await Tag.find({
    companyId: req.params.companyId,
  }).select("_id name createdDate");
  // console.log(supplierCategories);
  tag.length <= 0
    ? res
        .status(400)
        .send({ responseCode: "99", responseDescription: `No record found` })
    : res.status(200).send({
        tag,
        responseCode: "00",
        responseDescription: `Succesfull`,
      });
});

router.post(
  "/company/addItemsCatGroup",
  [authGuard, admin],
  async (req, res) => {
    const { error } = validateItemsCatAndGroup(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
      let itemsCatAndGroup = new ItemsCatAndGroup({
        ..._.pick(req.body, ["name", "itemType", "companyId"]),
        createdBy: req.body.userId,
      });

      itemsCatAndGroup = await itemsCatAndGroup.save();
      res.send({
        itemsCatAndGroup,
        responseCode: "00",
        responseDescription: `${itemsCatAndGroup.itemType} created Successfully`,
      });
    } catch (ex) {
      console.log(ex.message);
    }
  }
);

router.post(
  "/company/addSupplierCategory",
  [authGuard, admin],
  async (req, res) => {
    const { error } = validateSupplierCategory(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
      let supplierCategory = new SupplierCategory({
        ..._.pick(req.body, ["name", "companyId", "userId"]),
        createdBy: req.body.userId,
      });

      supplierCategory = await supplierCategory.save();
      res.send({
        supplierCategory,
        responseCode: "00",
        responseDescription: "Supplier Category created Successfully",
      });
    } catch (ex) {
      console.log(ex.message);
    }
  }
);

router.patch(
  "/company/editItemsCatGroup/:id",
  [authGuard, admin],
  async (req, res) => {
    let itemsCatAndGroup = await ItemsCatAndGroup.findById(req.params.id);
    if (itemsCatAndGroup) {
      itemsCatAndGroup.name = req.body.name;
      itemsCatAndGroup.updatedBy = req.body.userId;

      itemsCatAndGroup = await itemsCatAndGroup.save();
      res.send({
        itemsCatAndGroup,
        responseCode: "00",
        responseDescription: `${itemsCatAndGroup.itemType} updated Successfully`,
      });
    } else {
      res.send({
        responseCode: "99",
        responseDescription: `${req.body.itemType} with id ${req.body._id} does not exist`,
      });
    }
  }
);

router.patch(
  "/company/editSupplierCategory/:id",
  [authGuard, admin],
  async (req, res) => {
    let supplierCategory = await SupplierCategory.findById(req.params.id);
    if (supplierCategory) {
      supplierCategory.name = req.body.name;
      supplierCategory.updatedBy = req.body.userId;

      supplierCategory = await supplierCategory.save();
      res.send({
        supplierCategory,
        responseCode: "00",
        responseDescription: `${supplierCategory.itemType} updated Successfully`,
      });
    } else {
      res.send({
        responseCode: "99",
        responseDescription: `${req.body.itemType} with id ${req.body._id} does not exist`,
      });
    }
  }
);

router.delete(
  "/company/deleteItemsCatGroup/:id",
  [authGuard, admin],
  async (req, res) => {
    let itemsCatAndGroup = await ItemsCatAndGroup.findById(req.params.id);

    if (itemsCatAndGroup) {
      try {
        itemsCatAndGroup = await ItemsCatAndGroup.deleteOne();
        res.send({
          responseCode: "00",
          responseDescription: `Company items Category/Group deleted Successfully`,
        });
      } catch (ex) {
        console.log(ex.message);
      }
    }
  }
);

router.delete(
  "/deleteProjectUser/:projectId/:userId",
  [authGuard, admin],
  async (req, res) => {
    // const { error } = validateProject(req.body);
    // if (error) return res.status(400).send(error.details[0].message);

    try {
      let project = await Project.findByIdAndUpdate(req.params.projectId, {
        $pull: { users: { user: req.params.userId } },
      });

      project = await project.save();
      res.send({
        // project,
        responseCode: "00",
        responseDescription: "User removed Successfully",
      });
    } catch (ex) {
      console.log(ex.message);
    }
  }
);

router.delete(
  "/company/deleteSupplierCategory/:id",
  [authGuard, admin],
  async (req, res) => {
    let supplierCategory = await SupplierCategory.findById(req.params.id);

    if (supplierCategory) {
      try {
        supplierCategory = await SupplierCategory.deleteOne();
        res.send({
          responseCode: "00",
          responseDescription: `Company suppliers Category deleted Successfully`,
        });
      } catch (ex) {
        console.log(ex.message);
      }
    }
  }
);

router.post("/company/addCostCenter", async (req, res) => {
  const { error } = validateCostCenter(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    let costCenter = new CostCenter({
      ..._.pick(req.body, ["name", "companyId"]),
      createdBy: req.body.userId,
    });

    costCenter = await costCenter.save();
    res.send({
      costCenter,
      responseCode: "00",
      responseDescription: "Cost center created Successfully",
    });
  } catch (ex) {
    console.log(ex.message);
  }
});

router.post("/company/:projectId/addBudget", async (req, res) => {
  const { error } = validateBudget(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    let budget = new Budget({
      ..._.pick(req.body, ["budget", "companyId", "costCenter"]),
      projectId: req.params.projectId,
      createdBy: req.body.userId,
    });

    budget = await budget.save();

    let project = await Project.findById(req.params.projectId);

    if (project) {
      project.budgets.push(budget._id);
      project = await project.save();
    }
    res.send({
      budget,
      responseCode: "00",
      responseDescription: "Cost center created Successfully",
    });
  } catch (ex) {
    console.log(ex.message);
  }
});

// router.patch("/company/editBudget", async (req, res) => {
//   const { error } = validateBudget(req.body);
//   if (error) return res.status(400).send(error.details[0].message);

//   try {
//     let budget = new Budget({
//       ..._.pick(req.body, ["budget", "companyId", "costCenter"]),
//       projectId: req.params.projectId,
//       createdBy: req.body.userId,
//     });

//     budget = await budget.save();

//     let project = await Project.findById(req.params.projectId);

//     if (project) {
//       project.budgets.push(budget._id);
//       project = await project.save();
//     }
//     res.send({
//       budget,
//       responseCode: "00",
//       responseDescription: "Cost center created Successfully",
//     });
//   } catch (ex) {
//     console.log(ex.message);
//   }
// });

// router.patch(
//   "/company/costCenter/:id",
//   [authGuard, admin],
//   async (req, res) => {
//     let costCenter = await CostCenter.findOne({
//       _id: req.params.id,
//     });
//     if (costCenter) {
//       try {
//         costCenter.name = req.body.name;
//         costCenter.updatedBy = req.body.userId;

//         costCenter = await costCenter.save();
//         res.send({
//           costCenter,
//           responseCode: "00",
//           responseDescription: "Cost Center updated Successfully",
//         });
//       } catch (ex) {
//         console.log(ex.message);
//       }
//     } else {
//       res.send({
//         responseCode: "99",
//         responseDescription: `Cost Center with id ${req.body._id} does not exist`,
//       });
//     }
//   }
// );

router.patch("/company/editCostCenter/:id", async (req, res) => {
  let costCenter = await CostCenter.findById(req.params.id);
  if (costCenter) {
    costCenter.name = req.body.name;
    costCenter.updatedBy = req.body.userId;

    costCenter = await costCenter.save();
    res.send({
      costCenter,
      responseCode: "00",
      responseDescription: "Cost center updated Successfully",
    });
  } else {
    res.send({
      responseCode: "99",
      responseDescription: `Cost center with id ${req.body._id} does not exist`,
    });
  }
});

router.patch("/company/editTag/:id", async (req, res) => {
  let tag = await Tag.findById(req.params.id);
  if (tag) {
    tag.name = req.body.name;
    tag.updatedBy = req.body.userId;

    tag = await tag.save();
    res.send({
      tag,
      responseCode: "00",
      responseDescription: "Tag updated Successfully",
    });
  } else {
    res.send({
      responseCode: "99",
      responseDescription: `Tag with id ${req.body.userId} does not exist`,
    });
  }
});

router.delete("/company/deleteCostCenter/:id", async (req, res) => {
  let costCenter = await CostCenter.findById(req.params.id);

  if (costCenter) {
    try {
      costCenter = await CostCenter.deleteOne();
      res.send({
        responseCode: "00",
        responseDescription: `Cost Center deleted Successfully`,
      });
    } catch (ex) {
      console.log(ex.message);
    }
  }
});

router.delete("/company/deleteTag/:id", async (req, res) => {
  let tag = await Tag.findById(req.params.id);

  if (tag) {
    try {
      tag = await Tag.deleteOne();
      res.send({
        responseCode: "00",
        responseDescription: `Tag deleted Successfully`,
      });
    } catch (ex) {
      console.log(ex.message);
    }
  }
});

module.exports = router;