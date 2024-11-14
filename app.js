const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const cron = require('node-cron');
const app = express();
require('dotenv').config();

const UPLOAD_DIR = path.join(__dirname, 'uploads')
const SSL_DIR = path.join(__dirname, 'ssl')
const ALLOWED_EXTENSIONS = process.env.ALLOWED_EXTENSIONS ? process.env.ALLOWED_EXTENSIONS.split(',') : []
const MAIN_DOMAIN = process.env.DOMAIN
if (MAIN_DOMAIN === 'test.com') return console.log('Please change default domain name')

const fileExtensions = {
    image: [
        ".jpeg", ".jpg", ".png", ".gif", ".bmp", ".tiff", ".tif", ".webp", 
        ".svg", ".heic", ".cr2", ".crw", ".nef", ".nrw", ".arw", ".srf", 
        ".sr2", ".dng", ".raf", ".orf", ".rw2", ".srw"
    ],
    video: [
        ".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm", ".mpeg", 
        ".mpg", ".mpe", ".3gp", ".ogv", ".ogg"
    ],
    audio: [
        ".mp3", ".wav", ".aac", ".flac", ".ogg", ".wma", ".m4a", ".alac", 
        ".aiff", ".pcm", ".opus"
    ]
}

// Separate limits based on file type
const MAX_FILE_SIZE_IMAGE = parseInt(process.env.MAX_FILE_SIZE_IMAGE) || Infinity
const MAX_FILE_SIZE_AUDIO = parseInt(process.env.MAX_FILE_SIZE_AUDIO) || Infinity
const MAX_FILE_SIZE_VIDEO = parseInt(process.env.MAX_FILE_SIZE_VIDEO) || Infinity
const MAX_FILE_SIZE_DEFAULT = parseInt(process.env.MAX_FILE_SIZE_DEFAULT) || Infinity

// Ensure the upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// Ensure the SSL folder exists, create if not
if (!fs.existsSync(SSL_DIR)) {
    fs.mkdirSync(SSL_DIR, { recursive: true })
}


// Storage configuration for multer
const storage = multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
        const randomNumber = Math.floor(Math.random() * 10000)
        const uniqueName = `${Date.now()}-${randomNumber}-${file.originalname}`
        cb(null, uniqueName)
    },
})

// File filter for validating extensions
const fileFilter = (req, file, cb) => {
    if (ALLOWED_EXTENSIONS.length === 0) return cb(null, true) // No validation if empty
        const ext = path.extname(file.originalname).toLowerCase()
    if (ALLOWED_EXTENSIONS.includes(ext)) {
        cb(null, true)
    } else {
        cb(new Error(`File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`))
    }
}

// Dynamic file size limit based on file extension
const getFileSizeLimit = (file) => {
    const ext = path.extname(file.originalname).toLowerCase()
    
    if (fileExtensions.image.includes(ext)) {
        return MAX_FILE_SIZE_IMAGE
    } else if (fileExtensions.video.includes(ext)) {
        return MAX_FILE_SIZE_VIDEO
    } else if (fileExtensions.audio.includes(ext)) {
        return MAX_FILE_SIZE_AUDIO
    } else {
        return MAX_FILE_SIZE_DEFAULT
    }
}

const upload = multer({
    storage,
    fileFilter,
    limits: { 
        fileSize: (req, file, cb) => getFileSizeLimit(file),
    }
})

// Middleware to parse JSON data
app.use(express.json())

// If the requst is not with main domain redirect it
app.use((req, res, next) => {
    if (req.hostname !== MAIN_DOMAIN) {
        const redirectUrl = `https://${MAIN_DOMAIN}:${process.env.PORT}${req.url}`
        return res.redirect(301, redirectUrl)
    }
    next()
})

// Upload route
app.post('/upload', (req, res) => {
    upload.single('files[]')(req, res, err => {
        if (err) {
            console.log(err)
            const errorMsg = err.message || 'File upload failed'
            return res.status(400).send(errorMsg)
        }

        const imageURL = `https://${req.headers.host}/uploads/${req.file.filename}`
        res.status(200).json((process.env.DISCORD_SCHEMA == 'true') ? {
            attachments: [
                {
                    url: imageURL,
                    proxy_url: imageURL
                }
            ]
        } : imageURL)
    })
})

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOAD_DIR, {maxAge: (parseInt(process.env.CACHE_TIME) ?? 0) * 1000}))

// Schedule the cleanup job to run every day at midnight
if (process.env.EXPIRATION_DAYS > 0) {
    cron.schedule('0 0 * * *', function() {
        const now = Date.now()
        const expirationTime = parseInt(process.env.EXPIRATION_DAYS) * 86_400_000  // Expiration in milliseconds
    
        fs.readdir(UPLOAD_DIR, (err, files) => {
            if (err) {
                return console.error('Error reading upload directory:', err)
            }
    
            files.forEach(file => {
                const filePath = path.join(UPLOAD_DIR, file)
                fs.stat(filePath, (err, stats) => {
                    if (err) {
                        return console.error('Error getting file stats:', err)
                    }
    
                    if (now - stats.mtimeMs > expirationTime) {
                        fs.unlink(filePath, err => {
                            if (err) console.error('Error deleting file:', err)
                            else console.log('Deleted expired file:', file)
                        })
                    }
                })
            })
        })
    })
}

const sslOptions = {
    key: fs.readFileSync(path.join(SSL_DIR, 'key.pem')),
    cert: fs.readFileSync(path.join(SSL_DIR, 'cert.pem')),
    ca: fs.existsSync(path.join(SSL_DIR, 'chain.pem')) ? fs.readFileSync(path.join(SSL_DIR, 'chain.pem')) : undefined, // Optional, if you have a CA chain
}

// Create HTTPS server and listen for requests only on the specified domain
https.createServer(sslOptions, app).listen(process.env.PORT, () => {
    console.log(`Server is running securely at https://${MAIN_DOMAIN}:${process.env.PORT}`)
    console.log(`Use https://${MAIN_DOMAIN}:${process.env.PORT}/upload for uploading files`)
    console.log(`Use https://${MAIN_DOMAIN}:${process.env.PORT}/uploads/filename for serving files`)
})