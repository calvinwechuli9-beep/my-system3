const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const validType =
      file.mimetype === "application/pdf" || file.mimetype.startsWith("image/");
    if (!validType) return cb(new Error("Upload a PDF or image file."));
    cb(null, true);
  },
});

module.exports = { upload };
