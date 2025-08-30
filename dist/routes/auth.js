import { Router } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client.js';
import bcrypt from 'bcryptjs';
import passport from '../config/passport.js';
import OpenAI from 'openai';
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});
// Helper function to get a fun fact
async function getFunFactForMovie(movieName) {
    try {
        const prompt = `Give me one interesting and lesser-known fun fact about the movie "${movieName}". Keep it concise and engaging, around 1-2 sentences. Only respond with the fun fact, nothing else. Make it different from common facts.`;
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a movie expert who provides interesting and accurate fun facts about movies. Always provide real, verifiable information. Try to give unique and lesser-known facts."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 150,
            temperature: 0.8 // Higher temperature for more variety
        });
        return completion.choices[0]?.message?.content?.trim() || '';
    }
    catch (error) {
        console.error('OpenAI error in auth:', error);
        return '';
    }
}
// Signup
router.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ error: 'Username and password required' });
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser)
        return res.status(409).json({ error: 'Username already in use' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: { username, password: hashedPassword }
    });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username } });
});
// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(username, password);
    console.log(req);
    if (!username || !password)
        return res.status(400).json({ error: 'Email and password required' });
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.password)
        return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
        return res.status(401).json({ error: 'Invalid credentials' });
    let funFact = '';
    if (user.favoriteMovie) {
        funFact = await getFunFactForMovie(user.favoriteMovie);
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
        token,
        user: {
            id: user.id,
            username: user.username,
            movie: user.favoriteMovie || '',
            funFact: funFact
        }
    });
});
// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false }), async (req, res) => {
    const user = req.user;
    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    let funFact = '';
    if (user.favoriteMovie) {
        funFact = await getFunFactForMovie(user.favoriteMovie);
    }
    // Redirect to frontend dashboard with token, user data, and fun fact
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    const params = new URLSearchParams({
        token,
        username: user.username || '',
        email: user.email || '',
        photo: user.profilePhoto || '',
        favoriteMovie: user.favoriteMovie || '',
        funFact: funFact
    });
    res.redirect(`${frontendURL}/dashboard?${params.toString()}`);
});
export default router;
//# sourceMappingURL=auth.js.map