const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const flashMessage = require("connect-flash");
const sessions = require("express-session");

const Citizen = require("./models/citizen");
const { Message } = require("./models/message");

const app = express();
const httpServer = require("http").createServer(app);
const socketIO = require("socket.io")(httpServer);

const PORT = process.env.PORT || 3000;
var username;

// setting the view engine to ejs
app.set("view engine", "ejs");
// serving static files from the "public" directory
app.use(express.static("public"));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());

// setting up the sessions
app.use(
  sessions({
    secret: "ESN2025",
    cookie: { maxAge: 60000 },
    resave: false,
    saveUninitialized: false,
  })
);

app.use(flashMessage());


const  getStatusBadge = function(status) {
  switch(status) {
    case 'ok':
      return '<span class="badge bg-success text-white"><i class="fa-regular fa-check-circle"></i> OK</span>';
    case 'help':
      return '<span class="badge bg-warning text-white"><i class="fas fa-warning"></i> Help</span>';
    case 'emergency':
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

// Middleware to check if user is logged in
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    next();
  } else {
    res.redirect("/");
  }
}

app.get("/", (req, res) => {
  if (req.session && req.session.user) {
    res.redirect("/dashboard");
  } else {
    res.render("index", { title: "Login" });
  }
});

app.get("/dashboard", isAuthenticated, async (req, res) => {
  const api_url = "https://zenquotes.io/api/random/";
  const response = await fetch(api_url);
  var data = await response.json();
  // console.log(`${data[0]["q"]} - ${data[0]["a"]} - ${data[0]["h"]}`);
  res.render("dashboard", {
    title: "Dashboard",
    user: req.session.user,
    quote: data,
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
  } else {
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
  }
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
    // Use real online status from DB
    const usersWithStatus = users.map((u) => ({
      fullname: u.fullname,
      email: u.email,
      online: u.online || false,
      status: u.status || {current_state:"undefined",timestamp:null},
    }));
    res.render("directory", {
      title: "ESN Directory",
      user: req.session.user,
      users: usersWithStatus,
      getStatusBadge
    });
  } catch (err) {
    res.status(500).send("Error loading directory");
  }
});

// chat route
app.get("/public_chat", isAuthenticated, (req, res) => {
  res.render("public_chat", { title: "Public Chat", user: req.session.user });
});

// Logout route
app.get("/logout", (req, res) => {
  // Set user online status to false before destroying session
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

// receiving and emitting a message whenever a user joins
socketIO.on("connection", () => {
  socketIO.emit("joined", username);
});

// saving a message to the database
app.post("/sendMessage", async (req, res) => {
  var message = new Message(req.body);
  await message.save();
  socketIO.emit("message", req.body);
  res.sendStatus(200);
});

// fetching messages from the database
app.get("/fetchMessages", async (req, res) => {
  const messages = await Message.find({});
  console.log("Fetched messages:", messages);
  res.json(messages);
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


httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
