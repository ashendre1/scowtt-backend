import { Router } from 'express';
import OpenAI from 'openai';
import { authenticate } from '../middleware/auth.js';
import prisma from '../prisma/client.js';
const router = Router();
// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});
// Get a fun fact about a movie using OpenAI and save movie to user
router.post('/fun-fact', authenticate, async (req, res) => {
    try {
        const { movieName } = req.body;
        const user = req.user; // Get authenticated user from JWT
        if (!movieName) {
            return res.status(400).json({ error: 'Movie name is required' });
        }
        console.log(`User ${user.userId} requesting fun fact for: ${movieName}`);
        // Update user's favorite movie in database
        await prisma.user.update({
            where: { id: user.userId },
            data: { favoriteMovie: movieName.trim() }
        });
        // Create a prompt for OpenAI to generate a fun fact
        const prompt = `Give me one interesting and lesser-known fun fact about the movie "${movieName}". Keep it concise and engaging, around 1-2 sentences. Only respond with the fun fact, nothing else.`;
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a movie expert who provides interesting and accurate fun facts about movies. Always provide real, verifiable information."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 150,
            temperature: 0.7
        });
        const funFact = completion.choices[0]?.message?.content?.trim();
        if (!funFact) {
            return res.status(500).json({ error: 'Unable to generate fun fact' });
        }
        console.log(funFact);
        res.json({
            movie: movieName,
            funFact: funFact,
            message: 'Movie saved as your favorite!',
            userId: user.userId
        });
    }
    catch (error) {
        console.error('OpenAI fun fact error:', error);
        // Handle specific OpenAI errors
        if (error instanceof Error && error.message.includes('API key')) {
            return res.status(500).json({ error: 'OpenAI API configuration error' });
        }
        // Handle Prisma/Database errors
        if (error instanceof Error && error.message.includes('Record to update not found')) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(500).json({ error: 'Unable to get fun fact at this time' });
    }
});
// Optional: Get user's current favorite movie
router.get('/my-favorite', authenticate, async (req, res) => {
    try {
        const user = req.user;
        const userData = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { favoriteMovie: true, username: true }
        });
        if (!userData) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            username: userData.username,
            favoriteMovie: userData.favoriteMovie || 'No favorite movie set yet'
        });
    }
    catch (error) {
        console.error('Get favorite movie error:', error);
        res.status(500).json({ error: 'Unable to get favorite movie' });
    }
});
// Get a fresh fun fact for user's current favorite movie (for refresh)
router.get('/refresh-fact', authenticate, async (req, res) => {
    try {
        const user = req.user;
        // Get user's current favorite movie
        const userData = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { favoriteMovie: true, username: true }
        });
        if (!userData) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (!userData.favoriteMovie) {
            return res.json({
                message: 'No favorite movie set',
                funFact: '',
                favoriteMovie: ''
            });
        }
        // Generate a new fun fact with higher randomness
        const prompt = `Give me one interesting and lesser-known fun fact about the movie "${userData.favoriteMovie}". Keep it concise and engaging, around 1-2 sentences. Only respond with the fun fact, nothing else. Make it unique and different from common trivia.`;
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a movie expert who provides interesting and accurate fun facts about movies. Always provide real, verifiable information. Focus on unique, lesser-known details that most people wouldn't know."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 150,
            temperature: 0.9 // High temperature for variety
        });
        const funFact = completion.choices[0]?.message?.content?.trim();
        res.json({
            favoriteMovie: userData.favoriteMovie,
            funFact: funFact || 'Unable to generate fun fact at this time',
            username: userData.username
        });
    }
    catch (error) {
        console.error('Refresh fun fact error:', error);
        res.status(500).json({ error: 'Unable to get fresh fun fact' });
    }
});
export default router;
//# sourceMappingURL=moviefact.js.map