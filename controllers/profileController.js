const db = require('../config/db');

exports.getProfile = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await db.query('SELECT id, username, display_name, avatar_url, bio, created_at FROM users WHERE username = $1', [username]);

        if (user.rows.length === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const profileData = user.rows[0];

        // Fetch user's sent letters, videos, and comments
        const sentLetters = await db.query('SELECT id, subject, created_at FROM messages WHERE sender_id = $1 ORDER BY created_at DESC', [profileData.id]);
        const videos = await db.query('SELECT id, title, thumbnail_url, created_at FROM videos WHERE user_id = $1 ORDER BY created_at DESC', [profileData.id]);
        const comments = await db.query(
            `SELECT c.id, c.content, c.created_at, u.display_name as author
             FROM profile_comments c
             JOIN users u ON c.author_id = u.id
             WHERE c.profile_owner_id = $1
             ORDER BY c.created_at DESC`, [profileData.id]
        );

        res.json({
            profile: profileData,
            letters: sentLetters.rows,
            videos: videos.rows,
            comments: comments.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.updateProfile = async (req, res) => {
    const { displayName, bio } = req.body;
    // Avatar update would be handled in a separate route, likely with multer
    try {
        const updatedUser = await db.query(
            'UPDATE users SET display_name = $1, bio = $2 WHERE id = $3 RETURNING id, username, display_name, bio',
            [displayName, bio, req.user.id]
        );
        res.json(updatedUser.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.postComment = async (req, res) => {
    const { content } = req.body;
    const { profileOwnerId } = req.params;
    const author_id = req.user.id;

    try {
        const newComment = await db.query(
            'INSERT INTO profile_comments (author_id, profile_owner_id, content) VALUES ($1, $2, $3) RETURNING *',
            [author_id, profileOwnerId, content]
        );
        res.json(newComment.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
}