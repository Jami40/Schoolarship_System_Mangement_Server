const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port=process.env.PORT || 3000;


app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.knxzg.mongodb.net/?appName=Cluster0`;

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
    const database=client.db("schoolarshipDb")
    const schoolarshipCollection=database.collection("schoolarship")
    const usersCollection=database.collection("users")
    const applicationsCollection=database.collection("applications")
    const reviewsCollection=database.collection("reviews")
    
    // Admin email (hardcoded for verification)
    const ADMIN_EMAIL = "admin@scholarship.com";
    
    // ========== USER MANAGEMENT ENDPOINTS ==========
    
    // Create new user
    app.post('/users', async (req, res) => {
      try {
        const user = req.body;
        const query = { email: user.email };
        const existingUser = await usersCollection.findOne(query);
        
        if (existingUser) {
          return res.send({ message: 'User already exists', insertedId: null });
        }
        
        // Set default role as 'user'
        user.role = 'user';
        user.createdAt = new Date();
        
        const result = await usersCollection.insertOne(user);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error creating user', error });
      }
    });
    
    // Get user by email
    app.get('/users/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        res.send(user);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching user', error });
      }
    });
    
    // Get all users (for admin)
    app.get('/users', async (req, res) => {
      try {
        const users = await usersCollection.find().toArray();
        res.send(users);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching users', error });
      }
    });
    
    // Check if user is admin
    app.get('/users/admin/:email', async (req, res) => {
      try {
        const email = req.params.email;
        
        // Check if email matches admin email
        if (email === ADMIN_EMAIL) {
          return res.send({ admin: true });
        }
        
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        const isAdmin = user?.role === 'admin';
        res.send({ admin: isAdmin });
      } catch (error) {
        res.status(500).send({ message: 'Error checking admin status', error });
      }
    });
    
    // Check if user is moderator
    app.get('/users/moderator/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        const isModerator = user?.role === 'moderator';
        res.send({ moderator: isModerator });
      } catch (error) {
        res.status(500).send({ message: 'Error checking moderator status', error });
      }
    });
    
    // Request to become moderator
    app.patch('/users/request-moderator/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const updateDoc = {
          $set: {
            moderatorRequest: true,
            requestDate: new Date()
          }
        };
        const result = await usersCollection.updateOne(query, updateDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error requesting moderator role', error });
      }
    });
    
    // Approve moderator request (admin only)
    app.patch('/users/approve-moderator/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const updateDoc = {
          $set: {
            role: 'moderator',
            moderatorRequest: false,
            approvedDate: new Date()
          }
        };
        const result = await usersCollection.updateOne(query, updateDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error approving moderator', error });
      }
    });
    
    // Get all moderator requests (for admin)
    app.get('/users/moderator-requests', async (req, res) => {
      try {
        const requests = await usersCollection
          .find({ moderatorRequest: true })
          .toArray();
        res.send(requests);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching moderator requests', error });
      }
    });
    
    // Update user role (admin only)
    app.patch('/users/role/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const { role } = req.body;
        const query = { email: email };
        const updateDoc = {
          $set: { role: role }
        };
        const result = await usersCollection.updateOne(query, updateDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error updating user role', error });
      }
    });
    
    // ========== SCHOLARSHIP ENDPOINTS ==========
    
    // Get all scholarships
    app.get('/scholarships', async (req, res) => {
      try {
        const scholarships = await schoolarshipCollection.find().toArray();
        res.send(scholarships);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching scholarships', error });
      }
    });

    // Get top 6 scholarships (sorted by application deadline or amount)
    app.get('/scholarships/top', async (req, res) => {
      try {
        const scholarships = await schoolarshipCollection.find().limit(6).toArray();
        res.send(scholarships);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching top scholarships', error });
      }
    });

    // Get scholarship by ID
    app.get('/scholarships/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const scholarship = await schoolarshipCollection.findOne(query);
        res.send(scholarship);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching scholarship', error });
      }
    });
    
    // ========== APPLICATION ENDPOINTS ==========
    
    // Create new application
    app.post('/applications', async (req, res) => {
      try {
        const application = req.body;
        application.status = 'pending'; // Default status
        application.createdAt = new Date();
        application.application_feedback = '';
        
        const result = await applicationsCollection.insertOne(application);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error creating application', error });
      }
    });
    
    // Get applications by user email
    app.get('/applications/user/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const query = { user_email: email };
        const applications = await applicationsCollection.find(query).toArray();
        res.send(applications);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching applications', error });
      }
    });
    
    // Get all applications (for moderator/admin)
    app.get('/applications', async (req, res) => {
      try {
        const applications = await applicationsCollection.find().toArray();
        res.send(applications);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching applications', error });
      }
    });
    
    // Update application
    app.patch('/applications/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const updateData = req.body;
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: updateData
        };
        const result = await applicationsCollection.updateOne(query, updateDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error updating application', error });
      }
    });
    
    // Delete/Cancel application
    app.delete('/applications/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await applicationsCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error deleting application', error });
      }
    });
    
    // ========== REVIEW ENDPOINTS ==========
    
    // Create new review
    app.post('/reviews', async (req, res) => {
      try {
        const review = req.body;
        review.createdAt = new Date();
        
        const result = await reviewsCollection.insertOne(review);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error creating review', error });
      }
    });
    
    // Get reviews by user email
    app.get('/reviews/user/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const query = { user_email: email };
        const reviews = await reviewsCollection.find(query).toArray();
        res.send(reviews);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching reviews', error });
      }
    });
    
    // Get reviews by scholarship ID
    app.get('/reviews/scholarship/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { scholarship_id: id };
        const reviews = await reviewsCollection.find(query).toArray();
        res.send(reviews);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching reviews', error });
      }
    });
    
    // Get all reviews
    app.get('/reviews', async (req, res) => {
      try {
        const reviews = await reviewsCollection.find().toArray();
        res.send(reviews);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching reviews', error });
      }
    });
    
    // Update review
    app.patch('/reviews/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const updateData = req.body;
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: updateData
        };
        const result = await reviewsCollection.updateOne(query, updateDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error updating review', error });
      }
    });
    
    // Delete review
    app.delete('/reviews/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await reviewsCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error deleting review', error });
      }
    });
    
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
  res.send('Scholarship management server is running');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});