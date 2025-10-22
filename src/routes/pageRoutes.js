import express from 'express';
import { clearBrowserData } from '../middleware/noCache.js';
import { sessionAuth } from '../middleware/sessionAuth.js';

const router = express.Router();

// Landing page route
router.get('/', (req, res) => {
  res.render('landing');
});

// Login page route
router.get('/login', (req, res) => {
  res.render('login');
});

// Register page route
router.get('/register', (req, res) => {
  res.render('signup');
});


// Logout page route (handles logout and redirects)
router.get('/logout', clearBrowserData, (req, res) => {
  // If user is logged in, destroy session
  if (req.session && req.session.user) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
      }
      // Redirect to login page
      res.redirect('/login');
    });
  } else {
    // Already logged out, redirect to login
    res.redirect('/login');
  }
});

export default router;
