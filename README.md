# Emergency Social Network Project
The Emergency Social Network (ESN) is a web-based platform designed to improve communication, coordination, and information sharing among community members during emergencies. It allows citizens, coordinators, and administrators to interact in real-time through a secure online system.

# Authors
- Students: `Ainedembe Denis, Namusoke Olivia`
- Lecturer: `Kasaazi William`

## 1. Technologies used
Node.js + Express + MongoDB Atlas

## 2. ESN System Features
- User Registration & Authentication
- Community Directory (User Listing)
- Public Chat / Community Wall
- Private Chat / Private Messaging
- Status Sharing
- Announcements (Coordinator Broadcasts)
- Information Search
- User Profile Management (Admin Panel)
- Role-Based Access Control (RBAC)
- System Administration Dashboard
- Emergency Reporting

## 3. Prerequisites
- Node.js v16.0.0 or higher required

## 4. Installation Steps
- Clone the repository: `git clone https://github.com/Ainedembe-Denis/emergency-social-network-project.git`
- Initialize the Project:  `npm init -y`
- Install dependencies: `npm install`  
- Run the Server: `npx nodemon app.js`  "or" `node app.js`
- Access the system in the browser: `http://localhost:5000`
- If you want to kill the current server session: `taskkill /f /im node.exe`

## 5. Acess the System as Default Admin
- Username: `ESNadmin`
- Password: `admin`

## 6. Development Project Package installations
- Initialize the Project: npm init -y
- Install Main dependencies: `npm install express mongoose bcryptjs jsonwebtoken dotenv cors morgan joi`
- Install Developer dependencies: `npm install -D nodemon jest supertest`
- Use libphonenumber-js for robust phone parsing: `npm i libphonenumber-js`
- Install slugify package to generate a slug names: `npm i slugify nanoid`
- Install Socket.io for real-time, instant communication between backend (Node.js server) and frontend (browser, mobile app): `npm install socket.io`
- Install Multer that is used by Express to handle file uploads (like chat images, audio, and attachments): `npm install multer`
- Install the required security packages: `npm install helmet cors express-rate-limit`
- Install package for Swagger API Documentation (accessed at http://localhost:5000/api-docs): `npm install swagger-jsdoc swagger-ui-express`
- Install ejs: `npm install ejs`
- Install proper session-based authentication system: `npm install express-session connect-mongo`

## 7. Project Structure
```bash
emergency-social-network-project/
│
├── app.js
├── .env
├── .gitignore
├── package-lock.json
├── package.json
├── README.md
└── src/
    ├── config/
    ├── controllers/
    ├── docs/
    ├── middleware/
    ├── models/
    ├── routes/
    ├── services/
    ├── uploads/
    ├── utils/
    ├── validators/
    └── views/
