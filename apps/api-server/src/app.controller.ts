import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@Controller('health')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHealth(): string {
    return this.appService.getHealth();
  }

  @Public()
  @Get('db')
  async getDatabaseHealth(): Promise<{ status: string; message: string }> {
    return this.appService.checkDatabaseHealth();
  }
}
