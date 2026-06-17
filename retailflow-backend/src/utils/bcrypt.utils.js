import bcrypt from 'bcryptjs'

const ROUNDS = 12

export const hashPassword   = (pw) => bcrypt.hash(pw, ROUNDS)
export const comparePassword = (pw, hash) => bcrypt.compare(pw, hash)
