import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  title: String,
  thumbnail: String,
  mediaType: { type: String, enum: ['Reel', 'Post', 'Story', 'IGTV'], default: 'Post' },
  fileSize: String,
  downloadUrl: String,
  downloadedAt: { type: Date, default: Date.now }
});

const MediaModel = mongoose.models.Media || mongoose.model('Media', mediaSchema);
export default MediaModel;
