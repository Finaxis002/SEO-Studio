import { v2 as cloudinary } from "cloudinary";

function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  return cloudinary;
}

export function uploadBuffer(buffer, filename, folder) {
  const client = configureCloudinary();
  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        folder: folder || process.env.CLOUDINARY_FOLDER || "seo-studio",
        resource_type: "auto",
        use_filename: true,
        unique_filename: true,
        filename_override: filename,
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    stream.end(buffer);
  });
}

export async function deleteAsset(publicId, resourceType = "image") {
  const client = configureCloudinary();
  return client.uploader.destroy(publicId, { resource_type: resourceType });
}
