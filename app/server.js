const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// AWS S3 Configuration
const s3 = new AWS.S3({
    region: process.env.AWS_REGION || 'us-east-1'
});

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});

// Routes
app.get('/', (req, res) => {
    res.render('index', { title: 'Educational Video Platform' });
});

app.get('/videos', async (req, res) => {
    try {
        const params = {
            Bucket: process.env.S3_BUCKET,
            Prefix: 'videos/'
        };
        
        const data = await s3.listObjectsV2(params).promise();
        const videos = data.Contents.map(item => ({
            key: item.Key,
            url: `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${item.Key}`,
            size: item.Size,
            lastModified: item.LastModified
        }));
        
        res.render('videos', { videos });
    } catch (error) {
        console.error('Error fetching videos:', error);
        res.status(500).send('Error fetching videos');
    }
});

app.post('/upload', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded');
        }

        const params = {
            Bucket: process.env.S3_BUCKET,
            Key: `videos/${Date.now()}-${req.file.originalname}`,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            ACL: 'public-read'
        };

        await s3.upload(params).promise();
        res.redirect('/videos');
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).send('Upload failed');
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Educational Video Platform'
    });
});

app.get('/metrics', (req, res) => {
    // Basic metrics endpoint for Prometheus
    const metrics = [
        '# HELP http_requests_total Total HTTP requests',
        '# TYPE http_requests_total counter',
        `http_requests_total{method="get",handler="/"} ${Math.floor(Math.random() * 1000)}`,
        `http_requests_total{method="get",handler="/videos"} ${Math.floor(Math.random() * 500)}`,
        `http_requests_total{method="post",handler="/upload"} ${Math.floor(Math.random() * 100)}`
    ].join('\n');
    
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
});

app.listen(PORT, () => {
    console.log(`Educational Video Platform running on port ${PORT}`);
});