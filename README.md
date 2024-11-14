
# Secure File Upload Server

This is a simple Node.js server built with Express and Multer that handles file uploads over HTTPS. It ensures that files are stored securely and supports file extension validation, file size limits, and automatic file expiration. The server also integrates SSL for secure connections and can be easily configured through environment variables.

This server aims to be compatible with the screenshot-basic resource in FiveM, allowing for easy integration with the FiveM framework for automatic file uploads.

## Features
- **HTTPS support** for secure connections.
- **File upload with Multer**.
- **Cache serving files** (can be customized via `.env`).
- **File extension validation** (can be customized via `.env`).
- **Dynamic File size limit based on file extension** (can be customized via `.env`).
- **Automatic file expiration** (files are deleted after a specified period).
- **Dynamic file names** with random numbers to prevent conflicts.
- **Upload folder creation** if it doesn't exist.
- **SSL certificate handling** with optional chain certificate.
- **File URL generation** for easy access to uploaded files.
- **Redirect URL** Redirect URL if client is not requsting with correct URL.

## Prerequisites
- Node.js installed on your machine.
- SSL certificates (private key, certificate, and optional CA chain) stored in a folder named `ssl`.

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/MatinHQ/nodecdn.git
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up your `.env` file

Rename `.env.sample` file to `.env` in the root of your project and configure the environment variables

```env
DOMAIN=test.com
PORT=8080
CACHE_TIME=1800 #Time to cache serving files (in seconds) 
EXPIRATION_DAYS=0 #Set it 0 to disable (how long files should presist)
ALLOWED_EXTENSIONS=.png,.jpg,.jpeg,.gif,.bmp,.webp,.mp4,.mkv,.mov,.avi,.flv,.wmv,.webm,.mpg,.mpeg,.3gp,.m4v,.mp3,.wav,.aac,.flac,.ogg,.wma,.m4a # Allowed extensions seprated by comma
DISCORD_SCHEMA=true #Whether to return a Discord-compatible JSON response for uploads (Leave it true if you were using discord webhooks to upload)

MAX_FILE_SIZE=1048576          # Default max file size in bytes (e.g., 1MB)
MAX_FILE_SIZE_IMAGE=3145728     # Image max file size in bytes (e.g., 3MB)
MAX_FILE_SIZE_VIDEO=20971520     # Video max file size in bytes (e.g., 20MB)
MAX_FILE_SIZE_AUDIO=3145728      # Audio max file size in bytes (e.g., 3MB)
```

### 4. Place your SSL certificates in the `ssl` folder

Make sure your `ssl` folder contains the following files:
- `key.pem` (Private key)
- `cert.pem` (SSL certificate)
- `chain.pem` (CA chain certificate) (OPTIONAL)

If the `ssl` folder does not exist, the server will not start.

### 5. Run the server

Start the server using the following command:

```bash
node app.js
```

The server will be available over HTTPS at `https://<DOMAIN>:<PORT>`, where `<PORT>` is the port defined in your `.env` file.

### 6. Uploading Files

To upload files, send a `POST` request to the `/upload` endpoint with the file attached under the `files[]` field.

Example using **cURL**:

```bash
curl -X POST -F "files[]=@/path/to/your/filename.ext" https://<DOMAIN>:<PORT>/upload
```

And for replacing discord webhooks with this simply just replace it with `https://<DOMAIN>:<PORT>/upload`

If the upload is successful, you will receive a URL pointing to the uploaded file, either as a direct URL or as a Discord-compatible response, depending on the `DISCORD_SCHEMA` setting in your `.env`.

### 7. File Expiration

Uploaded files will be automatically deleted after the number of days set in `EXPIRATION_DAYS` in the `.env` file. The server will check and delete expired files daily at midnight.

### 8. Accessing Uploaded Files

You can access uploaded files via their generated URLs. For example:

```
https://<DOMAIN>:<PORT>/uploads/1632549212130-438193-filename.ext
```

If you're using the Discord-compatible schema, the response will contain a JSON object with an `attachments` array:

```json
{
  "attachments": [
    {
      "url": "https://<DOMAIN>:<PORT>/uploads/1632549212130-438193-filename.ext",
      "proxy_url": "https://<DOMAIN>:<PORT>/uploads/1632549212130-438193-filename.ext"
    }
  ]
}
```

## Troubleshooting

- **"SSL folder does not exist" error:** The SSL folder is required for HTTPS to work. Ensure that the `ssl` folder exists and contains valid SSL certificates.
- **"File type not allowed" error:** Ensure that the file you're uploading matches one of the allowed extensions defined in `ALLOWED_EXTENSIONS` in the `.env` file.
- **"File size exceeds limit" error:** Ensure that the file size does not exceed the `MAX_FILE_SIZE` defined in the `.env` file.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits
- [Express](https://expressjs.com/)
- [Multer](https://www.npmjs.com/package/multer)
- [Node Cron](https://www.npmjs.com/package/node-cron)

---
