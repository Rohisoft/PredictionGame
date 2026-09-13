// One-off utility for creating the very first superadmin account, since
// there's no self-serve signup by design (see README's "Bootstrapping the
// first superadmin" section) and `mongosh` isn't always installed. Uses
// the same mongoose/bcryptjs already in server/'s own node_modules — no
// extra install needed.
//
// Usage:
//   node scripts/bootstrap-superadmin.js "<MONGODB_URI>" "<username>" "<password>" ["<full name>"]
//
// Run from inside server/ so it can resolve mongoose/bcryptjs from
// node_modules there.

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const [, , mongoUri, username, password, fullName] = process.argv;

if (!mongoUri || !username || !password) {
  console.error(
    'Usage: node scripts/bootstrap-superadmin.js "<MONGODB_URI>" "<username>" "<password>" ["<full name>"]',
  );
  process.exit(1);
}

await mongoose.connect(mongoUri);

const passwordHash = bcrypt.hashSync(password, 12);
const userId = new mongoose.Types.ObjectId();

await mongoose.connection.collection("users").insertOne({
  _id: userId,
  username,
  fullName: fullName || username,
  role: "superadmin",
  mustChangePassword: true,
  passwordHash,
  createdAt: new Date(),
  updatedAt: new Date(),
});

await mongoose.connection.collection("wallets").insertOne({
  userId,
  balance: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

console.log(`Created superadmin "${username}". Log in with the password you passed in — you'll be asked to change it immediately.`);

await mongoose.disconnect();
