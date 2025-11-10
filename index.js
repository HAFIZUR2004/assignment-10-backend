// server.js
import express from "express";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

// Connect to MongoDB
async function run() {
  try {
    await client.connect();
    console.log("✅ MongoDB connected!");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
  }
}
run().catch(console.dir);

const db = client.db("Assignment-10-db");
const modelsCollection = db.collection("models");
const purchasesCollection = db.collection("purchases");

// ---------------- Routes ---------------- //

// Root
app.get("/", (req, res) => res.send("🚀 Backend running..."));

// Add Model
app.post("/models", async (req, res) => {
  try {
    const model = req.body;
    model.createdAt = new Date();
    model.purchased = 0;
    model.createdBy = model.createdBy || "unknown@example.com";
    model.ownerEmail = model.createdBy;
    model.description = model.description || "No description available";
    model.image = model.image || "https://via.placeholder.com/300x200?text=No+Image";

    const result = await modelsCollection.insertOne(model);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Get all models (optionally filter by user)
app.get("/models", async (req, res) => {
  try {
    const email = req.query.email;
    const query = email ? { createdBy: email } : {};
    const models = await modelsCollection.find(query).toArray();
    res.json({ success: true, data: models });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Get latest 6 models
app.get("/models/latest", async (req, res) => {
  try {
    const models = await modelsCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();
    res.json({ success: true, data: models });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Get model by ID
app.get("/models/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const model = await modelsCollection.findOne({ _id: new ObjectId(id) });
    if (!model) return res.status(404).json({ success: false, message: "Model not found" });
    res.json({ success: true, data: model });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Update model
app.put("/models/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const update = { $set: req.body };
    const result = await modelsCollection.updateOne({ _id: new ObjectId(id) }, update);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Delete model
app.delete("/models/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await modelsCollection.deleteOne({ _id: new ObjectId(id) });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Add a purchase
app.post("/purchases", async (req, res) => {
  try {
    const purchase = req.body;
    purchase.purchasedAt = new Date();
    const result = await purchasesCollection.insertOne(purchase);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Increment purchased count
app.post("/models/:id/purchase", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await modelsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $inc: { purchased: 1 } }
    );
    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Get purchases for a specific user with model details
app.get("/purchases", async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const purchases = await purchasesCollection
      .aggregate([
        { $match: { userEmail: email } },
        {
          $lookup: {
            from: "models",
            let: { modelIdStr: "$modelId" },
            pipeline: [
              {
                $match: { $expr: { $eq: ["$_id", { $toObjectId: "$$modelIdStr" }] } }
              }
            ],
            as: "modelInfo"
          }
        },
        { $unwind: "$modelInfo" },
        {
          $project: {
            _id: 1,
            modelId: 1,
            userEmail: 1,
            purchasedAt: 1,
            modelDetails: {
              _id: "$modelInfo._id",
              name: "$modelInfo.name",
              framework: "$modelInfo.framework",
              useCase: "$modelInfo.useCase",
              dataset: "$modelInfo.dataset",
              description: "$modelInfo.description",
              image: "$modelInfo.image",
              purchased: "$modelInfo.purchased",
              createdBy: "$modelInfo.createdBy",
            }
          }
        },
        { $sort: { purchasedAt: -1 } }
      ])
      .toArray();

    res.json({ success: true, data: purchases });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
