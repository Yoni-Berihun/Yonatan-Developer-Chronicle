import { v2 as cloudinary } from "cloudinary";
import { cloudinaryConfigured, env } from "../env.js";
import { HttpError } from "./http-error.js";

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export interface UploadedImage {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

export async function uploadImage(
  buffer: Buffer,
  options: { folder?: string; filename?: string } = {},
): Promise<UploadedImage> {
  if (!cloudinaryConfigured) {
    throw new HttpError(
      503,
      "Image uploads are not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
    );
  }

  const folder = options.folder
    ? `${env.CLOUDINARY_FOLDER}/${options.folder}`
    : env.CLOUDINARY_FOLDER;

  return new Promise<UploadedImage>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        overwrite: false,
        unique_filename: true,
        // Strip metadata and let Cloudinary pick the best format/quality.
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      },
      (error, result) => {
        if (error || !result) {
          reject(new HttpError(502, error?.message ?? "Upload to Cloudinary failed"));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      },
    );

    stream.end(buffer);
  });
}

export async function deleteImage(publicId: string): Promise<void> {
  if (!cloudinaryConfigured) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    // A failed remote delete should never block deleting our own record.
    console.warn(`Could not delete Cloudinary asset ${publicId}:`, error);
  }
}
