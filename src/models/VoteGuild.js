import mongoose from "mongoose";

const guildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  voted: { type: Boolean, default: false }
});

export default mongoose.model("VoteGuild", guildSchema);
