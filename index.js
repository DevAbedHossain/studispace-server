import exporess from "express";
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';
import cors from "cors";


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

app.get("/", (req, res) => {
    res.send("Hello world in back end")
})

app.get("/studios", async (req, res) => {
    const result = await studioCollection.find().toArray();
    res.send(result);
})

app.post("/studios", async (req, res) => {
    const newStudio = req.body;
    const result = await studioCollection.insertOne(newStudio);
    res.send(result);
})

app.get("/studios/:id", async (req, res) => {
    const { id } = req.params;
    const result = await studioCollection.findOne({ _id: new ObjectId(id) });
    res.send(result);
})

app.patch("/studios/:id", async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const result = await studioCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
    )
    res.send(result);
})

app.get("/studios/category/:category", async (req, res) => {
    const { category } = req.params;
    const result = await studioCollection.find({ category: category }).toArray();
    res.send(result);
})

app.get("/studios/owner/:ownerEmail", async (req, res) => {
    const { ownerEmail } = req.params;
    const result = await studioCollection.find({ ownerEmail: ownerEmail }).toArray();
    res.send(result);
})

app.listen(PORT, () => {
    console.log(`Example app listening on port ${PORT}`)
})

export default app;