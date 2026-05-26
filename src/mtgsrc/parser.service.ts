import { Injectable } from '@nestjs/common';

export interface ParsedProduct {
  cardName: string;
  cardNumber: string;
  expansionCode: string;
  set: string | null;
  isFoil: boolean;
  isSurgeFoil: boolean;
  isBorderless: boolean;
  isExtendedArt: boolean;
  isPrerelease: boolean;
  isSerialized: boolean;
  isAlternateFrame: boolean;
  isShowcase: boolean;
}

@Injectable()
export class ParserService {
  parseProductName(productNameEn: string, cardNameOriginal?: string): ParsedProduct {
    const name = productNameEn || '';

    // Flags detection using regex for more flexibility
    const isFoil = /foil/i.test(name) || /【Foil】/i.test(name) || /SurgeFoil/i.test(name);
    const isSurgeFoil = /SurgeFoil/i.test(name) || /Surge.Foil/i.test(name);
    const isBorderless = /Borderless/i.test(name) || /■ボーダーレス■/.test(name);
    const isExtendedArt =
      /Alternate Frame/i.test(name) || /Extended Art/i.test(name) || /■拡張アート■/.test(name);
    const isPrerelease = /Prerelease/i.test(name) || /◆Prerelease◆/.test(name);
    const isSerialized = /serial number/i.test(name) || /serialized/i.test(name);
    const isAlternateFrame = /Alternate Frame/i.test(name);
    const isShowcase = /Showcase/i.test(name) || /■ショーケース■/.test(name);

    // Extract card number (451) or (WAR-211)
    const expansionCardMatch = name.match(/\(([A-Z0-9]+)-(\d+)\)/);
    let expansionCode = '';
    let cardNumber = '';

    if (expansionCardMatch) {
      expansionCode = expansionCardMatch[1];
      cardNumber = expansionCardMatch[2];
    } else {
      const cardNumberMatch = name.match(/\((\d+)\)/);
      cardNumber = cardNumberMatch ? cardNumberMatch[1] : '';
    }

    // Extract set from [LTR] - take the last occurrence as it is usually the set code
    const setMatches = name.match(/\[([^\]]+)\]/g);
    let set: string | null = null;
    if (setMatches) {
      const lastSet = setMatches[setMatches.length - 1];
      set = lastSet.replace(/[[\]]/g, '').trim();
    }

    if (!expansionCode && set) expansionCode = set;

    // Clean card name from 《Name》
    const cardNameMatch = name.match(/《([^》]+)》/);
    const cardName = cardNameMatch ? cardNameMatch[1].trim() : cardNameOriginal || '';

    return {
      cardName,
      cardNumber,
      expansionCode: expansionCode || '',
      set,
      isFoil,
      isSurgeFoil,
      isBorderless,
      isExtendedArt,
      isPrerelease,
      isSerialized,
      isAlternateFrame,
      isShowcase,
    };
  }
}
