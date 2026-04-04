const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { asyncHandler } = require('./errorHandler.middleware');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const IMAGE_SPECS = {
  thumbnail: { width: 300, height: 200 },
  banner: { width: 1200, height: 400 },
  photo: { width: 1200, height: 800 }
};

/**
 * Multer file filter — whitelist image MIME types only
 */
const imageOnly = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, and WebP images are allowed.`);
    error.statusCode = 400;
    cb(error, false);
  }
};

/**
 * Multer instance with memory storage
 * All three image fields are optional
 */
const uploadFields = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageOnly
}).fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
  { name: 'photo', maxCount: 1 }
]);

/**
 * Process uploaded image buffers with sharp and write to temp directory.
 * Attaches req.tempImagePaths = { thumbnailPath?, bannerPath?, photoPath? }
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

  next();
});

module.exports = { uploadFields, processImages };
