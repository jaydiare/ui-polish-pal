export type Lang = "en" | "es";

export const translations = {
  en: {
    // Navigation
    "nav.home": "Home",
    "nav.about": "About",
    "nav.blog": "Blog",
    "nav.marketIntel": "Market Intel",
    "nav.marketData": "Market Data",
    "nav.checklistIntel": "Checklist Intel",
    "nav.mlbLeaders": "MLB Leaders",
    "nav.shop": "Shop",
    "nav.contact": "Contact",
    "nav.visitStore": "Visit my eBay Store",
    "nav.openMenu": "Open menu",
    "nav.closeMenu": "Close menu",

    // Language switcher
    "lang.label": "Language",
    "lang.english": "English",
    "lang.spanish": "Español",

    // Hero
    "hero.lastUpdate": "Last update",
    "hero.titleA": "VZLA",
    "hero.titleB": "Sports Cards",
    "hero.titleC": "Index",
    "hero.subtitle":
      "eBay market data for Venezuelan athletes' sports cards. Track prices, stability scores, and market trends.",
    "hero.intro":
      "Every card below is backed by live eBay data, processed through our statistical pricing model, which removes extreme outliers to give you the most accurate average price. Stability scores measure how tightly listing prices agree with each other, helping you identify reliable investments vs speculative opportunities. Data updates on the last scan across 550+ athletes.",
    "hero.introStrong": "statistical pricing model",
    "hero.stabilityLead": "measures how tightly listing prices cluster around a common level.",
    "hero.stabilityScore": "Stability Score",
    "hero.stable": "Stable",
    "hero.stableDesc": "Strong agreement",
    "hero.active": "Active",
    "hero.activeDesc": "Normal activity",
    "hero.volatile": "Volatile",
    "hero.volatileDesc": "Price dispersion",
    "hero.unstable": "Unstable",
    "hero.unstableDesc": "High speculation",
    "hero.flipPotential": "Flip Potential",
    "hero.flipDesc":
      "Cards marked Volatile or Unstable may offer buy-low, sell-high opportunities due to wide price swings.",
    "hero.buyLow": "Buy Low",
    "hero.buyLowDesc":
      "Cards where the average sold price is below the current listing price, signaling potential bargains.",

    // Footer
    "footer.tagline":
      "Your Venezuelan athletes trading card index. Get real-time prices, stability insights, and smart budget tools for sports card collecting.",
    "footer.resources": "Resources",
    "footer.methodology": "Methodology & FAQ",
    "footer.howItWorks": "How It Works",
    "footer.ebayStore": "eBay Store",
    "footer.bcw": "BCW Supplies",
    "footer.facebookCommunity": "Facebook Community",
    "footer.marketMovers": "Market Movers",
    "footer.rights": "All rights reserved.",
    "footer.privacy": "Privacy Policy",
  },
  es: {
    // Navigation
    "nav.home": "Inicio",
    "nav.about": "Nosotros",
    "nav.blog": "Blog",
    "nav.marketIntel": "Inteligencia de Mercado",
    "nav.marketData": "Datos de Mercado",
    "nav.checklistIntel": "Análisis de Checklist",
    "nav.mlbLeaders": "Líderes MLB",
    "nav.shop": "Tienda",
    "nav.contact": "Contacto",
    "nav.visitStore": "Visita mi tienda de eBay",
    "nav.openMenu": "Abrir menú",
    "nav.closeMenu": "Cerrar menú",

    // Language switcher
    "lang.label": "Idioma",
    "lang.english": "English",
    "lang.spanish": "Español",

    // Hero
    "hero.lastUpdate": "Última actualización",
    "hero.titleA": "Índice de",
    "hero.titleB": "Cartas Deportivas",
    "hero.titleC": "VZLA",
    "hero.subtitle":
      "Datos del mercado de eBay para las cartas deportivas de atletas venezolanos. Sigue precios, puntajes de estabilidad y tendencias del mercado.",
    "hero.intro":
      "Cada carta que ves está respaldada por datos en vivo de eBay, procesados con nuestro modelo estadístico de precios, que elimina los valores extremos para darte el precio promedio más preciso. Los puntajes de estabilidad miden qué tan parecidos son los precios entre publicaciones, lo que te ayuda a identificar inversiones confiables frente a oportunidades especulativas. Los datos se actualizan con el último escaneo de más de 550 atletas.",
    "hero.introStrong": "modelo estadístico de precios",
    "hero.stabilityLead": "mide qué tan agrupados están los precios de las publicaciones alrededor de un nivel común.",
    "hero.stabilityScore": "Puntaje de Estabilidad",
    "hero.stable": "Estable",
    "hero.stableDesc": "Alta coincidencia",
    "hero.active": "Activo",
    "hero.activeDesc": "Actividad normal",
    "hero.volatile": "Volátil",
    "hero.volatileDesc": "Dispersión de precios",
    "hero.unstable": "Inestable",
    "hero.unstableDesc": "Alta especulación",
    "hero.flipPotential": "Potencial de Reventa",
    "hero.flipDesc":
      "Las cartas marcadas como Volátil o Inestable pueden ofrecer oportunidades de comprar barato y vender caro por sus amplias variaciones de precio.",
    "hero.buyLow": "Compra Baja",
    "hero.buyLowDesc":
      "Cartas donde el precio promedio de venta está por debajo del precio de publicación actual, lo que indica posibles gangas.",

    // Footer
    "footer.tagline":
      "Tu índice de cartas coleccionables de atletas venezolanos. Precios en tiempo real, análisis de estabilidad y herramientas de presupuesto para coleccionistas.",
    "footer.resources": "Recursos",
    "footer.methodology": "Metodología y Preguntas Frecuentes",
    "footer.howItWorks": "Cómo Funciona",
    "footer.ebayStore": "Tienda de eBay",
    "footer.bcw": "BCW Supplies",
    "footer.facebookCommunity": "Comunidad de Facebook",
    "footer.marketMovers": "Market Movers",
    "footer.rights": "Todos los derechos reservados.",
    "footer.privacy": "Política de Privacidad",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["en"];
