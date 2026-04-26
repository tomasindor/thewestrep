export interface HeroPromoProductsConfig {
  topRow: string[];
  bottomRow: string[];
}

export const heroPromoProducts: HeroPromoProductsConfig = {
  topRow: [
    "encargue-buzo-01",
    "encargue-campera-02",
    "encargue-buzo-03",
    "encargue-campera-04",
    "encargue-buzo-05",
    "encargue-campera-06",
  ],
  bottomRow: [
    "encargue-pantalon-01",
    "encargue-pantalon-02",
    "encargue-pantalon-03",
    "encargue-pantalon-04",
    "encargue-pantalon-05",
    "encargue-pantalon-06",
  ],
};

export function isHeroPromoCurationEnabled(config: HeroPromoProductsConfig) {
  return config.topRow.length > 0 && config.bottomRow.length > 0;
}
