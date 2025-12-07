const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = 5000;

// Middlewares
app.use(cors());
app.use(express.json());


// MongoDB URI
const uri =
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.56d1e2x.mongodb.net/?appName=Cluster0`;

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

// Connect to DB
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

// Routes
app.get("/", (req, res) => {
  res.send("Server Running Successfully!");
});

/** GET Partners with optional search & sort */
app.get("/partners", async (req, res) => {
  try {
    const { subject, sort } = req.query; // e.g., ?subject=math&sort=asc
    const query = {};
    if (subject) {
      query.subject = { $regex: new RegExp(subject, "i") }; // case-insensitive search
    }

    const sortOrder = sort === "asc" ? 1 : sort === "desc" ? -1 : 0;
    let cursor = partnersCollection.find(query);
    if (sortOrder !== 0) {
      cursor = cursor.sort({ experience: sortOrder });
    }

    const partners = await cursor.toArray();
    res.send(partners);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Error loading partners" });
  }
});

app.get("/partners/:id", async (req, res) => {
  try {
    const partner = await partnersCollection.findOne({
      _id: new ObjectId(req.params.id),
    });
    if (!partner) return res.status(404).send({ message: "Partner not found" });
    res.send(partner);
  } catch {
    res.status(400).send({ message: "Invalid ID" });
  }
});

app.post("/partners", async (req, res) => {
  try {
    const data = req.body;
    const result = await partnersCollection.insertOne(data);
    res.send({ success: true, result });
  } catch {
    res.status(500).send({ message: "Failed to add partner" });
  }
});

app.patch("/partners/:id/increase-count", async (req, res) => {
  try {
    await partnersCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $inc: { partnerCount: 1 } }
    );
    res.send({ success: true });
  } catch {
    res.status(500).send({ message: "Error increasing count" });
  }
});

app.patch("/partners/:id/decrease-count", async (req, res) => {
  try {
    await partnersCollection.updateOne(
      { _id: new ObjectId(req.params.id), partnerCount: { $gt: 0 } },
      { $inc: { partnerCount: -1 } }
    );
    res.send({ success: true });
  } catch {
    res.status(500).send({ message: "Error decreasing count" });
  }
});

// Partner Requests
app.post("/partner-requests", async (req, res) => {
  try {
    const data = req.body;
    await partnerRequestsCollection.insertOne({ ...data, requestedAt: new Date() });
    res.send({ success: true });
  } catch {
    res.status(500).send({ message: "Failed to create request" });
  }
});

app.get("/partner-requests", async (req, res) => {
  try {
    const email = req.query.email;
    const requests = await partnerRequestsCollection.find({ requestedBy: email }).toArray();
    res.send(requests);
  } catch {
    res.status(500).send({ message: "Failed to load requests" });
  }
});

app.delete("/partner-requests/:id", async (req, res) => {
  try {
    await partnerRequestsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.send({ success: true });
  } catch {
    res.status(400).send({ message: "Invalid ID" });
  }
});

app.patch("/partner-requests/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { partnerName, subject, studyMode } = req.body;
    const updates = {};
    if (partnerName) updates.partnerName = partnerName;
    if (subject) updates.subject = subject;
    if (studyMode) updates.studyMode = studyMode;

    const result = await partnerRequestsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    if (result.matchedCount === 0)
      return res.status(404).send({ message: "Request not found" });

    res.send({ success: true, updatedFields: updates });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to update request" });
  }
});

// Server start
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
