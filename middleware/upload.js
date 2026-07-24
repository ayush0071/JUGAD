const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const makeStorage = (subfolder) =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, `../uploads/${subfolder}`)),
    filename: (req, file, cb) => {
      const unique = crypto.randomBytes(16).toString('hex');
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${unique}${ext}`);
    },
  });

const ALLOWED_SOFTWARE_EXT = ['.exe', '.msi', '.dmg', '.pkg', '.zip', '.rar', '.7z', '.apk', '.appimage', '.deb', '.rpm'];
const softwareFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_SOFTWARE_EXT.includes(ext)) return cb(null, true);
  cb(new Error(`Unsupported file type: ${ext}`));
};

const ALLOWED_IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const imageFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_IMAGE_EXT.includes(ext)) return cb(null, true);
  cb(new Error(`Unsupported image type: ${ext}`));
};

exports.uploadSoftwareFile = multer({
  storage: makeStorage('software'),
  fileFilter: softwareFileFilter,
  limits: { fileSize: 500 * 1024 * 1024 },
});

exports.uploadCoverImage = multer({
  storage: makeStorage('covers'),
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

exports.uploadQrImage = multer({
  storage: makeStorage('qr'),
  fileFilter: imageFileFilter,
  limits: { fileSize: 3 * 1024 * 1024 },
});

exports.uploadDeveloperPhoto = multer({
  storage: makeStorage('developers'),
  fileFilter: imageFileFilter,
  limits: { fileSize: 3 * 1024 * 1024 },
});
