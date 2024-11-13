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
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || Infinity
const ALLOWED_EXTENSIONS = process.env.ALLOWED_EXTENSIONS ? process.env.ALLOWED_EXTENSIONS.split(',') : []

// Ensure the upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// Ensure the SSL folder exists, create if not
if (!fs.existsSync(SSL_DIR)) {
    fs.mkdirSync(SSL_DIR, { recursive: true })
    console.log('SSL folder created')
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

const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter,
})

// Middleware to parse JSON data
app.use(express.json())

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
app.use('/uploads', express.static(UPLOAD_DIR))

// Schedule the cleanup job to run every day at midnight
if (process.env.EXPIRATION_DAYS > 0) {
    cron.schedule('0 0 * * *', function() {
        const now = Date.now()
        const expirationTime = parseInt(process.env.EXPIRATION_DAYS) * 24 * 60 * 60 * 1000 // Expiration in milliseconds
    
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
    console.log(`Server is running securely at port ${process.env.PORT}`)
})
