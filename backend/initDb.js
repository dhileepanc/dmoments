import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from './db.js'
import { hashPassword } from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function run() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
  await pool.query(schema)
  await pool.query(
    `ALTER TABLE events ADD COLUMN IF NOT EXISTS photographer_id INTEGER
       REFERENCES photographers(id) ON DELETE CASCADE`
  )
  await pool.query(`ALTER TABLE country_plans ADD COLUMN IF NOT EXISTS title TEXT`)
  await pool.query(`ALTER TABLE country_plans ADD COLUMN IF NOT EXISTS description TEXT`)
  await pool.query(
    `ALTER TABLE country_plans ADD COLUMN IF NOT EXISTS duration_days INTEGER NOT NULL DEFAULT 30`
  )
  await pool.query(
    `ALTER TABLE country_plans ADD COLUMN IF NOT EXISTS events_limit INTEGER NOT NULL DEFAULT 0`
  )
  await pool.query(
    `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS events_limit INTEGER NOT NULL DEFAULT 0`
  )
  await pool.query(
    `INSERT INTO settings (key, value)
       SELECT 'free_event_limit', value FROM settings WHERE key = 'max_events'
     ON CONFLICT (key) DO NOTHING`
  )
  await pool.query(`DELETE FROM settings WHERE key = 'max_events'`)
  console.log('Schema ready')

  const adminEmail = 'admin@practiceai.com'
  const { rows: adminRows } = await pool.query(
    'SELECT id FROM admins WHERE email = $1',
    [adminEmail]
  )
  if (adminRows.length === 0) {
    await pool.query(
      'INSERT INTO admins (email, password, name) VALUES ($1, $2, $3)',
      [adminEmail, hashPassword('admin123'), 'Super Admin']
    )
    console.log(`Admin seeded: ${adminEmail} / admin123`)
  }

  const { rows: eventRows } = await pool.query('SELECT COUNT(*) FROM events')
  if (Number(eventRows[0].count) === 0) {
    await pool.query(
      `INSERT INTO events (name, event_date, location, image, description) VALUES
        ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10)`,
      [
        'Summer Wedding Shoot',
        '2026-06-14',
        'Goa, India',
        'https://picsum.photos/seed/wedding/600/400',
        'A beautiful outdoor wedding photography event.',
        'Corporate Conference 2026',
        '2026-07-02',
        'Bengaluru, India',
        'https://picsum.photos/seed/corp/600/400',
        'Annual corporate conference coverage.',
      ]
    )
    console.log('Sample events seeded')
  }

  const defaults = {
    app_name: 'AI Photo Platform',
    playstore_url: 'https://play.google.com/store/apps/details?id=com.practiceai',
    appstore_url: 'https://apps.apple.com/app/id000000000',
razorpay_key_id: '',
    razorpay_key_secret: '',
    razorpay_currency: 'INR',
    free_event_limit: '3',
    event_fee: '100',
    event_pricing: 'free',
  }
  for (const [key, value] of Object.entries(defaults)) {
    await pool.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
      [key, value]
    )
  }

  const { rows: cpRows } = await pool.query('SELECT COUNT(*) FROM country_plans')
  if (Number(cpRows[0].count) === 0) {
    await pool.query(
      `INSERT INTO country_plans (country, currency_code, price, title, description, duration_days, events_limit) VALUES
        ('India', 'INR', 499, 'Monthly Plan', 'Full access for one month + event gallery tools.', 30, 20),
        ('United States', 'USD', 29, 'Monthly Plan', 'Full access for one month + event gallery tools.', 30, 20),
        ('United Kingdom', 'GBP', 25, 'Monthly Plan', 'Full access for one month + event gallery tools.', 30, 20),
        ('United Arab Emirates', 'AED', 99, 'Monthly Plan', 'Full access for one month + event gallery tools.', 30, 20),
        ('Australia', 'AUD', 45, 'Monthly Plan', 'Full access for one month + event gallery tools.', 30, 20)`
    )
    console.log('Sample country plans seeded')
  }

  await pool.query(
    `UPDATE country_plans SET
       title = COALESCE(NULLIF(title, ''), 'Monthly Plan'),
       description = COALESCE(NULLIF(description, ''), 'Full access for one month + event gallery tools.'),
       duration_days = COALESCE(duration_days, 30),
       events_limit = CASE WHEN events_limit IS NULL OR events_limit = 0 THEN 20 ELSE events_limit END
     WHERE NULLIF(title, '') IS NULL OR NULLIF(description, '') IS NULL OR duration_days IS NULL OR COALESCE(events_limit, 0) = 0`
  )

  console.log('Done.')
  await pool.end()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
