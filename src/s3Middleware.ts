import dotenv from "dotenv";
dotenv.config();
import multer from "multer";
import crypto from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Request, Response, NextFunction } from "express";

// Configuração do S3
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Usa storage em memória (arquivo fica em RAM até enviar pro S3)
// const upload = multer({ storage: multer.memoryStorage() });

// Middleware para upload

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
