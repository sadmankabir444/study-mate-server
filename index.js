const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// ======== Middleware ========
app.use(cors());
app.use(express.json());

// ======== MongoDB URI ========
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.56d1e2x.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: false,
  },
});

let partnersCollection;
let partnerRequestsCollection;

// ======== Connect DB & Start Server ========
async function startServer() {
  try {
    // IMPORTANT: MUST CONNECT
    // await client.connect();
    console.log("✅ MongoDB Connected!");

    const db = client.db("studymate-db");
    partnersCollection = db.collection("partners");
    partnerRequestsCollection = db.collection("partnerRequests");

    // ======== Routes ========

    // Test route
    app.get("/", (req, res) => {
      res.send({ message: "✅ StudyMate API Running" });
    });

    // GET all partners
    app.get("/partners", async (req, res) => {
      try {
        const { subject, sort } = req.query;
        const query = {};

        if (subject) {
          query.subject = { $regex: subject, $options: "i" };
        }

        let cursor = partnersCollection.find(query);

        if (sort === "asc") cursor = cursor.sort({ experience: 1 });
        if (sort === "desc") cursor = cursor.sort({ experience: -1 });

        const result = await cursor.toArray();
        res.send(result);
      } catch (err) {
        console.error("❌ /partners error:", err);
        res.status(500).send({ message: "Failed to load partners" });
      }
    });

    // GET single partner
    app.get("/partners/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await partnersCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!result) {
          return res.status(404).send({ message: "Partner not found" });
        }

        res.send(result);
      } catch (err) {
        console.error("❌ single partner error:", err);
        res.status(400).send({ message: "Invalid ID" });
      }
    });

    // POST new partner
    app.post("/partners", async (req, res) => {
      try {
        const data = req.body;
        const result = await partnersCollection.insertOne(data);
        res.send({ success: true, insertedId: result.insertedId });
      } catch (err) {
        console.error("❌ insert partner error:", err);
        res.status(500).send({ message: "Failed to add partner" });
      }
    });

    // PATCH increase count
    app.patch("/partners/:id/increase-count", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await partnersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $inc: { partnerCount: 1 } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Partner not found" });
        }

        res.send({ success: true });
      } catch (err) {
        console.error("❌ increase-count error:", err);
        res.status(500).send({ message: "Failed to increase count" });
      }
    });

    // PATCH decrease count
    app.patch("/partners/:id/decrease-count", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await partnersCollection.updateOne(
          { _id: new ObjectId(id), partnerCount: { $gt: 0 } },
          { $inc: { partnerCount: -1 } }
        );

        if (result.matchedCount === 0) {
          return res
            .status(404)
            .send({ message: "Partner not found or count is already 0" });
        }

        res.send({ success: true });
      } catch (err) {
        console.error("❌ decrease-count error:", err);
        res.status(500).send({ message: "Failed to decrease count" });
      }
    });

    // POST request
    app.post("/partner-requests", async (req, res) => {
      try {
        const data = req.body;
        const result = await partnerRequestsCollection.insertOne({
          ...data,
          requestedAt: new Date(),
        });

        res.send({ success: true, insertedId: result.insertedId });
      } catch (err) {
        console.error("❌ create request error:", err);
        res.status(500).send({ message: "Failed to create request" });
      }
    });

    // GET requests by email
    app.get("/partner-requests", async (req, res) => {
      try {
        const email = req.query.email;

        if (!email) {
          return res.send([]);
        }

        const result = await partnerRequestsCollection
          .find({ requestedBy: email })
          .toArray();

        res.send(result);
      } catch (err) {
        console.error("❌ load requests error:", err);
        res.status(500).send({ message: "Failed to load requests" });
      }
    });

    // DELETE request
    app.delete("/partner-requests/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await partnerRequestsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Request not found" });
        }

        res.send({ success: true });
      } catch (err) {
        console.error("❌ delete request error:", err);
        res.status(400).send({ message: "Invalid ID" });
      }
    });

    // UPDATE request
    app.patch("/partner-requests/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { partnerName, subject, studyMode } = req.body;

        const updateData = {};
        if (partnerName) updateData.partnerName = partnerName;
        if (subject) updateData.subject = subject;
        if (studyMode) updateData.studyMode = studyMode;

        const result = await partnerRequestsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Request not found" });
        }

        res.send({ success: true, updated: updateData });
      } catch (err) {
        console.error("❌ update request error:", err);
        res.status(500).send({ message: "Failed to update request" });
      }
    });

    // 404 fallback
    app.use((req, res) => {
      res.status(404).send({ message: "Route not found" });
    });

    // Start Server
    app.listen(port, () => {
      console.log(`🚀 Server running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error("❌ Server start failed:", err);
  }
}

startServer();
