const db = require('../config/db');

exports.getInbox = async (req, res) => {
    try {
        const messages = await db.query(
            `SELECT m.id, m.subject, m.content, m.is_read, m.created_at, s.display_name as sender, v.video_url
             FROM messages m
             JOIN users s ON m.sender_id = s.id
             LEFT JOIN videos v ON m.video_id = v.id
             WHERE m.recipient_id = $1
             ORDER BY m.created_at DESC`,
            [req.user.id]
        );
        res.json(messages.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.sendMessage = async (req, res) => {
    const { recipient, subject, message, sender, videoId } = req.body; // recipient is username
    const sender_id = req.user.id;

    try {
        const recipientUser = await db.query('SELECT id FROM users WHERE username = $1', [recipient]);
        if (recipientUser.rows.length === 0) {
            return res.status(404).json({ msg: 'Recipient not found' });
        }
        const recipient_id = recipientUser.rows[0].id;

        const newMessage = await db.query(
            `INSERT INTO messages (sender_id, recipient_id, subject, content, video_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [sender_id, recipient_id, subject, message, videoId || null]
        );

        // Emit socket event
        const io = req.app.get('socketio');
        const recipientSocketId = req.app.get('userSockets')[recipient_id];
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('newMessage', newMessage.rows[0]);
        }

        res.json(newMessage.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.markAsRead = async (req, res) => {
    try {
        await db.query(
            'UPDATE messages SET is_read = TRUE WHERE id = $1 AND recipient_id = $2',
            [req.params.id, req.user.id]
        );
        res.json({ msg: 'Message marked as read' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};