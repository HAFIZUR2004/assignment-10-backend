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

// ---------------- MongoDB Setup ---------------- //
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.o1btdpz.mongodb.net/?appName=Cluster0`;

let cachedClient = null;
let cachedDb = null;

async function connectToMongo() {
  if (cachedClient && cachedDb) return { client: cachedClient, db: cachedDb };

  const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
  });

  // await client.connect();
  // await client.db("admin").command({ ping: 1 });
  console.log("✅ MongoDB connected!");

  const db = client.db("Assignment-10-db");
  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

// ---------------- Routes ---------------- //

// Root
app.get("/", async (req, res) => {
  try {
    await connectToMongo();
    res.send("🚀 Backend running and DB connected!");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Database connection failed!");
  }
});

// Add Model
app.post("/models", async (req, res) => {
  try {
    const { db } = await connectToMongo();
    const modelsCollection = db.collection("models");

    const model = {
      ...req.body,
      createdAt: new Date(),
      purchased: 0,
      createdBy: req.body.createdBy || "unknown@example.com",
      ownerEmail: req.body.createdBy || "unknown@example.com",
      description: req.body.description || "No description available",
      image: req.body.image || "https://via.placeholder.com/300x200?text=No+Image",
    };

    const result = await modelsCollection.insertOne(model);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Get all models (optionally by user email)
app.get("/models", async (req, res) => {
  try {
    const { db } = await connectToMongo();
    const modelsCollection = db.collection("models");

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
    const { db } = await connectToMongo();
    const modelsCollection = db.collection("models");

    const models = await modelsCollection.find({}).sort({ createdAt: -1 }).limit(6).toArray();
    res.json({ success: true, data: models });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Get model by ID
app.get("/models/:id", async (req, res) => {
  try {
    const { db } = await connectToMongo();
    const modelsCollection = db.collection("models");

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
    const { db } = await connectToMongo();
    const modelsCollection = db.collection("models");

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
    const { db } = await connectToMongo();
    const modelsCollection = db.collection("models");

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
    const { db } = await connectToMongo();
    const purchasesCollection = db.collection("purchases");

    const purchase = { ...req.body, purchasedAt: new Date() };
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
    const { db } = await connectToMongo();
    const modelsCollection = db.collection("models");

    const id = req.params.id;
    const result = await modelsCollection.updateOne({ _id: new ObjectId(id) }, { $inc: { purchased: 1 } });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Get all purchases for a user with model details
app.get("/purchases", async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const { db } = await connectToMongo();
    const purchasesCollection = db.collection("purchases");

    const purchases = await purchasesCollection
      .aggregate([
        { $match: { userEmail: email } },
        {
          $lookup: {
            from: "models",
            let: { modelIdStr: "$modelId" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", { $toObjectId: "$$modelIdStr" }] } } },
            ],
            as: "modelInfo",
          },
        },
        { $unwind: "$modelInfo" },
        {
          $project: {
            _id: 1,
            modelId: 1,
            userEmail: 1,
            purchasedAt: 1,
            modelDetails: "$modelInfo",
          },
        },
        { $sort: { purchasedAt: -1 } },
      ])
      .toArray();

    res.json({ success: true, data: purchases });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// ---------------- Start server ---------------- //
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
// 11/12/25