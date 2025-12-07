import mongoose, { Schema } from 'mongoose';
import { IAuditLog } from '../types';

const auditLogSchema = new Schema<IAuditLog>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required']
    },
    action: {
      type: String,
      enum: [
        'file_upload',
        'file_download',
        'file_delete',
        'file_share_user',
        'file_share_link',
        'share_revoke',
        'share_access',
        'file_view'
      ],
      required: [true, 'Action is required']
    },
    file: {
      type: Schema.Types.ObjectId,
      ref: 'File'
    },
    share: {
      type: Schema.Types.ObjectId,
      ref: 'Share'
    },
    details: {
      type: Schema.Types.Mixed
    },
    ipAddress: {
      type: String
    },
    userAgent: {
      type: String
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

// Indexes for efficient querying
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ file: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

// Static method to log an action
auditLogSchema.statics.logAction = async function (
  userId: string,
  action: string,
  options: {
    fileId?: string;
    shareId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  } = {}
) {
  return this.create({
    user: userId,
    action,
    file: options.fileId,
    share: options.shareId,
    details: options.details,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent
  });
};

const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

export default AuditLog;

