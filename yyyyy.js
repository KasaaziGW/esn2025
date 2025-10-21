const { db } = require("./firebase"); // make sure this is your Firebase admin SDK setup

const gallery = [
  "https://firebasestorage.googleapis.com/v0/b/auth-b185a.appspot.com/o/buyege-sommer-lodge%2FIMG-20251012-WA0013.jpg?alt=media&token=4c68adb6-87d7-4744-bf59-8a8033b15a20",
  "https://firebasestorage.googleapis.com/v0/b/auth-b185a.appspot.com/o/buyege-sommer-lodge%2FIMG-20251012-WA0014(2).jpg?alt=media&token=03b99e4d-7ce2-4fe6-af4c-ffe30abaa629",
  "https://firebasestorage.googleapis.com/v0/b/auth-b185a.appspot.com/o/buyege-sommer-lodge%2FIMG-20251012-WA0016(1).jpg?alt=media&token=01ae9673-937b-439f-93f3-a56c30fc227d",
  "https://firebasestorage.googleapis.com/v0/b/auth-b185a.appspot.com/o/buyege-sommer-lodge%2FIMG-20251012-WA0017(1).jpg?alt=media&token=b6ab2bbd-0b07-4295-a5f4-b8de8cda6112",
  "https://firebasestorage.googleapis.com/v0/b/auth-b185a.appspot.com/o/buyege-sommer-lodge%2FIMG-20251012-WA0018(1).jpg?alt=media&token=b6a9ba55-9783-40f5-9e89-933fa3f5dc6f",
  "https://firebasestorage.googleapis.com/v0/b/auth-b185a.appspot.com/o/buyege-sommer-lodge%2FIMG-20251012-WA0019.jpg?alt=media&token=1036263d-928c-4990-87c9-852b85292e1b"
];

const propertyData = {
  name: "Buyege Sommer Lodge",
  type: "Entire Villa",
  location: "Wakiso, Uganda",
  description: "Beautiful architect-designed villa with private forest, pool, and terraces for up to 11 guests.",
  capacity: 11,
  bedrooms: 6,
  beds: 7,
  bathrooms: 2,
  pricePerNight: 310,
  amenities: ["WiFi", "Swimming Pool", "Free Parking", "Campfire", "Kitchen", "Garden View"],
  highlights: ["Dive right in — private pool", "Self check-in", "Park & garden views", "Memorable campfire spot"],
  gallery: gallery,
  host: {
    name: "Martin",
    yearsHosting: 1,
    occupation: "IT Audit/Specialist",
    image: "https://firebasestorage.googleapis.com/v0/b/auth-b185a.appspot.com/o/buyege-sommer-lodge%2Fhost.jpg?alt=media" // placeholder if you have host image
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

db.collection("properties").doc("buyege-sommer-lodge").set(propertyData)
  .then(() => console.log("Property seeded successfully!"))
  .catch(err => console.error("Error seeding property:", err));
