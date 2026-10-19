import AuditLog from '../models/AuditLog.js'

// Picks a short, human-readable label for the audit trail list so the owner
// doesn't have to open each entry's full snapshot just to see what it was.
const describeDoc = (model, doc) => {
  if (doc.name) return doc.name
  if (doc.title) return doc.title
  if (doc.poNumber) return doc.poNumber
  if (doc.designation) return doc.designation
  if (model === 'Expense') return `${doc.category || 'expense'}${doc.description ? ' — ' + doc.description : ''}`
  return String(doc._id)
}

// Records a delete action. Call this AFTER the soft-delete write has
// succeeded, passing the updated/deleted document. Never throws — a logging
// failure must not block the actual delete the user asked for.
export const logDeletion = async (req, model, doc) => {
  try {
    const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc
    await AuditLog.create({
      ownerId:    req.scopeOwnerId,
      model,
      documentId: plain._id,
      label:      describeDoc(model, plain),
      snapshot:   plain,
      deletedBy:  req.user._id,
    })
  } catch (err) {
    console.error(`audit log failed for ${model} ${doc._id}:`, err.message)
  }
}
