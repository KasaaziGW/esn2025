const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const flashMessage = require("connect-flash");
const sessions = require("express-session");
const Citizen = require("./models/citizen");
const { Message } = require("./models/message");
const PrivateMessage = require("./models/privateMessage"); // new model you added
const bcrypt = require("bcryptjs");

const app = express();
const httpServer = require("http").createServer(app);
const socketIO = require("socket.io")(httpServer); // use socketIO consistently

const PORT = process.env.PORT || 3000;
var username; // used in some places (kept for backward compatibility)

// setting the view engine to ejs
app.set("view engine", "ejs");
// serving static files from the "public" directory
app.use(express.static("public"));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// setting up the sessions
app.use(
  sessions({
    secret: "ESN2025",
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 24 hours
    resave: false,
    saveUninitialized: false,
  })
);

app.use(flashMessage());
// setting up the flash messages middleware
app.use(function (req, res, next) {
  res.locals.message = req.flash();
  next();
});

// Handle favicon.ico requests
app.get("/favicon.ico", (req, res) =>
  res.sendFile(__dirname + "/public/images/logo.png")
);

// testing connection to MongoDB
const dbURL =
  "mongodb+srv://kasaazigw_db_user:ssc3XU7MAzo5RkVs@cluster0.mgqmfpv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongoose
  .connect(dbURL)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB...", err));

// Middleware to check if user is logged in
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    next();
  } else {
    res.redirect("/");
  }
}

// ----- Routes -----

app.get("/", (req, res) => {
  if (req.session && req.session.user) {
    res.redirect("/dashboard");
  } else {
    res.render("index", { title: "Login" });
  }
});

app.get("/dashboard", isAuthenticated, async (req, res) => {
  const https = require("https");
  const api_url = "https://zenquotes.io/api/random/";

  https.get(api_url, (apiRes) => {
    let data = "";

    apiRes.on("data", (chunk) => {
      data += chunk;
    });

    apiRes.on("end", () => {
      try {
        const quote = JSON.parse(data);
        res.render("dashboard", {
          title: "Dashboard",
          user: req.session.user,
          quote: quote,
        });
      } catch (err) {
        // Fallback quote if API fails
        res.render("dashboard", {
          title: "Dashboard",
          user: req.session.user,
          quote: [
            {
              q: "Preparation is the key to emergency response.",
              a: "ESN 2025",
            },
          ],
        });
      }
    });
  }).on("error", (err) => {
    // Fallback quote if request fails
    res.render("dashboard", {
      title: "Dashboard",
      user: req.session.user,
      quote: [
        {
          q: "Preparation is the key to emergency response.",
          a: "ESN 2025",
        },
      ],
    });
  });
});

app.get("/register", (req, res) => {
  res.render("register", { title: "Register" });
});

// register route
app.post("/registerUser", (req, res) => {
  const { email, fullname, password, cpassword } = req.body;
  if (password !== cpassword) {
    req.flash("error", "Passwords do not match!");
    res.redirect("/register");
    return;
  }
  // testing if the email already exists
  Citizen.findOne({ email: email })
    .then((citizen) => {
      if (citizen) {
        req.flash("error", `${email} already exists!`);
        res.redirect("/register");
      } else {
        // hashing the password
        bcrypt.hash(password, 10, (err, hash) => {
          if (err) {
            console.error(err);
            req.flash("error", "An error occurred. Please try again!");
            res.redirect("/register");
          } else {
            // create a model to save the data
            let user = new Citizen({
              email: email,
              fullname: fullname,
              password: hash,
              online: false,
              status: "OK",
            });
            // saving the data
            user.save();
            req.flash("success", "Registration successful!");
            res.redirect("/register");
          }
        });
      }
    })
    .catch((err) => console.error(err));
});

// login route
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  Citizen.findOne({ email: email }).then((citizen) => {
    if (citizen) {
      let hashedPassword = citizen.password;
      bcrypt.compare(password, hashedPassword, async (err, result) => {
        if (result) {
          // Set user online status to true
          await Citizen.updateOne({ email: email }, { $set: { online: true } });
          req.session.user = {
            fullname: citizen.fullname,
            email: citizen.email,
          };
          username = citizen.fullname;
          req.flash("success", `Welcome back, ${citizen.fullname}!`);
          res.redirect("/dashboard");
        } else {
          req.flash("error", "Invalid Username/Password combination!");
          res.redirect("/");
        }
      });
    } else {
      req.flash("error", "Citizen does not exist!");
      res.redirect("/");
    }
  });
});

// ESN Directory route
app.get("/directory", isAuthenticated, async (req, res) => {
  try {
    const users = await Citizen.find({});
    const usersWithStatus = users.map((u) => ({
      fullname: u.fullname,
      email: u.email,
      online: u.online || false,
      status: u.status || "OK",
    }));
    res.render("directory", {
      title: "ESN Directory",
      user: req.session.user,
      users: usersWithStatus,
    });
  } catch (err) {
    res.status(500).send("Error loading directory");
  }
});

// public chat view
app.get("/public_chat", isAuthenticated, (req, res) => {
  res.render("public_chat", { title: "Public Chat", user: req.session.user });
});

// Search route
app.get("/search", isAuthenticated, (req, res) => {
  res.render("search", { title: "Search", user: req.session.user });
});

// Search API endpoint
app.get("/api/search", isAuthenticated, async (req, res) => {
  const { context, term, page = 1 } = req.query;
  const limit = 10;
  const skip = (page - 1) * limit;
  let results = [];
  let hasMore = false;

  try {
    switch (context) {
      case "citizens":
        const citizenResults = await Citizen.find({
          fullname: { $regex: term, $options: "i" },
        })
          .sort({ online: -1, fullname: 1 })
          .select("fullname online status")
          .skip(skip)
          .limit(limit + 1);
        hasMore = citizenResults.length > limit;
        results = citizenResults.slice(0, limit);
        break;

      case "status":
        if (["OK", "Help", "Emergency"].includes(term.toUpperCase())) {
          const statusResults = await Citizen.find({
            status: term.toUpperCase(),
          })
            .sort({ online: -1, fullname: 1 })
            .select("fullname online status")
            .skip(skip)
            .limit(limit + 1);
          hasMore = statusResults.length > limit;
          results = statusResults.slice(0, limit);
        }
        break;

      case "public-messages":
        const messageResults = await Message.find({
          message: { $regex: term, $options: "i" },
        })
          .sort({ _id: -1 })
          .skip(skip)
          .limit(limit + 1);
        hasMore = messageResults.length > limit;
        results = messageResults.slice(0, limit);
        break;

      case "private-messages":
        results = [];
        hasMore = false;
        break;
    }

    res.json({ results, hasMore });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "An error occurred while searching" });
  }
});

// Logout route
app.get("/logout", (req, res) => {
  if (req.session && req.session.user) {
    Citizen.updateOne(
      { email: req.session.user.email },
      { $set: { online: false } }
    )
      .then(() => {
        req.session.destroy(() => {
          res.redirect("/");
        });
      })
      .catch(() => {
        req.session.destroy(() => {
          res.redirect("/");
        });
      });
  } else {
    req.session.destroy(() => {
      res.redirect("/");
    });
  }
});

// Public messages
app.post("/sendMessage", async (req, res) => {
  try {
    var message = new Message(req.body);
    await message.save();
    socketIO.emit("message", req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error("Error saving public message:", err);
    res.sendStatus(500);
  }
});

app.get("/fetchMessages", async (req, res) => {
  try {
    const messages = await Message.find({});
    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Error fetching messages" });
  }
});

// Get users endpoint
app.get("/getUsers", isAuthenticated, async (req, res) => {
  try {
    const users = await Citizen.find({}, "fullname email online status");
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Error fetching users" });
  }
});

// Private chat routes
app.get("/private-chat", isAuthenticated, (req, res) => {
  const { email, name } = req.query || {};
  const currentUser = req.session.user;
  res.render("private-chat", {
    title: "Private Chat",
    user: currentUser,
    currentUser: currentUser,
    receiverEmail: email || "",
    receiverName: name || "",
  });
});

app.get("/fetchPrivateMessages", isAuthenticated, async (req, res) => {
  try {
    const { sender, receiver } = req.query;
    const messages = await PrivateMessage.find({
      $or: [
        { sender: sender, receiver: receiver },
        { sender: receiver, receiver: sender },
      ],
    }).sort({ _id: 1 });
    res.json(messages);
  } catch (err) {
    console.error("Error fetching private messages:", err);
    res.status(500).json({ error: "Error fetching private messages" });
  }
});

app.post("/sendPrivateMessage", isAuthenticated, async (req, res) => {
  try {
    const { sender, receiver, message, sentTime } = req.body;
    const newMsg = new PrivateMessage({ sender, receiver, message, sentTime });
    await newMsg.save();
    const room = [sender, receiver].sort().join("_");
    socketIO.to(room).emit("privateMessage", { sender, receiver, message, sentTime });
    res.json({ success: true });
  } catch (err) {
    console.error("Error saving private message:", err);
    res.status(500).json({ error: "Error sending private message" });
  }
});

// ---------------------- Socket.IO handler --------------------
const onlineUsers = {};

socketIO.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("joined", (username) => {
    socketIO.emit("joined", username);
  });

  socket.on("message", (message) => {
    socketIO.emit("message", message);
  });

  socket.on("updateStatus", async (data) => {
    try {
      await Citizen.updateOne({ email: data.email }, { $set: { status: data.status } });
      const user = await Citizen.findOne({ email: data.email }, "fullname status");
      if (user) {
        socketIO.emit("statusUpdated", { fullname: user.fullname, status: user.status, email: data.email });
      } else {
        socketIO.emit("statusUpdated", { email: data.email, status: data.status });
      }
    } catch (err) {
      console.error("Error handling updateStatus:", err);
    }
  });

  socket.on("joinPrivateRoom", ({ sender, receiver }) => {
    const room = [sender, receiver].sort().join("_");
    socket.join(room);
    socket.emit("joinedRoom", room);
  });

  socket.on("privateMessage", async (message) => {
    try {
      const { sender, receiver, message: text, sentTime } = message;
      const saved = new PrivateMessage({ sender, receiver, message: text, sentTime });
      await saved.save();
      const payload = { sender: saved.sender, receiver: saved.receiver, message: saved.message, sentTime: saved.sentTime, _id: saved._id };
      const room = [sender, receiver].sort().join("_");
      socketIO.to(room).emit("privateMessage", payload);
    } catch (err) {
      console.error("privateMessage socket handler error:", err);
    }
  });
});

// start server
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please try these solutions:\n` +
      '1. Kill the process using the port:\n' +
      '   - Run: netstat -ano | findstr :3000\n' +
      '   - Then: taskkill /PID <PID> /F\n' +
      '2. Or change the PORT in index.js to a different number\n' +
      '3. Or wait a few seconds and try again, the port might free up');
  }
  process.exit(1);
});
