import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private exchangeRate: number = 0.12; // Fallback razonable
  private lastUpdate: number = 0;
  private readonly CACHE_TTL = 3600 * 1000; // 1 hora

  async getExchangeRate(): Promise<number> {
    if (Date.now() - this.lastUpdate > this.CACHE_TTL) {
      await this.refreshExchangeRate();
    }
    return this.exchangeRate;
  }

  private async refreshExchangeRate(): Promise<void> {
    try {
      const response = await axios.get('https://open.er-api.com/v6/latest/JPY');

      if (response.data && response.data.result === 'success' && response.data.rates?.MXN) {
        this.exchangeRate = response.data.rates.MXN;
        this.lastUpdate = Date.now();
      }
    } catch (error) {
      this.logger.error(`Failed to fetch exchange rate: ${error.message}`);
      // Mantenemos el último valor conocido o el fallback
    }
  }

  async convertJPYtoMXN(jpyAmount: number, tax: number = 0, profit: number = 0): Promise<number> {
    const rate = await this.getExchangeRate();
    const rawMXN = jpyAmount * rate;

    // Formula: (Base * (1 + Tax)) * (1 + Profit)
    const withTax = rawMXN * (1 + tax);
    const finalMXN = withTax * (1 + profit);

    return Math.round(finalMXN * 100) / 100;
  }
}
