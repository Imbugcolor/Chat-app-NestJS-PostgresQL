import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryResponse } from './cloudinary.response';
import { ImageObject } from './types/imageObject.type';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const streamifier = require('streamifier');

@Injectable()
export class CloudinaryService {
  uploadFile(file: Express.Multer.File): Promise<CloudinaryResponse> {
    if (file.size > 1024 * 1024 * 25) {
      throw new BadRequestException('Please upload a file size less than 25mb');
    }
    // Check if the file is an image
    if (!file.mimetype.startsWith('image')) {
      throw new BadRequestException(
        'Sorry, this file is not an image, please try again',
      );
    }
    return new Promise<CloudinaryResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'chat-app-postgresql' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
  async uploadFiles(files: Express.Multer.File[]) {
    const images: ImageObject[] = [];
    await Promise.all(
      files.map(async (file) => {
        const response = await this.uploadFile(file);
        const { public_id, secure_url } = response;
        images.push({ public_id, url: secure_url });
      }),
    );
    return {
      msg: 'Upload Success!',
      images,
    };
  }

  async destroyFile(public_id: string) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    cloudinary.uploader.destroy(public_id, async (err, result) => {
      if (err) throw new BadRequestException();
      return `Deleted image public_id: ${public_id}`;
    });
  }

  async destroyFiles(public_ids: string[]) {
    await Promise.all(
      public_ids.map(async (id) => {
        await this.destroyFile(id);
      }),
    );
    return {
      msg: 'Delete success!',
    };
  }
}
