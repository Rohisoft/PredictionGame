import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { beforeAll, afterAll, afterEach } from "vitest";

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  // A replica set (not a plain standalone instance) is required for
  // multi-document transactions, same as production (MongoDB Atlas).
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await replSet.waitUntilRunning();
  await mongoose.connect(replSet.getUri(), { serverSelectionTimeoutMS: 20_000 });
  await mongoose.connection.asPromise();
}, 120_000);

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});
