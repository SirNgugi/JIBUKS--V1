
import pg from 'pg';
const { Client } = pg;

const client = new Client({
    connectionString: 'postgresql://postgres:1901@localhost:5432/JIBUKS',
});

async function testConnection() {
    console.log('Attempting to connect with pg client...');
    try {
        await client.connect();
        console.log('Connected successfully!');
        const res = await client.query('SELECT NOW()');
        console.log('Current time from DB:', res.rows[0]);
        await client.end();
    } catch (err) {
        console.error('Connection error:', err);
        try {
            await client.end();
        } catch (e) { }
    }
}

testConnection();
