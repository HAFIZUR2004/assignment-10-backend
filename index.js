// index.js
import express from "express";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config(); // .env file থেকে credentials নেওয়া হচ্ছে

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = process.env.MONGO_URI;

// MongoDB Client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Connect to MongoDB
async function run() {
  try {
    await client.connect();
    console.log("✅ MongoDB connected successfully!");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
  }
}
run().catch(console.dir);

// Database & Collections
const db = client.db("Assignment-10-db");
const modelsCollection = db.collection("models");
const purchasesCollection = db.collection("purchases");

// ------------------------ ROUTES ------------------------ //

// Root
app.get("/", (req, res) => res.send("🚀 Backend is running..."));

// Add new model
app.post("/models", async (req, res) => {
  try {
    const model = req.body;
    model.createdAt = new Date();
    model.purchased = 0;
    const result = await modelsCollection.insertOne(model);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Get all models
app.get("/models", async (req, res) => {
  try {
    const models = await modelsCollection.find({}).toArray();
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

// Get single model by ID
app.get("/models/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const model = await modelsCollection.findOne({ _id: new ObjectId(id) });
    if (!model)
      return res.status(404).json({ success: false, message: "Model not found" });
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

// Add new purchase
app.post("/purchases", async (req, res) => {
  try {
    const purchase = req.body; // { modelId, userEmail }
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

// -------------------------------------------------------- //

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
