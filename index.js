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
var username;

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


const  getStatusBadge = function(status) {
  switch(status) {
    case 'OK':
      return '<span class="badge bg-success text-white"><i class="fa-regular fa-check-circle"></i> OK</span>';
    case 'Help':
      return '<span class="badge bg-warning text-white"><i class="fas fa-warning"></i> Help</span>';
    case 'Emergency':
      return '<span class="badge bg-danger text-white"><i class="fas fa-ambulance"></i> Emergency</span>';
    default:
      return '<span class="badge bg-secondary"> Undefined</span>';
  } 

}

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

// Auth middleware
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) next();
  else res.redirect("/");
}

// --- Routes ---
app.get("/", (req, res) => {
  if (req.session && req.session.user) res.redirect("/dashboard");
  else res.render("index", { title: "Login" });
});

app.get("/dashboard", isAuthenticated, async (req, res) => {
  const https = require("https");
  const api_url = "https://zenquotes.io/api/random/";

  https.get(api_url, (apiRes) => {
    let data = "";
    apiRes.on("data", (chunk) => (data += chunk));
    apiRes.on("end", () => {
      try {
        const quote = JSON.parse(data);
        res.render("dashboard", { title: "Dashboard", user: req.session.user, quote });
      } catch (err) {
        res.render("dashboard", {
          title: "Dashboard",
          user: req.session.user,
          quote: [{ q: "Preparation is the key to emergency response.", a: "ESN 2025" }],
        });
      }
    });
  }).on("error", () => {
    res.render("dashboard", {
      title: "Dashboard",
      user: req.session.user,
      quote: [{ q: "Preparation is the key to emergency response.", a: "ESN 2025" }],
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
        const user = new Citizen({ email, fullname, password: hash, online: false});
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
            status: citizen.status
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

// Directory
app.get("/directory", isAuthenticated, async (req, res) => {
  try {
    const users = await Citizen.find({});
    // Use real online status from DB
    const usersWithStatus = users.map((u) => ({
      fullname: u.fullname,
      email: u.email,
      online: u.online || false,
      status: u.status || {current_state:"Undefined",timestamp:null},
    }));
    res.render("directory", {
      title: "ESN Directory",
      user: req.session.user,
      users: usersWithStatus,
      getStatusBadge,
      users: users.map((u) => ({ fullname: u.fullname, email: u.email, online: u.online || false, status: u.status || "OK" })),
    });
  } catch {
    res.status(500).send("Error loading directory");
  }
});

// Public chat view
app.get("/public_chat", isAuthenticated, (req, res) => {
  res.render("public_chat", { title: "Public Chat", user: req.session.user,getStatusBadge });
});

// Logout
app.get("/logout", async (req, res) => {
  if (req.session && req.session.user) {
    await Citizen.updateOne({ email: req.session.user.email }, { $set: { online: false } });
  }
  req.session.destroy(() => res.redirect("/"));
});

// Public message routes
app.post("/sendMessage", async (req, res) => {
  try {
    const { sender, message, sentTime } = req.body;
     console.log("Received Bod:", req.body);
    console.log("Received Session:", req.session.user);
    if (!sender || !message || !req.session.user) return res.status(400).json({ error: "Missing fields or Invalid session" });

    const newMessage = await Message.create({ sender, message, sentTime,sender_status:req.session.user.status });
    io.emit("message", newMessage);
    res.json({ success: true, message: newMessage });
  } catch (err) {
    console.error("Error saving public message:", err);
    res.status(500).json({ error: "Failed to save message" });
  }
});


// fetching messages from the database
app.get("/fetchMessages", async (req, res) => {
  try {
    const messages = await Message.find({}).sort({ _id: 1 });
    res.json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Users list
app.get("/getUsers", isAuthenticated, async (req, res) => {
  try {
    const users = await Citizen.find({}, "fullname email online status");
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Error fetching users" });
  }
});

// Private chat
app.get("/private-chat", isAuthenticated, (req, res) => {
  const { email, name } = req.query || {};
  const currentUser = req.session.user;
  res.render("private-chat", {
    title: "Private Chat",
    user: currentUser,
    currentUser,
    receiverEmail: email || "",
    receiverName: name || ""
  });
});

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

app.post("/sendPrivateMessage", isAuthenticated, async (req, res) => {
  try {
    const { sender, receiver, message, sentTime } = req.body;
    const newMsg = new PrivateMessage({ sender, receiver, message, sentTime,sender_status:req.session.user.status });
    await newMsg.save();

    const room = [sender, receiver].sort().join("_");
    io.to(room).emit("privateMessage", { sender, receiver, message, sentTime,sender_status:req.session.user.status });
    res.json({ success: true });
  } catch (err) {
    console.error("Error saving private message:", err);
    res.status(500).json({ error: "Error sending private message" });
  }
});

// --- Socket.IO ---
const onlineUsers = {};

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // Track joined users
  socket.on("joined", (fullname) => {
    onlineUsers[socket.id] = fullname;
    io.emit("updateUsers", Object.values(onlineUsers));
  });

  socket.on("disconnect", async () => {
    delete onlineUsers[socket.id];
    io.emit("updateUsers", Object.values(onlineUsers));
  });

  // Public chat
  socket.on("sendPublicMessage", async (msg) => {
    try {
      const { sender, message, sentTime,sender_status } = msg;
      const newMessage = await Message.create({ sender, message, sentTime,sender_status });
      console.log("New public message:", newMessage);
      io.emit("message", newMessage);
    } catch (err) {
      console.error("Error sending public message via socket:", err);
    }
  });

  // Private chat
  socket.on("sendPrivateMessage", async (msg) => {
    try {
      const { sender, receiver, message, sentTime,sender_status } = msg;
      const newMsg = await PrivateMessage.create({ sender, receiver, message, sentTime,sender_status });
      const room = [sender, receiver].sort().join("_");
      io.to(room).emit("privateMessage", { sender, receiver, message, sentTime });
    } catch (err) {
      console.error("Error sending private message via socket:", err);
    }
  });
});

app.get("/share-status", isAuthenticated, (req, res) => {
  res.render("share_status", { title: "Share Status", user: req.session.user });
});


app.post("/setStatus", async (req, res) => {
  console.log("session user:", req.session.user);
  const { email } = req.session.user;
  const { status } = req.body;

  const new_status = { current_state: status, timestamp: new Date() };

   await Citizen.updateOne({ email: email }, { $set: { status:new_status }});
     
  req.session.user.status=new_status;

  res.sendStatus(200);
  
});

// Start server
httpServer.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} in use. Kill process or change port.`);
    }
    process.exit(1);
  });

