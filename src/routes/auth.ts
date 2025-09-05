import { Router } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client.js';
import bcrypt from 'bcryptjs';
import passport from '../config/passport.js';
import OpenAI from 'openai';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


async function getFunFactForMovie(movieName: string): Promise<string> {
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
      temperature: 0.8 
    });

    return completion.choices[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('OpenAI error in auth:', error);
    return '';
  }
}


router.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ error: 'Username and password required' });

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return res.status(409).json({ error: 'Email already in use' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashedPassword }
  });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username } });
});


router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  let funFact = '';
  if (user.favoriteMovie) {
    funFact = await getFunFactForMovie(user.favoriteMovie);
  }

  console.log("here is the favorite moveie for ", funFact)

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ 
    token, 
    user: { 
      id: user.id, 
      email: user.email, 
      movie: user.favoriteMovie || '',
      funFact: funFact
    } 
  });
});

router.get('/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback', 
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    const user = req.user as any;
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    let funFact = '';
    if (user.favoriteMovie) {
      funFact = await getFunFactForMovie(user.favoriteMovie);
    }
    
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
  }
);

export default router;