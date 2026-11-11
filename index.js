import exporess from "express";
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';
import cors from "cors";
import { createRemoteJWKSet, jwtVerify } from "jose";


const app = exporess();
const PORT = 8000;

app.use(cors())
app.use(exporess.json())

const client = new MongoClient(process.env.MONGO_DB_URL);

export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("You successfully connected to MongoDB!");
        return client;
    } catch (err) {
        console.dir(err);
    }
}

const mongoDBClient = await connectToMongoDB();
const db = mongoDBClient.db('studiospace');
const studioCollection = db.collection("studios");
const bookingCollection = db.collection("booking");

const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_SERVER_URL}/api/auth/jwks`));

const vefiryToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).send({ message: "Unathorize!" })
    }

    const token = authHeader.split(" ")[1];

    if (!token || token === "undefined") {
        return res.status(401).send({ message: "Unauthorize!" })
    }

    try {
        const { payload } = await jwtVerify(token, JWKS);
        next();
    } catch (error) {
        console.error("Token verification failed:", error?.message);
        return res.status(401).send({ message: "Unauthorize!" })
    }
}

app.get("/", (req, res) => {
    res.send("Hello world in back end")
})

app.get("/studios", async (req, res) => {
    const result = await studioCollection.find().toArray();
    res.send(result);
})

app.post("/studios", vefiryToken, async (req, res) => {
    const newStudio = req.body;
    const result = await studioCollection.insertOne(newStudio);
    res.send(result);
})

app.delete("/studios/:id", vefiryToken, async (req, res) => {
    const { id } = req.params;
    const result = await studioCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
})

app.get("/studios/:id", async (req, res) => {
    const { id } = req.params;
    const result = await studioCollection.findOne({ _id: new ObjectId(id) });
    res.send(result);
})

app.patch("/studios/:id", vefiryToken, async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const result = await studioCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
    )
    res.send(result);
})

app.get("/studios/category/:category", vefiryToken, async (req, res) => {
    const { category } = req.params;
    const result = await studioCollection.find({ category: category }).toArray();
    res.send(result);
})

app.get("/studios/owner/:ownerEmail", vefiryToken, async (req, res) => {
    const { ownerEmail } = req.params;
    const result = await studioCollection.find({ ownerEmail: ownerEmail }).toArray();
    res.send(result);
})

app.post("/booking", vefiryToken, async (req, res) => {
    // Never trust a client-supplied _id — let MongoDB generate the booking's own id.
    const { _id, createdAt, updatedAt, ...newBooking } = req.body;
    const result = await bookingCollection.insertOne({
        ...newBooking,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
    res.send(result);
})

app.get("/booking/:userEmail", vefiryToken, async (req, res) => {
    const { userEmail } = req.params;
    const result = await bookingCollection.find({ userEmail: userEmail }).toArray();
    res.send(result);
})

app.delete("/booking/:id", vefiryToken, async (req, res) => {
    const { id } = req.params;
    // Older bookings stored their _id as a plain string (copied from the
    // client payload), newer ones use a real ObjectId — match both.
    const candidates = [{ _id: id }];
    if (ObjectId.isValid(id)) candidates.push({ _id: new ObjectId(id) });
    const result = await bookingCollection.deleteOne({ $or: candidates });
    res.send(result);
})

app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(err?.status || err?.statusCode || 500).json({
        message: err?.message || "Internal Server Error"
    });
});

app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}`)
})

export default app;