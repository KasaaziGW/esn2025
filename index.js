const express = require("express");
const mongoose = require("mongoose");
const flashMessage = require("connect-flash");
const sessions = require("express-session");
const Citizen = require("./models/citizen");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;
// setting the view engine to ejs
app.set("view engine", "ejs");
// serving static files from the "public" directory
app.use(express.static("public"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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
// setting up the flash messages middleware
app.use(function (req, res, next) {
  res.locals.message = req.flash();
  next();
});

// testing connection to MongoDB
const dbURL =
  "mongodb+srv://kasaazigw_db_user:ssc3XU7MAzo5RkVs@cluster0.mgqmfpv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongoose
  .connect(dbURL)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB...", err));

app.get("/", (req, res) => {
  res.render("index");
});

// register route
app.post("/register", (req, res) => {
  const { email, fullname, password, cpassword } = req.body;
  if (password !== cpassword) {
    req.flash("error", "Passwords do not match!");
    res.redirect("/");
  } else {
    // testing if the email already exists
    Citizen.findOne({ email: email })
      .then((citizen) => {
        if (citizen) {
          req.flash("error", `${email} already exists!`);
          res.redirect("/");
        } else {
          // hashing the password
          bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
              console.error(err);
              req.flash("error", "An error occurred. Please try again!");
              res.redirect("/");
            } else {
              // create a model to save the data
              let user = new Citizen({
                email: email,
                fullname: fullname,
                password: hash,
              });
              // saving the data
              user.save();
              req.flash("success", "Registration successful!");
              res.redirect("/");
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
  // checking if user exists
  Citizen.findOne({ email: email }).then((citizen) => {
    if (citizen) {
      // comparing the password
      let hashedPassword = citizen.password;
      bcrypt.compare(password, hashedPassword, (err, result) => {
        if (result) {
          // req.session.user = citizen.fullname;
          req.flash("success", `Welcome back, ${citizen.fullname}!`);
          res.redirect("/");
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
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
