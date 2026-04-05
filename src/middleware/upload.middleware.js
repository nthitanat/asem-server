const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { asyncHandler } = require('./errorHandler.middleware');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const IMAGE_SPECS = {
  thumbnail: { width: 300, height: 200 },
  banner: { width: 1200, height: 400 },
  photo: { width: 1200, height: 800 }
};

/**
 * Multer file filter — field-aware: allows images for image fields, PDF for pdfFile field
 */
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'pdfFile') {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      const error = new Error(`Invalid file type: ${file.mimetype}. Only PDF files are allowed for the pdfFile field.`);
      error.statusCode = 400;
      cb(error, false);
    }
  } else {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const error = new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, and WebP images are allowed.`);
      error.statusCode = 400;
      cb(error, false);
    }
  }
};

/**
 * Multer instance with memory storage
 * Image fields and pdfFile field are all optional
 */
const uploadFields = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_SIZE },
  fileFilter
}).fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
  { name: 'photo', maxCount: 1 },
  { name: 'pdfFile', maxCount: 1 }
]);

/**
 * Process uploaded image buffers with sharp and write to temp directory.
 * Also handles PDF files (written directly without processing).
 * Attaches req.tempImagePaths = { thumbnailPath?, bannerPath?, photoPath?, pdfPath? }
 */
const processImages = asyncHandler(async (req, res, next) => {
  req.tempImagePaths = {};

  if (!req.files || Object.keys(req.files).length === 0) {
    return next();
  }

  const tmpDir = path.join(__dirname, '../../uploads/tmp', `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const imageFields = ['thumbnail', 'banner', 'photo'];

  for (const field of imageFields) {
    if (req.files[field] && req.files[field][0]) {
      const file = req.files[field][0];
      const spec = IMAGE_SPECS[field];
      const outputPath = path.join(tmpDir, `${field}.webp`);

      await sharp(file.buffer)
        .resize(spec.width, spec.height, { fit: 'cover' })
        .webp({ quality: 85 })
        .toFile(outputPath);

      req.tempImagePaths[`${field}Path`] = outputPath;
    }
  }

  // Handle PDF file (write buffer directly, no processing)
  if (req.files.pdfFile && req.files.pdfFile[0]) {
    const pdfFile = req.files.pdfFile[0];
    const outputPath = path.join(tmpDir, 'document.pdf');
    fs.writeFileSync(outputPath, pdfFile.buffer);
    req.tempImagePaths.pdfPath = outputPath;
  }

  next();
});

module.exports = { uploadFields, processImages };
