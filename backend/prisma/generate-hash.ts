import crypto from 'crypto'

const password = process.argv[2] || 'admin123'
const salt = crypto.randomBytes(16).toString('hex')
const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')

console.log('Password hash (use in DB insert):')
console.log(`${salt}:${hash}`)

console.log('\nSQL to insert admin user:')
console.log(`INSERT INTO "AdminUser" (id, email, "passwordHash") VALUES (gen_random_uuid(), 'admin@example.com', '${salt}:${hash}');`)
