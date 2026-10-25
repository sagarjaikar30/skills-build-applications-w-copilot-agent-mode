import { Schema, model } from 'mongoose';

const workoutSchema = new Schema({
  title: { type: String, required: true, trim: true },
  focus: { type: String, required: true, trim: true, lowercase: true },
  minutes: { type: Number, required: true, min: 1 },
  difficulty: { type: String, required: true, trim: true, lowercase: true, enum: ['easy', 'moderate', 'hard'] },
});

workoutSchema.index({ focus: 1 });

export const Workout = model('Workout', workoutSchema);
