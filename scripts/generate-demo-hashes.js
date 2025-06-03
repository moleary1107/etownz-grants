#!/usr/bin/env node

const bcrypt = require('bcryptjs');

const passwords = {
  'admin@etownz.com': 'admin123',
  'john@techstart.ie': 'techstart123',
  'mary@dublincc.ie': 'community123',
  'david@corkresearch.ie': 'research123',
  'emma@greenearth.ie': 'green123',
  'viewer@example.com': 'viewer123'
};

console.log('-- Generated password hashes for demo users');
console.log('-- Use these in migration 011_demo_users_seed.sql\n');

for (const [email, password] of Object.entries(passwords)) {
  const hash = bcrypt.hashSync(password, 10);
  console.log(`-- ${email}: ${password}`);
  console.log(`'{"password_hash": "${hash}"}',\n`);
}

console.log('-- Update SQL:');
for (const [email, password] of Object.entries(passwords)) {
  const hash = bcrypt.hashSync(password, 10);
  console.log(`UPDATE organizations SET profile_data = '{"password_hash": "${hash}"}' WHERE contact_email = '${email}';`);
}