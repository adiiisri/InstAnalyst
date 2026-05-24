import mongoose from 'mongoose';

const followerSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  fullName: String,
  profilePicUrl: String,
  isFollowedByMe: { type: Boolean, default: false },
  isFollowingMe: { type: Boolean, default: false },
  unfollowedAt: Date, // Set if they recently unfollowed us
  followedAt: { type: Date, default: Date.now }
});

const FollowerModel = mongoose.models.Follower || mongoose.model('Follower', followerSchema);
export default FollowerModel;
