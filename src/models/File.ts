import mongoose, { Schema } from 'mongoose';
import { IFile } from '../types';

const fileSchema = new Schema<IFile>(
  {
    filename: {
      type: String,
      required: [true, 'Filename is required']
    },
    originalName: {
      type: String,
      required: [true, 'Original filename is required']
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required']
    },
    size: {
      type: Number,
      required: [true, 'File size is required']
    },
    path: {
      type: String,
      required: [true, 'File path is required']
    },
    url: {
      type: String,
      required: [true, 'File URL is required']
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'File owner is required']
    },
    isCompressed: {
      type: Boolean,
      default: false
    },
    originalSize: {
      type: Number
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

// Virtual for formatted size
fileSchema.virtual('formattedSize').get(function () {
  const bytes = this.size;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Virtual for file extension
fileSchema.virtual('extension').get(function () {
  const parts = this.originalName.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() : '';
});

// Indexes
fileSchema.index({ owner: 1, createdAt: -1 });
fileSchema.index({ filename: 1 });
fileSchema.index({ mimeType: 1 });

const File = mongoose.model<IFile>('File', fileSchema);

export default File;

