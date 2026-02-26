import express from 'express';
import handler from './api/vehiculo.js'; // Requires compiled JS or ts-node setup, let's just write a ts script that runs it

const app = express();
const port = 3000;

app.use(express.json());

app.all('/api/vehiculo', async (req, res) => {
    // Mock Vercel Request/Response objects for testing
    const vercelReq = req as any;
    const vercelRes = res as any;

    try {
        await handler(vercelReq, vercelRes);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log(`Test API at: http://localhost:${port}/api/vehiculo?cedula=22400288332&placa=G645134`);
});
