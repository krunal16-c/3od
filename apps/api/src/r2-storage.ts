import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getServerEnv } from '@3od/config/env/server';

@Injectable()
export class R2StorageService {
  async createUploadUrl(input: { key: string; contentType: string; byteSize: number }) {
    const env = getServerEnv();
    const client = new S3Client({
      region: 'auto',
      endpoint: env.R2_ENDPOINT,
      credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
      forcePathStyle: true,
    });
    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: input.key,
      ContentType: input.contentType,
      ContentLength: input.byteSize,
    });
    return getSignedUrl(client, command, { expiresIn: 300 });
  }
}
