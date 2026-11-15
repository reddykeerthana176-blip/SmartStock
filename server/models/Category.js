const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Category must belong to a business'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    color: {
      type: String,
      default: '#4F46E5', // default Indigo
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.index({ businessId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
