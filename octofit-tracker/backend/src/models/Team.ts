import { Schema, Types, model } from 'mongoose';

const teamSchema = new Schema({
  name: { type: String, required: true, trim: true },
  mascot: { type: String, required: true, trim: true },
  members: {
    type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    default: [],
    validate: {
      validator: (members: Types.ObjectId[]) => new Set(members.map((member) => member.toString())).size === members.length,
      message: 'Team members must be unique',
    },
  },
});

export const Team = model('Team', teamSchema);
