import mongoose from 'mongoose'

// Atomic per-key sequence (used for bill / return numbers when Redis isn't available).
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
})

export default mongoose.model('Counter', CounterSchema)
