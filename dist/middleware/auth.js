import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
export function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const token = authHeader.split(' ')[1]; // Bearer TOKEN
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        console.error('JWT verification error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
}
// Optional: Create a middleware that logs user info
export function logUser(req, res, next) {
    const user = req.user;
    if (user) {
        console.log(`Authenticated user: ${user.userId}`);
    }
    next();
}
//# sourceMappingURL=auth.js.map