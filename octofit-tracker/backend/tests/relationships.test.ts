import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { Activity, Team, User, Workout } from '../src/models/index.js';

let mongo: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([Activity.deleteMany({}), Team.deleteMany({}), User.deleteMany({}), Workout.deleteMany({})]);
});

describe('team relationship integrity', () => {
  it('moves members from their previous team when creating a team', async () => {
    const previousTeam = await Team.create({ name: 'Old team', mascot: 'Old', members: [] });
    const member = await User.create({
      name: 'Mona',
      email: 'mona@example.com',
      team: previousTeam._id,
      fitnessGoal: 'endurance',
    });
    await Team.updateOne({ _id: previousTeam._id }, { $addToSet: { members: member._id } });

    const response = await request(app)
      .post('/api/teams')
      .send({ name: 'New team', mascot: 'Mona', members: [member._id.toString()] });

    expect(response.status).toBe(201);
    const updatedMember = await User.findById(member._id);
    const updatedPreviousTeam = await Team.findById(previousTeam._id);
    const newTeam = await Team.findById(response.body.team._id);
    expect(updatedMember?.team?.toString()).toBe(response.body.team._id);
    expect(updatedPreviousTeam?.members.map((id) => id.toString())).not.toContain(member._id.toString());
    expect(newTeam?.members.map((id) => id.toString())).toContain(member._id.toString());
  });

  it('rejects activity attributed to a team the user does not belong to', async () => {
    const assignedTeam = await Team.create({ name: 'Assigned', mascot: 'A', members: [] });
    const otherTeam = await Team.create({ name: 'Other', mascot: 'B', members: [] });
    const member = await User.create({
      name: 'Mona',
      email: 'mona@example.com',
      team: assignedTeam._id,
      fitnessGoal: 'endurance',
    });
    await Team.updateOne({ _id: assignedTeam._id }, { $addToSet: { members: member._id } });

    const response = await request(app)
      .post('/api/activities')
      .send({ userId: member._id.toString(), teamId: otherTeam._id.toString(), type: 'run', minutes: 30 });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(await Activity.countDocuments()).toBe(0);
  });
});