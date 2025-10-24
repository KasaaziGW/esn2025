const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const flashMessage = require("connect-flash");
const sessions = require("express-session");

const Citizen = require("./models/citizen");
const { Message } = require("./models/message");
const PrivateMessage = require("./models/privateMessage");

const app = express();
const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer);

const PORT = process.env.PORT || 3000;

// --- View engine & static files ---
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- Sessions ---
app.use(
  sessions({
    secret: "ESN2025",
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
    resave: false,
    saveUninitialized: false,
  })
);
app.use(flashMessage());

// --- Helper functions ---
const getStatusBadge = function (status) {
  switch (status) {
    case "OK":
      return '<span class="badge bg-success text-white"><i class="fa-regular fa-check-circle"></i> OK</span>';
    case "Help":
      return '<span class="badge bg-warning text-white"><i class="fas fa-warning"></i> Help</span>';
    case "Emergency":
      return '<span class="badge bg-danger text-white"><i class="fas fa-ambulance"></i> Emergency</span>';
    default:
      return '<span class="badge bg-secondary">Undefined</span>';
  }
};

// Flash messages middleware
app.use((req, res, next) => {
  res.locals.message = req.flash();
  next();
});

// Favicon
app.get("/favicon.ico", (req, res) =>
  res.sendFile(__dirname + "/public/images/logo.png")
);

// --- MongoDB connection ---
const dbURL =
  "mongodb+srv://kasaazigw_db_user:ssc3XU7MAzo5RkVs@cluster0.mgqmfpv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongoose
  .connect(dbURL)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB...", err));

// --- Auth middleware ---
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) next();
  else res.redirect("/");
}

// --- Routes ---

// Home / login page
app.get("/", (req, res) => {
  if (req.session && req.session.user) res.redirect("/dashboard");
  else res.render("index", { title: "Login" });
});

// Dashboard with quote
app.get("/dashboard", isAuthenticated, async (req, res) => {
  const https = require("https");
  const api_url = "https://zenquotes.io/api/random/";

  https
    .get(api_url, (apiRes) => {
      let data = "";
      apiRes.on("data", (chunk) => (data += chunk));
      apiRes.on("end", () => {
        try {
          const quote = JSON.parse(data);
          res.render("dashboard", {
            title: "Dashboard",
            user: req.session.user,
            quote,
          });
        } catch (err) {
          res.render("dashboard", {
            title: "Dashboard",
            user: req.session.user,
            quote: [
              { q: "Preparation is the key to emergency response.", a: "ESN 2025" },
            ],
          });
        }
      });
    })
    .on("error", () => {
      res.render("dashboard", {
        title: "Dashboard",
        user: req.session.user,
        quote: [
          { q: "Preparation is the key to emergency response.", a: "ESN 2025" },
        ],
      });
    });
});

// Register
app.get("/register", (req, res) => res.render("register", { title: "Register" }));

app.post("/registerUser", (req, res) => {
  const { email, fullname, password, cpassword } = req.body;
  if (password !== cpassword) {
    req.flash("error", "Passwords do not match!");
    return res.redirect("/register");
  }
  Citizen.findOne({ email })
    .then((citizen) => {
      if (citizen) {
        req.flash("error", `${email} already exists!`);
        return res.redirect("/register");
      }
      bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
          req.flash("error", "An error occurred. Please try again!");
          return res.redirect("/register");
        }
        const user = new Citizen({
          email,
          fullname,
          password: hash,
          online: false,
          status: "OK",
        });
        user.save();
        req.flash("success", "Registration successful!");
        res.redirect("/register");
      });
    })
    .catch(console.error);
});

// Login
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  Citizen.findOne({ email }).then(async (citizen) => {
    if (citizen) {
      const result = await bcrypt.compare(password, citizen.password);
      if (result) {
        await Citizen.updateOne({ email }, { $set: { online: true } });
        req.session.user = {
          fullname: citizen.fullname,
          email: citizen.email,
          status: citizen.status,
        };
        req.flash("success", `Welcome back, ${citizen.fullname}!`);
        res.redirect("/dashboard");
      } else {
        req.flash("error", "Invalid Username/Password combination!");
        res.redirect("/");
      }
    } else {
      req.flash("error", "Citizen does not exist!");
      res.redirect("/");
    }
  });
});

// Logout
app.get("/logout", async (req, res) => {
  if (req.session && req.session.user) {
    await Citizen.updateOne(
      { email: req.session.user.email },
      { $set: { online: false } }
    );
  }
  req.session.destroy(() => res.redirect("/"));
});

// Directory
app.get("/directory", isAuthenticated, async (req, res) => {
  try {
    const users = await Citizen.find({});
    res.render("directory", {
      title: "ESN Directory",
      user: req.session.user,
      getStatusBadge,
      users: users.map((u) => ({
        fullname: u.fullname,
        email: u.email,
        online: u.online || false,
        status: { current_state: u.status || "OK" }, // wrap in object
        statusUpdatedAt: u.statusUpdatedAt || new Date(),
      })),
    });
  } catch {
    res.status(500).send("Error loading directory");
  }
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
    switch(context) {
      case 'citizens':
        // Search citizens by username (fullname)
        const citizenResults = await Citizen.find({
          fullname: { $regex: term, $options: 'i' }
        })
        .sort({ online: -1, fullname: 1 }) // Online first, then alphabetical
        .select('fullname online status')
        .skip(skip)
        .limit(limit + 1); // Get one extra to check if there are more

        hasMore = citizenResults.length > limit;
        results = citizenResults.slice(0, limit);
        break;

      case 'status':
        // Search citizens by status
        if (['OK', 'Help', 'Emergency'].includes(term.toUpperCase())) {
          const statusResults = await Citizen.find({
            status:{current_state: term.toUpperCase()}
          })
          .sort({ online: -1, fullname: 1 })
          .select('fullname online status')
          .skip(skip)
          .limit(limit + 1);

          hasMore = statusResults.length > limit;
          results = statusResults.slice(0, limit);
        }
        break;

      case 'public-messages':
        // Search public messages
        const messageResults = await Message.find({
          message: { $regex: term, $options: 'i' }
        })
        .sort({ _id: -1 }) // Latest first
        .skip(skip)
        .limit(limit + 1);

        hasMore = messageResults.length > limit;
        results = messageResults.slice(0, limit);
        break;

      case 'private-messages':
        // For private messages (placeholder for future implementation)
        // This would need a PrivateMessage model and proper filtering
        results = [];
        hasMore = false;
        break;
    }

    res.json({ results, hasMore });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'An error occurred while searching' });
  }
});


// Public chat
app.get("/public_chat", isAuthenticated, (req, res) => {
  res.render("public_chat", {
    title: "Public Chat",
    user: req.session.user,
    getStatusBadge,
  });
});

// Private chat
app.get("/private-chat", isAuthenticated, async (req, res) => {
  const { email, name } = req.query || {};
  const currentUser = req.session.user;
  res.render("private-chat", {
    title: "Private Chat",
    user: currentUser,
    currentUser,
    receiverEmail: email || "",
    receiverName: name || "",
  });
});

// Fetch private messages
app.get("/fetchPrivateMessages", isAuthenticated, async (req, res) => {
  try {
    const { sender, receiver } = req.query;
    const messages = await PrivateMessage.find({
      $or: [
        { sender, receiver },
        { sender: receiver, receiver: sender },
      ],
    }).sort({ _id: 1 });
    res.json(messages);
  } catch (err) {
    console.error("Error fetching private messages:", err);
    res.status(500).json({ error: "Error fetching private messages" });
  }
});

// Send private message
app.post("/sendPrivateMessage", isAuthenticated, async (req, res) => {
  try {
    const { sender, receiver, message, sentTime } = req.body;
    const newMsg = new PrivateMessage({ sender, receiver, message, sentTime });
    await newMsg.save();

    const room = [sender, receiver].sort().join("_");
    io.to(room).emit("privateMessage", { sender, receiver, message, sentTime });
    res.json({ success: true });
  } catch (err) {
    console.error("Error sending private message:", err);
    res.status(500).json({ error: "Error sending private message" });
  }
});

app.get("/share-status", isAuthenticated, (req, res) => {
  res.render("share_status", { title: "Share Status", user: req.session.user });
});

// Fetch all public messages
app.get("/fetchMessages", isAuthenticated, async (req, res) => {
  try {
    const messages = await Message.find({}).sort({ _id: 1 }); // oldest first
    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});


// Update status
app.post("/updateStatus", isAuthenticated, async (req, res) => {
  try {
    const { status } = req.body;
    const email = req.session.user.email;

    if (!["OK", "Help", "Emergency"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    await Citizen.updateOne({ email }, { 
      $set: { 
        status, 
        statusUpdatedAt: new Date() 
      } 
    });
    req.session.user.status = status;

    io.emit("statusUpdated", { email, status, statusUpdatedAt: new Date() }); // Broadcast to all sockets
    res.sendStatus(200);
  } catch (err) {
    console.error("Error updating status:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// Get users (for private chat or directory)
app.get("/getUsers", isAuthenticated, async (req, res) => {
  try {
    const users = await Citizen.find({}, "fullname email online status");
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Error fetching users" });
  }
});

app.post("/sendMessage", isAuthenticated, async (req, res) => {
  try {
    const { sender, message, sentTime } = req.body;
    if (!sender || !message) return res.status(400).json({ error: "Missing fields" });

    // Fetch current status from DB
    const citizen = await Citizen.findOne({ fullname: sender });
    const sender_status = citizen ? citizen.status : "OK";

    const newMessage = new Message({ sender, message, sentTime, sender_status });
    await newMessage.save();

    // Emit via Socket.IO
    io.emit("message", newMessage);

    res.json({ success: true, message: newMessage });
  } catch (err) {
    console.error("Error sending public message:", err);
    res.status(500).json({ error: "Failed to save message" });
  }
});



// --- Socket.IO ---
const onlineUsers = {}; // socket.id -> { fullname, email, status }

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // User joins private chat room
  socket.on("joinPrivate", ({ room }) => {
    socket.join(room);
  });

  // Track online users
  socket.on("joined", (user) => {
    onlineUsers[socket.id] = { ...user };
    io.emit("updateUsers", Object.values(onlineUsers));
  });

  socket.on("disconnect", () => {
    delete onlineUsers[socket.id];
    io.emit("updateUsers", Object.values(onlineUsers));
  });

  // Public chat
socket.on("sendPublicMessage", async (msg) => {
  try {
    const { sender, message, sentTime } = msg;
    const citizen = await Citizen.findOne({ fullname: sender });
    const sender_status = citizen ? citizen.status : "OK";

    const newMessage = await Message.create({ sender, message, sentTime, sender_status });
    io.emit("message", newMessage);
  } catch (err) {
    console.error("Error sending public message via socket:", err);
  }
});


  // Listen for status updates from clients
    socket.on("updateStatus", async ({ email, status }) => {
        try {
            await Citizen.updateOne({ email }, { status });
            // Broadcast to all clients
            io.emit("statusUpdated", { email, status });
        } catch (err) {
            console.error("Failed to update status:", err);
        }
    });


 socket.on("sendPrivateMessage", async (msg) => {
  try {
    const { sender, receiver, message, sentTime } = msg;
    const room = [sender, receiver].sort().join("_");

    // Fetch fresh status
    const citizen = await Citizen.findOne({ email: sender }).lean();
    const sender_status = citizen?.status || "OK";

    // Save message with correct field name
    const newMsg = await PrivateMessage.create({
      sender,
      receiver,
      message,
      sentTime,
      sender_status,
    });

    // Emit consistent format expected by frontend
    io.to(room).emit("privateMessage", {
      sender,
      receiver,
      message,
      sentTime,
      status: sender_status, // <-- this makes appendMessage(msg.status) work
    });
  } catch (err) {
    console.error("Error sending private message:", err);
  }
});
});

// --- Start server ---
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
