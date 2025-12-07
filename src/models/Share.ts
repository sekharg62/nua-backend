import mongoose, { Schema } from 'mongoose';
import { IShare } from '../types';

const shareSchema = new Schema<IShare>(
  {
    file: {
      type: Schema.Types.ObjectId,
      ref: 'File',
      required: [true, 'File reference is required']
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required']
    },
    shareType: {
      type: String,
      enum: ['user', 'link'],
      required: [true, 'Share type is required']
    },
    sharedWith: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: function (this: IShare) {
        return this.shareType === 'user';
      }
    },
    shareLink: {
      type: String,
      unique: true,
      sparse: true // Allows multiple null values
    },
    permission: {
      type: String,
      enum: ['view', 'download'],
      default: 'view'
    },
    expiresAt: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        return ret;
      }
    }
  }
);

// Virtual to check if share is expired
shareSchema.virtual('isExpired').get(function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Virtual to check if share is valid (active and not expired)
shareSchema.virtual('isValid').get(function () {
  if (!this.isActive) return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  return true;
});

// Static method to find valid share for a user
shareSchema.statics.findValidShareForUser = async function (
  fileId: string,
  userId: string
) {
  return this.findOne({
    file: fileId,
    shareType: 'user',
    sharedWith: userId,
    isActive: true,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

// Static method to find valid share by link
shareSchema.statics.findValidShareByLink = async function (shareLink: string) {
  return this.findOne({
    shareLink,
    shareType: 'link',
    isActive: true,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  }).populate('file');
};

// Indexes
// Note: shareLink index is already created by unique: true, sparse: true in schema
shareSchema.index({ file: 1, sharedWith: 1 });
shareSchema.index({ owner: 1 });
shareSchema.index({ expiresAt: 1 });
shareSchema.index({ file: 1, shareType: 1, isActive: 1 });

const Share = mongoose.model<IShare>('Share', shareSchema);

export default Share;

