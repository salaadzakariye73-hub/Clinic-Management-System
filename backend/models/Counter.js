const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

// Atomic sequence generator used for patient codes and per-doctor daily queue numbers.
counterSchema.statics.next = async function next(key) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const doc = await this.findOneAndUpdate(
        { _id: key },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      return doc.seq;
    } catch (err) {
      // two requests created the same counter at once -> retry
      if (err.code !== 11000 || attempt === 2) throw err;
    }
  }
  return undefined;
};

module.exports = mongoose.model('Counter', counterSchema);
