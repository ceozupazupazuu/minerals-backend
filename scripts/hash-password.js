const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.log('Cara pakai: node scripts/hash-password.js <password-kamu>');
  process.exit(1);
}

bcrypt.hash(password, 10).then((hash) => {
  console.log('\nADMIN_PASSWORD_HASH=' + hash + '\n');
  console.log('Copy baris di atas ke environment variable ADMIN_PASSWORD_HASH di Railway.');
});
