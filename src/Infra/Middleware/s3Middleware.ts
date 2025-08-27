import dotenv from "dotenv";
dotenv.config();

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Configuração do S3
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToS3(file: Express.Multer.File) {
  const key = `${Date.now()}_${file.originalname}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    // ACL: "public-read",
  });

  await s3.send(command);

  // Retorna a URL pública
  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}
