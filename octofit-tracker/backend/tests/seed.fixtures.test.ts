import { afterEach, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { seed } from '../src/scripts/seed.js';
import { Activity, Team, User, Workout } from '../src/models/index.js';

describe('representative seed fixtures', () => {
  afterEach(async () => {
    await mongoose.disconnect();
  });

  it('seeds linked endurance, strength, and mobility records', async () => {
    const mongo = await MongoMemoryServer.create();
    const previousUri = process.env.MONGODB_URI;
    process.env.MONGODB_URI = mongo.getUri();

    try {
      await seed();
      await mongoose.connect(mongo.getUri());

      const riley = await User.findOne({ email: 'riley@example.com' });
      const mobilityTeam = await Team.findOne({ name: 'Mobility Makers' });
      expect(riley).toBeTruthy();
      expect(mobilityTeam).toBeTruthy();
      if (!riley || !mobilityTeam) throw new Error('Mobility seed fixtures are missing');

      expect(riley.team?.toString()).toBe(mobilityTeam._id.toString());
      expect(mobilityTeam.members.map((member) => member.toString())).toContain(riley._id.toString());
      expect(await Activity.exists({ user: riley._id, team: mobilityTeam._id, type: 'mobility', points: 20 })).toBeTruthy();
      expect(await Workout.exists({ title: 'Mobility Flow', focus: 'mobility', difficulty: 'easy' })).toBeTruthy();
      expect(await Team.countDocuments()).toBe(3);
      expect(await User.countDocuments()).toBe(3);
      expect(await Activity.countDocuments()).toBe(3);
      expect(await Workout.countDocuments()).toBe(3);
    } finally {
      if (previousUri === undefined) delete process.env.MONGODB_URI;
      else process.env.MONGODB_URI = previousUri;
      await mongoose.disconnect();
      await mongo.stop();
    }
  }, 60_000);
});