const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

//  middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bkpsd7x.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const recipeCollection = client.db("recipeSharingDB").collection("recipes");
    const moreRecipeCollection = client
      .db("recipeSharingDB")
      .collection("moreRecipes");
    const userCollection = client.db("recipeSharingDB").collection("users");

    // recipes api
    app.post("/recipes", async (req, res) => {
      const recipe = req.body;
      const result = await recipeCollection.insertOne(recipe);
      res.send(result);
    });

    app.get("/recipes", async (req, res) => {
      const result = await recipeCollection.find().toArray();
      res.send(result);
    });

    app.get("/recipes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await recipeCollection.findOne(query);
      res.send(result);
    });

    // more recipe
    app.get("/moreRecipes", async (req, res) => {
      const result = await moreRecipeCollection.find().toArray();
      res.send(result);
    });

    // user api
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = {
        email: user.email,
        name: user.name,
        photo: user.photo,
        coin: user.coin,
      };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users/:name", async (req, res) => {
      const { name } = req.params;
      // console.log(`Fetching user with name: ${name}`);
      try {
        const user = await userCollection.findOne({ name: name });
        if (user) {
          res.json(user);
        } else {
          res.status(404).json({ error: "User not found" });
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    app.patch("/users", async (req, res) => {
      const { email, name, coin } = req.body; 
      // console.log(coin);
    
      try {
        const user = await userCollection.findOneAndUpdate(
          { email },
          { $set: { name, coin } }, // Update name and set coin to coins
          { new: true }
        );
        res.status(200).json(user);
      } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: "Failed to update user" });
      }
    });

    // payment intent related api
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      // console.log("intent amount", amount);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
 

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("recipe is running");
});

app.listen(port, () => {
  console.log(`recipe is running on ${port}`);
});
