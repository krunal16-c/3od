import { Controller, Get, Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { MarketplaceController } from './marketplace.controller.js';
import { InMemoryMarketplaceStore, MarketplaceStore } from './marketplace.store.js';
import { PrismaMarketplaceStore } from './prisma-marketplace-store.js';
import { R2StorageService } from './r2-storage.js';

@Controller()
class HealthController {
  @Get()
  health() { return { service: '3od-api', status: 'ok' }; }
}

@Module({
  controllers: [HealthController, MarketplaceController],
  providers: [
    R2StorageService,
    PrismaClient,
    {
      provide: MarketplaceStore,
      inject: [PrismaClient],
      useFactory: (prisma: PrismaClient) => process.env.NODE_ENV === 'test' || process.env.MARKETPLACE_STORE === 'memory' || (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'production')
        ? new InMemoryMarketplaceStore()
        : new PrismaMarketplaceStore(prisma),
    },
  ],
})
export class AppModule {}
