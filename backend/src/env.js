
import dotenv from 'dotenv';
// Load environment variables with override to ensure .env values take precedence
dotenv.config({ override: true });
console.log('Environment variables loaded with override.');
