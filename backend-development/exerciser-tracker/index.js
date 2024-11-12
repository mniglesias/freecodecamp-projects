const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mongoose.connect(
  "mongodb+srv://magli:magli1234@cluster0.chucq.mongodb.net/Cluster0?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
});

const User = mongoose.model("User", userSchema);

const exerciseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  duration: {
    type: Number,
    required: true,
    min: 1,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const Exercise = mongoose.model("Exercise", exerciseSchema);

app.post("/api/users", async (req, res) => {
  try {
    const newUser = await User.create({ username: req.body.username });
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (err) {
    res.status(500).json({ error: "Error creating user" });
  }
});

app.get("/api/users", async (req, res) => {
  const users = await User.find({}, "_id username");
  res.json(users);
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const { description, duration, date } = req.body;
  const userId = req.params._id;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const exercise = await Exercise.create({
      userId,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date(),
    });

    res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
      _id: user._id,
    });
  } catch (err) {
    res.status(500).json({ error: "Error adding exercise" });
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const userId = req.params._id;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    let filters = { userId };
    if (from || to) {
      filters.date = {};
      if (from) filters.date.$gte = new Date(from);
      if (to) filters.date.$lte = new Date(to);
    }

    let exercises = await Exercise.find(filters)
      .limit(parseInt(limit))
      .select("description duration date");

    exercises = exercises.map((ex) => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString(),
    }));

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises,
    });
  } catch (err) {
    res.status(500).json({ error: "Error retrieving exercise log" });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
