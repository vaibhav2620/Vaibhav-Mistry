const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { google } = require("googleapis");

const app = express();
const port = 3000;

// Load Google Service Account Credentials
const credentials = require("./service-account.json");

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
});
const drive = google.drive({ version: "v3", auth });

// Multer setup for handling file uploads
const upload = multer({ dest: "uploads/" });

// Google Drive Folder ID where images will be stored
const FOLDER_ID = "YOUR_GOOGLE_DRIVE_FOLDER_ID";

// API Route to Upload Image
app.post("/upload", upload.single("image"), async (req, res) => {
    try {
        const fileMetadata = {
            name: req.file.originalname,
            parents: [FOLDER_ID],
        };

        const media = {
            mimeType: req.file.mimetype,
            body: fs.createReadStream(req.file.path),
        };

        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: "id",
        });

        const fileUrl = `https://drive.google.com/uc?id=${file.data.id}`;

        // Remove temporary uploaded file
        fs.unlinkSync(req.file.path);

        res.json({ success: true, fileUrl });
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ success: false, message: "Upload failed" });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
