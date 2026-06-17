#!/bin/sh
# WhatsApp AI Platform — Database initialization script
# Run this once after deploying to create the schema and admin user

set -e

echo "=== WhatsApp AI Platform — DB Init ==="

# Push the Prisma schema to the database
echo "Pushing schema to database..."
npx prisma db push --schema=backend/prisma/schema.prisma

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate --schema=backend/prisma/schema.prisma

# Create admin user
echo "Creating admin user..."
npx tsx backend/prisma/seed.ts

echo "=== Done! ==="
echo "Default login: admin@whatsapp.ai / admin123"
echo "⚠️  CHANGE THESE CREDENTIALS IN PRODUCTION!"
