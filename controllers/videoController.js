const db = require('../config/db');

exports.uploadVideo = async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    const { title, description } = req.body;
    const video_url = `/uploads/${req.file.filename}`;
    // Thumbnail generation would typically happen here, for now we leave it null
    try {
        const newVideo = await db.query(
            'INSERT INTO videos (user_id, title, description, video_url) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.user.id, title || 'Untitled Video', description || '', video_url]
        );
        res.json(newVideo.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getGalleryVideos = async (req, res) => {
    try {
        // For simplicity, returns all videos. Can be made more complex (e.g., featured)
        const videos = await db.query(
            `SELECT v.id, v.title, v.description, v.thumbnail_url, v.video_url, u.display_name as creator, v.created_at
             FROM videos v
             JOIN users u ON v.user_id = u.id
             ORDER BY v.created_at DESC`
        );
        res.json(videos.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};