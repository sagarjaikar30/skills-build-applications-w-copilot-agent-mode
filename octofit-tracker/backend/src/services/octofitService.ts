import { Activity, Team, User, Workout } from '../models/index.js';
import { Types } from 'mongoose';

type InputRecord = Record<string, unknown>;

function fail(status: number, message: string): never {
  throw Object.assign(new Error(message), { status });
}

function asRecord(input: unknown): InputRecord {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return fail(400, 'Request body must be an object');
  }
  return input as InputRecord;
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) return fail(400, `${field} is required`);
  return value.trim();
}

function objectId(value: unknown, field: string): Types.ObjectId {
  if (typeof value !== 'string' || !/^[\da-f]{24}$/i.test(value)) {
    return fail(400, `${field} must be a valid ID`);
  }
  return new Types.ObjectId(value);
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  const body = asRecord(input);
  const userId = objectId(body.userId, 'userId');
  const teamId = objectId(body.teamId, 'teamId');
  const type = requiredText(body.type, 'type');
  if (typeof body.minutes !== 'number' || !Number.isFinite(body.minutes) || body.minutes <= 0) {
    return fail(400, 'minutes must be a positive number');
  }

  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user || !team) return fail(404, 'User or team not found');

  return Activity.create({
    user: user._id,
    team: team._id,
    type,
    minutes: body.minutes,
    points: body.minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  const body = asRecord(input);
  const name = requiredText(body.name, 'name');
  const mascot = requiredText(body.mascot, 'mascot');
  const rawMembers = body.members ?? [];
  if (!Array.isArray(rawMembers)) return fail(400, 'members must be an array');

  const members = [...new Set(rawMembers.map((member) => objectId(member, 'member ID').toString()))]
    .map((memberId) => new Types.ObjectId(memberId));
  if (members.length > 0) {
    const foundMembers = await User.countDocuments({ _id: { $in: members } });
    if (foundMembers !== members.length) return fail(404, 'One or more members were not found');
  }

  return Team.create({ name, mascot, members });
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().lean(),
    Activity.aggregate<{ _id: Types.ObjectId; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const pointsByTeam = new Map(totals.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]));

  return teams
    .map((team) => ({ teamName: team.name, totalPoints: pointsByTeam.get(team._id.toString()) ?? 0 }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

function focusForActivity(type: string): string {
  const normalizedType = type.trim().toLowerCase();
  if (['run', 'running', 'walk', 'walking', 'cycle', 'cycling'].includes(normalizedType)) return 'endurance';
  if (['strength', 'weightlifting', 'weights'].includes(normalizedType)) return 'strength';
  return normalizedType;
}

export async function suggestWorkouts(userEmail: string) {
  let email: string;
  try {
    email = decodeURIComponent(userEmail);
  } catch {
    return fail(400, 'Email is malformed');
  }

  const user = await User.findOne({ email }).lean();
  if (!user) return fail(404, 'User not found');

  const [activity, workouts] = await Promise.all([
    Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean(),
    Workout.find().lean(),
  ]);
  const focus = activity ? focusForActivity(activity.type) : user.fitnessGoal;
  const matchingWorkouts = workouts
    .map((workout) => ({ workout, matches: workout.focus.toLowerCase() === focus.toLowerCase() }))
    .sort((left, right) => Number(right.matches) - Number(left.matches));
  const reason = activity
    ? `Recommended based on your recent ${activity.type} activity.`
    : `Recommended to support your ${user.fitnessGoal} goal.`;

  return matchingWorkouts.map(({ workout }, index) => ({
    ...workout,
    ...(index === 0 ? { reason } : {}),
  }));
}

export { User };
