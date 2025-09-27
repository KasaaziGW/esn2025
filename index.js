const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;
// setting the view engine to ejs
app.set("view engine", "ejs");
// serving static files from the "public" directory
app.use(express.static("public"));
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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
