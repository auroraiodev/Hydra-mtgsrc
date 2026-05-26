import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
  BadGatewayException,
} from '@nestjs/common';
import axios from 'axios';
import { CurrencyService } from './currency.service';
import { ParserService } from './parser.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { PriceQueryDto } from './dto/price-query.dto';

const HARERUYA_LANG_MAP: Record<string, string> = {
  '1': 'JAPANESE',
  '2': 'ENGLISH',
  '3': 'FRENCH',
  '4': 'CHINESE',
  '5': 'FRENCH',
  '6': 'GERMAN',
  '7': 'ITALIAN',
  '8': 'KOREAN',
  '9': 'PORTUGUESE',
  '10': 'RUSSIAN',
  '11': 'SPANISH',
  '12': 'ENGLISH',
};

const LANG_ALIAS_MAP: Record<string, string> = {
  JP: 'JAPANESE',
  JA: 'JAPANESE',
  EN: 'ENGLISH',
  ENG: 'ENGLISH',
  FR: 'FRENCH',
  FRA: 'FRENCH',
  DE: 'GERMAN',
  GER: 'GERMAN',
  ES: 'SPANISH',
  SPA: 'SPANISH',
  PT: 'PORTUGUESE',
  POR: 'PORTUGUESE',
  RU: 'RUSSIAN',
  RUS: 'RUSSIAN',
  KO: 'KOREAN',
  KOR: 'KOREAN',
  ZH: 'CHINESE',
  CHI: 'CHINESE',
  IT: 'ITALIAN',
  ITA: 'ITALIAN',
};

function normalizeLang(lang: string): string {
  const upper = (lang || '').toUpperCase().trim();
  return LANG_ALIAS_MAP[upper] || upper;
}

const HARERUYA_API_URL: string =
  process.env.HARERUYA_API_URL ||
  'https://www.hareruyamtg.com/en/products/search/unisearch_api';
const HARERUYA_BASE_URL: string =
  process.env.HARERUYA_BASE_URL || 'https://www.hareruyamtg.com';

@Injectable()
export class MtgsrcService {
  private readonly logger = new Logger(MtgsrcService.name);
  private readonly baseUrl = HARERUYA_API_URL;

  constructor(
    private readonly currencyService: CurrencyService,
    private readonly parserService: ParserService,
  ) {}

  private htmlResponseCount = 0;
  private maintenanceModeStartTime: number | null = null;
  private readonly MAINTENANCE_THRESHOLD = 3;
  private readonly MAINTENANCE_COOLDOWN_MS = 5 * 60 * 1000;

  private getBrowserHeaders(refererUrl?: string): Record<string, string> {
    return {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      Referer: refererUrl || `${HARERUYA_BASE_URL}/en/products/search`,
      Origin: HARERUYA_BASE_URL,
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      'X-Requested-With': 'XMLHttpRequest',
    };
  }

  async search(params: {
    cardName: string;
    page?: number;
    rows?: number;
    priceFilter?: string;
    language?: string;
    condition?: string;
    foil?: boolean;
    sort?: string;
    includeOutOfStock?: boolean;
    tax?: number;
    profit?: number;
  }) {
    // Maintenance check
    if (this.maintenanceModeStartTime !== null) {
      const timeSinceMaintenance = Date.now() - this.maintenanceModeStartTime;
      if (timeSinceMaintenance < this.MAINTENANCE_COOLDOWN_MS) {
        this.logger.warn(
          `Search requested while in maintenance cooldown (${Math.ceil((this.MAINTENANCE_COOLDOWN_MS - timeSinceMaintenance) / 1000)}s left)`,
        );
        throw new BadRequestException(
          'Importation API is currently under maintenance. Please try again later.',
        );
      } else {
        this.logger.log('Maintenance cooldown expired, resetting counters');
        this.maintenanceModeStartTime = null;
        this.htmlResponseCount = 0;
      }
    }

    const {
      cardName,
      page = 1,
      rows = 60,
      priceFilter = '1~*',
      language,
      condition,
      foil,
      sort,
      includeOutOfStock,
    } = params;

    const apiParams = new URLSearchParams({
      kw: cardName.trim(),
      rows: rows.toString(),
      page: page.toString(),
      'fq.category_id': '1',
      user:
        process.env.IMPORTATION_API_USER_ID ||
        '3adcb9a90ba991e0b4b9222f901b884a2c2e30e3870961335e22a57305f19cc4',
    });

    if (!includeOutOfStock) apiParams.set('fq.price', priceFilter);
    if (language) apiParams.set('fq.language', language);
    if (condition) apiParams.set('fq.card_condition', condition);
    if (foil) apiParams.set('fq.foil_flg', '1');
    if (sort) apiParams.set('sort', sort);

    const url = `${this.baseUrl}?${apiParams.toString()}`;

    try {
      this.logger.debug(`Fetching from Hareruya: ${url}`);
      const response = await axios.get(url, {
        headers: this.getBrowserHeaders(
          `${HARERUYA_BASE_URL}/en/products/search?product=${encodeURIComponent(cardName)}`,
        ),
        responseType: 'text',
        timeout: 10000, // 10s timeout
      });

      const responseText = response.data;
      const isHtml =
        responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html');

      if (isHtml) {
        const snippet = responseText.substring(0, 100).replace(/\n/g, ' ');
        this.logger.error(`Received HTML instead of JSON. Snippet: ${snippet}`);

        this.htmlResponseCount++;
        if (this.htmlResponseCount >= this.MAINTENANCE_THRESHOLD) {
          this.logger.warn(
            `Maintenance threshold reached (${this.MAINTENANCE_THRESHOLD}). Entering cooldown mode.`,
          );
          this.maintenanceModeStartTime = Date.now();
        }
        throw new Error('Received HTML response (possible maintenance or bot detection)');
      }

      this.htmlResponseCount = 0;
      const apiData = typeof responseText === 'string' ? JSON.parse(responseText) : responseText;

      // Add pagination object
      const numFound = apiData.response?.numFound || 0;
      const totalPages = Math.ceil(numFound / rows);

      return {
        ...apiData,
        pagination: {
          totalItems: numFound,
          itemsPerPage: rows,
          currentPage: page,
          totalPages: totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      const errorMsg = error.response
        ? `API Error (${error.response.status}): ${JSON.stringify(error.response.data)}`
        : `Network Error: ${error.message}`;

      this.logger.error(`Error searching Importation: ${errorMsg}`);
      throw new BadRequestException(errorMsg);
    }
  }

  async getCards(query: SearchQueryDto) {
    const { tax = 0, profit = 0, page = 1 } = query;
    const rows = query.rows || 30;

    let exchangeRate: number;
    try {
      exchangeRate = await this.currencyService.getExchangeRate();
    } catch {
      throw new ServiceUnavailableException('Exchange rate service unavailable');
    }

    let searchData: any;
    try {
      searchData = await this.search({ ...query, rows });
    } catch {
      throw new BadGatewayException('Search service failed');
    }

    const docs = searchData.response?.docs || [];

    const results = await Promise.all(
      docs.map(async (doc: any) => {
        let parsed: any;
        try {
          parsed = this.parserService.parseProductName(doc.product_name_en, doc.card_name);
        } catch {
          parsed = {
            cardName: null,
            cardNumber: null,
            expansionCode: null,
            set: null,
            isFoil: null,
            isSurgeFoil: null,
            isBorderless: null,
            isExtendedArt: null,
            isPrerelease: null,
            isSerialized: null,
            isAlternateFrame: null,
            isShowcase: null,
          };
        }

        let priceBase: number | null = null;
        let priceImportation: number | null = null;
        let priceLocal: number | null = null;

        const rawJpy = parseInt(doc.price);
        if (!isNaN(rawJpy)) {
          const baseMxn = rawJpy * exchangeRate;
          priceBase = Math.round(baseMxn * 100) / 100;
          priceImportation = Math.round((baseMxn + baseMxn * tax + baseMxn * profit) * 100) / 100;
          priceLocal = Math.round((baseMxn + baseMxn * profit) * 100) / 100;
        }

        return {
          product: doc.product,
          price: parseInt(doc.price) || 0,
          foil_flg: doc.foil_flg,
          card_name: doc.card_name,
          product_name_en: doc.product_name_en,
          language: doc.language,
          price_mxn: priceBase,
          price_mxn_importation: priceImportation,
          price_mxn_local: priceLocal,
          image_url: doc.image_url,
          stock: parseInt(doc.stock) || 0,
          tcg: 'Magic',
          category: 'SINGLES',
          ...parsed,
        };
      }),
    );

    return {
      pagination: {
        page,
        totalItems: searchData.pagination?.totalItems || 0,
        itemsPerPage: rows,
        totalPages: searchData.pagination?.totalPages || 0,
        hasNextPage: searchData.pagination?.hasNextPage || false,
      },
      exchangeRate,
      results,
    };
  }

  async getPriceForVariant(dto: PriceQueryDto) {
    const { cardName, importationId, isFoil, language, tax, profit } = dto;

    const exchangeRate = await this.currencyService.getExchangeRate();

    let searchData: any;
    try {
      searchData = await this.search({ cardName, rows: 200, includeOutOfStock: true });
    } catch {
      throw new BadGatewayException('Search service failed');
    }

    const docs: any[] = searchData.response?.docs || [];
    const requestedLang = normalizeLang(language);

    const langMatch = (doc: any) => {
      const docLang = HARERUYA_LANG_MAP[doc.language] || doc.language?.toUpperCase();
      return docLang === requestedLang;
    };
    const foilMatch = (doc: any) => (doc.foil_flg === '1') === isFoil;

    // Primary: exact ID + foil + language
    let match = docs.find(
      (d) => String(d.product) === importationId && foilMatch(d) && langMatch(d),
    );

    // Fallback: foil + language only (importationId may have changed)
    if (!match) {
      match = docs.find((d) => foilMatch(d) && langMatch(d));
    }

    if (!match) return null;

    const rawJpy = parseInt(match.price) || 0;
    const baseMxn = rawJpy * exchangeRate;
    const price_mxn = Math.round(baseMxn * 100) / 100;
    const price_mxn_importation =
      Math.round((baseMxn + baseMxn * tax + baseMxn * profit) * 100) / 100;
    const price_mxn_local = Math.round((baseMxn + baseMxn * profit) * 100) / 100;

    const parsed = (() => {
      try {
        return this.parserService.parseProductName(match.product_name_en, match.card_name);
      } catch {
        return {};
      }
    })();

    return {
      product: match.product,
      price: rawJpy,
      foil_flg: match.foil_flg,
      card_name: match.card_name,
      product_name_en: match.product_name_en,
      language: match.language,
      price_mxn,
      price_mxn_importation,
      price_mxn_local,
      image_url: match.image_url,
      stock: parseInt(match.stock) || 0,
      exchangeRate,
      ...parsed,
    };
  }
}
