import mongoose from "mongoose";

const musicChannelSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  channelId: { type: String, required: true },
  messageId: { type: String, required: true }
});

export default mongoose.model("MusicChannel", musicChannelSchema);
