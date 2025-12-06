const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// MongoDB URI
const uri =
  "mongodb+srv://fahim:8Z3t3D1qph1uEcBo@cluster0.56d1e2x.mongodb.net/?appName=Cluster0";

// MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: false,
  },
});

let partnersCollection;
let partnerRequestsCollection;

/** ==============================
 *  CONNECT TO DATABASE FIRST
 * ============================== */

async function connectDB() {
  try {
    await client.connect();
    const db = client.db("studymate-db");

    partnersCollection = db.collection("partners");
    partnerRequestsCollection = db.collection("partnerRequests");

    console.log("MongoDB Connected!");
  } catch (err) {
    console.error("MongoDB Connection Failed:", err);
  }
}

connectDB();

/** ==============================
 *  ROUTES
 * ============================== */

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("Server Running Successfully!");
});

// GET all partners
app.get("/partners", async (req, res) => {
  try {
    const partners = await partnersCollection.find().toArray();
    res.send(partners);
  } catch (err) {
    res.status(500).send({ message: "Error loading partners" });
  }
});

// GET one partner
app.get("/partners/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const partner = await partnersCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!partner) {
      return res.status(404).send({ message: "Partner not found" });
    }

    res.send(partner);
  } catch {
    res.status(400).send({ message: "Invalid ID" });
  }
});

// Add Partner
app.post("/partners", async (req, res) => {
  try {
    const data = req.body;
    const result = await partnersCollection.insertOne(data);
    res.send({ success: true, result });
  } catch {
    res.status(500).send({ message: "Failed to add partner" });
  }
});

// Increase partner count
app.patch("/partners/:id/increase-count", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await partnersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $inc: { partnerCount: 1 } }
    );
    res.send({ success: true });
  } catch {
    res.status(500).send({ message: "Error increasing count" });
  }
});

// Decrease partner count
app.patch("/partners/:id/decrease-count", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await partnersCollection.updateOne(
      { _id: new ObjectId(id), partnerCount: { $gt: 0 } },
      { $inc: { partnerCount: -1 } }
    );
    res.send({ success: true });
  } catch {
    res.status(500).send({ message: "Error decreasing count" });
  }
});

// Create request
app.post("/partner-requests", async (req, res) => {
  try {
    const data = req.body;
    const result = await partnerRequestsCollection.insertOne({
      ...data,
      requestedAt: new Date(),
    });
    res.send({ success: true });
  } catch {
    res.status(500).send({ message: "Failed to create request" });
  }
});

// Get requests by email
app.get("/partner-requests", async (req, res) => {
  try {
    const email = req.query.email;
    const requests = await partnerRequestsCollection
      .find({ requestedBy: email })
      .toArray();
    res.send(requests);
  } catch {
    res.status(500).send({ message: "Failed to load requests" });
  }
});

// Delete request
app.delete("/partner-requests/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await partnerRequestsCollection.deleteOne({ _id: new ObjectId(id) });
    res.send({ success: true });
  } catch {
    res.status(400).send({ message: "Invalid ID" });
  }
});

// Server start
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
