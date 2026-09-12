import * as fs from 'fs';
import {
  Controller,
  Get,
  Head,
  Param,
  Headers,
  Res,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { type Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { PublicMediaService } from './public-media.service';
import { MediaStorageService } from './media-storage.service';
import {
  parseSingleByteRange,
  RangeNotSatisfiableError,
} from './media-stream-range';

@Public()
@Controller({ path: 'invitations/public', version: '1' })
export class PublicMediaController {
  private readonly logger = new Logger(PublicMediaController.name);

  constructor(
    private readonly publicMediaService: PublicMediaService,
    private readonly storageService: MediaStorageService,
  ) {}

  private async handleRequest(
    uniqueCode: string,
    mediaId: string,
    rangeHeader: string | undefined,
    res: Response,
    isHead: boolean,
  ) {
    const { key, mimeType } = await this.publicMediaService.resolveMedia(
      uniqueCode,
      mediaId,
    );

    let stat: fs.Stats;
    try {
      stat = await this.storageService.getFileStat(key);
    } catch (e) {
      const error = e as NodeJS.ErrnoException;
      if (error.code === 'ENOENT') {
        this.logger.error(`Physical file missing for media key: ${key}`);
        throw new NotFoundException('Media not found');
      }
      this.logger.error(
        `Unexpected storage error for key: ${key}`,
        error.stack,
      );
      throw new InternalServerErrorException('Internal server error');
    }

    const fileSize = stat.size;

    let range: { start: number; end: number } | null = null;
    try {
      range = parseSingleByteRange(rangeHeader, fileSize);
    } catch (e) {
      const error = e as Error;
      if (error instanceof RangeNotSatisfiableError) {
        res.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);
        res.header('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }
      throw error;
    }

    res.header('Content-Type', mimeType);
    res.header('Accept-Ranges', 'bytes');
    res.header(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate',
    );
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('Content-Disposition', 'inline');

    if (range) {
      const { start, end } = range;
      const chunkSize = end - start + 1;
      res.status(HttpStatus.PARTIAL_CONTENT);
      res.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.header('Content-Length', chunkSize.toString());

      if (isHead) {
        return res.end();
      }

      const stream = this.storageService.createReadStream(key, { start, end });
      stream.on('error', (e) => {
        const err = e;
        this.logger.error(`Stream error for key: ${key}`, err.message);
        if (!res.headersSent) {
          res.status(HttpStatus.INTERNAL_SERVER_ERROR).end();
        } else {
          res.end();
        }
      });
      return stream.pipe(res);
    } else {
      res.status(HttpStatus.OK);
      res.header('Content-Length', fileSize.toString());

      if (isHead) {
        return res.end();
      }

      const stream = this.storageService.createReadStream(key);
      stream.on('error', (e) => {
        const err = e;
        this.logger.error(`Stream error for key: ${key}`, err.message);
        if (!res.headersSent) {
          res.status(HttpStatus.INTERNAL_SERVER_ERROR).end();
        } else {
          res.end();
        }
      });
      return stream.pipe(res);
    }
  }

  @Get(':uniqueCode/media/:mediaId')
  async getMedia(
    @Param('uniqueCode') uniqueCode: string,
    @Param('mediaId') mediaId: string,
    @Headers('range') rangeHeader: string,
    @Res() res: Response,
  ) {
    return this.handleRequest(uniqueCode, mediaId, rangeHeader, res, false);
  }

  @Head(':uniqueCode/media/:mediaId')
  async headMedia(
    @Param('uniqueCode') uniqueCode: string,
    @Param('mediaId') mediaId: string,
    @Headers('range') rangeHeader: string,
    @Res() res: Response,
  ) {
    return this.handleRequest(uniqueCode, mediaId, rangeHeader, res, true);
  }
}
