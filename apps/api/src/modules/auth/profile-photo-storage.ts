import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

type StorageConfig = {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

function storageConfig(): StorageConfig | null {
  const bucket = process.env.PROFILE_PHOTO_S3_BUCKET?.trim();
  const region = process.env.PROFILE_PHOTO_S3_REGION?.trim();
  const accessKeyId = process.env.PROFILE_PHOTO_S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.PROFILE_PHOTO_S3_SECRET_ACCESS_KEY?.trim();
  const endpoint = process.env.PROFILE_PHOTO_S3_ENDPOINT?.trim() || undefined;

  if (!bucket || !region || !accessKeyId || !secretAccessKey) return null;

  return {
    bucket,
    region,
    endpoint,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: process.env.PROFILE_PHOTO_S3_FORCE_PATH_STYLE?.trim().toLowerCase() === "true"
  };
}

function client(config: StorageConfig) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });
}

export function profilePhotoStorageConfigured() {
  return storageConfig() !== null;
}

export function validateProfilePhoto(contentType: string, fileSize: number) {
  if (!EXTENSIONS[contentType]) {
    throw new Error("unsupported_profile_photo_type");
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_PROFILE_PHOTO_BYTES) {
    throw new Error("invalid_profile_photo_size");
  }
}

export async function createProfilePhotoUpload(userId: string, contentType: string, fileSize: number) {
  validateProfilePhoto(contentType, fileSize);
  const config = storageConfig();
  if (!config) throw new Error("profile_photo_storage_not_configured");

  const extension = EXTENSIONS[contentType];
  const key = `profile-photos/${userId}/${randomUUID()}.${extension}`;
  const uploadUrl = await getSignedUrl(
    client(config),
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: contentType
    }),
    { expiresIn: 300 }
  );

  return { key, uploadUrl, expiresIn: 300 };
}

export async function verifyProfilePhotoUpload(userId: string, key: string) {
  const config = storageConfig();
  if (!config) throw new Error("profile_photo_storage_not_configured");

  const prefix = `profile-photos/${userId}/`;
  if (!key.startsWith(prefix)) throw new Error("invalid_profile_photo_key");

  const result = await client(config).send(new HeadObjectCommand({
    Bucket: config.bucket,
    Key: key
  }));

  const contentType = result.ContentType ?? "";
  const contentLength = Number(result.ContentLength ?? 0);
  validateProfilePhoto(contentType, contentLength);

  return { contentType, contentLength };
}

export async function createProfilePhotoDownloadUrl(key: string) {
  const config = storageConfig();
  if (!config) throw new Error("profile_photo_storage_not_configured");

  return getSignedUrl(
    client(config),
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key
    }),
    { expiresIn: 900 }
  );
}

export async function deleteProfilePhotoObject(key: string | null | undefined) {
  if (!key) return;
  const config = storageConfig();
  if (!config) return;

  await client(config).send(new DeleteObjectCommand({
    Bucket: config.bucket,
    Key: key
  }));
}
