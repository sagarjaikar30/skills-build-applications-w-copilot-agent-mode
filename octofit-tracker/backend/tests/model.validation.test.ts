import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { Activity, Team, User, Workout } from '../src/models/index.js';

describe('OctoFit model validation', () => {
  it('normalizes and validates user email addresses', () => {
    const user = new User({ name: 'Mona', email: ' Mona@Example.com ', fitnessGoal: 'endurance' });
    expect(user.validateSync()).toBeUndefined();
    expect(user.email).toBe('mona@example.com');

    user.email = 'not-an-email';
    expect(user.validateSync()?.errors.email).toBeDefined();
  });

  it('rejects duplicate team members', () => {
    const memberId = new Types.ObjectId();
    const team = new Team({ name: 'Octocats', mascot: 'Mona', members: [memberId, memberId] });
    expect(team.validateSync()?.errors.members).toBeDefined();
  });

  it('normalizes activity types and rejects non-positive leaderboard inputs', () => {
    const activity = new Activity({
      user: new Types.ObjectId(),
      team: new Types.ObjectId(),
      type: ' RUN ',
      minutes: 0,
      points: 0,
      occurredAt: new Date(),
    });
    const error = activity.validateSync();
    expect(activity.type).toBe('run');
    expect(error?.errors.minutes).toBeDefined();
    expect(error?.errors.points).toBeDefined();

    const fractionalActivity = new Activity({
      user: new Types.ObjectId(),
      team: new Types.ObjectId(),
      type: 'run',
      minutes: 1.5,
      points: 1.5,
      occurredAt: new Date(),
    });
    expect(fractionalActivity.validateSync()?.errors.minutes).toBeDefined();
  });

  it('normalizes workout focus and restricts difficulty to supported values', () => {
    const workout = new Workout({
      title: 'Intervals',
      focus: ' Endurance ',
      minutes: 30,
      difficulty: 'extreme',
    });
    expect(workout.focus).toBe('endurance');
    expect(workout.validateSync()?.errors.difficulty).toBeDefined();
  });
});