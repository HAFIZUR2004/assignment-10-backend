// index.js
import express from "express";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import cors from "cors";

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB URI
const uri =
  "mongodb+srv://Assignment-10-db:AiVwsq2RzArzW6ek@cluster0.o1btdpz.mongodb.net/?appName=Cluster0";

// MongoDB Client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("MongoDB connected successfully!");
  } catch (err) {
    console.error(err);
  }
}
run().catch(console.dir);

// Database & Collection
const db = client.db("Assignment-10-db");
const modelsCollection = db.collection("models");

// Routes
app.get("/", (req, res) => res.send("Backend is running..."));

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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
