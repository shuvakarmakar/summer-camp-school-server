const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: "Unauthorized Access" })
    }
    // bearer token
    const token = authorization.split(' ')[1];
    console.log('Token Veriffy', token);

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gu0z5kw.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const userCollection = client.db("schoolDB").collection("users");
        const instructorCollection = client.db("schoolDB").collection("instructors");
        const classCollection = client.db("schoolDB").collection("classes");
        const selectClassCollection = client.db("schoolDB").collection("selectClass");

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

            res.send({ token })
        })


        // user related api
        app.get("/users", verifyJWT, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.post("/users", async (req, res) => {
            const user = req.body;
            console.log(user);
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            console.log('Existing User', existingUser);
            if (existingUser) {
                return res.send({ message: "User Already Existed" })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        // Admin Verify
        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }

            const query = { email: email }
            const user = await userCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);
        })

        // Instructor Verify
        app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            // if (req.decoded.email !== email) {
            //     res.send({ instructor: false })
            // }

            const query = { email: email }
            const user = await userCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' }
            res.send(result);
        })

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: "admin"
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: "instructor"
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // instructor
        app.get('/instructors', async (req, res) => {
            const result = await instructorCollection.find().toArray();
            res.send(result);
        })


        // classes
        app.post('/classes', async (req, res) => {
            const classItem = req.body;
            const result = await classCollection.insertOne(classItem);
            res.send(result);
        })

        app.get('/classes', async (req, res) => {
            const result = await classCollection.find().toArray();
            res.send(result);
        })
        
        // used to see each instructor added classes
        app.get("/instructor-classes", async (req, res) => {
            const instructorEmail = req.query.instructorEmail;
            if (!instructorEmail) {
                res.send([]);
                return;
            }

            try {
                const query = { instructorEmail: instructorEmail };
                const result = await classCollection.find(query).toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching instructor classes:", error);
                res.status(500).send("Internal Server Error");
            }
        });





        // Select Classes
        app.post('/selectclass', async (req, res) => {
            const selectclass = req.body;
            console.log(selectclass);
            const result = await selectClassCollection.insertOne(selectclass);
            res.send(result);
        })

        app.get("/selectclass", verifyJWT, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([])
            }

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'Forbidden Access' })
            }

            const query = { email: email }
            const result = await selectClassCollection.find(query).toArray();
            res.send(result);
        })

        app.delete('/selectclass/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await selectClassCollection.deleteOne(query);
            res.send(result);
        })




        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('School is Open')
})

app.listen(port, () => {
    console.log(`Camp School is Sitting on port ${port}`);
})
