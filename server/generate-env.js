// Generate environment variables script
// Run this in terminal: node generate-env.js

const crypto = require('crypto');

const jwtSecret = crypto.randomBytes(64).toString('hex');

console.log('\n=== Copy these values to your .env file ===\n');
console.log('# MongoDB Atlas (replace with your actual connection string)');
console.log('MONGODB_URI=mongodb+srv://<username>:<password>@hypothesis-ai.xxxxx.mongodb.net/hypothesis?retryWrites=true&w=majority');
console.log('');
console.log('# JWT Secret (already generated for you)');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log('');
console.log('# Admin Password (set something secure)');
console.log('ADMIN_PASSWORD=change-this-to-your-secure-password');
console.log('');
console.log('# Server config');
console.log('PORT=3001');
console.log('NODE_ENV=production');
console.log('CLIENT_URL=https://your-frontend-domain.com');
console.log('');
console.log('# Optional: Moltbook integration');
console.log('MOLTBOOK_APP_KEY=');
console.log('\n===========================================\n');
