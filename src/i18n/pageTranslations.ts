// Page-level copy for About, Methodology and Blog.
// Kept separate from the core UI dictionary to keep files readable.

export const pageTranslations = {
  en: {
    // ── About ──
    "about.eyebrow": "ABOUT",
    "about.subtitle":
      "The market intelligence platform tracking 550+ Venezuelan athletes' trading cards across baseball, soccer, basketball, MMA, and tennis, built by collectors, for collectors.",
    "about.story.title": "Our Story",
    "about.story.p1":
      "In Venezuela, many of us grew up trading sports cards, especially baseball cards, and collecting World Cup sticker albums. We remember the excitement of racing to complete an album before kickoff and the pride of finally finishing it.",
    "about.story.p2":
      "For a long time, we believed these collectibles were only sentimental. Today, we understand something more. Sports cards and memorabilia can hold real value over time, especially when properly preserved and cared for.",
    "about.story.p3a": "This is how, in September of 2023, we decided to embark on this journey and open the store ",
    "about.story.p3b":
      ". We started growing our personal collection and selling valuable cards we had no idea were worth so much after holding them for so many years.",
    "about.story.p4":
      "What began as a personal hobby quickly grew into something bigger. We realized that there was no dedicated platform for tracking the market value of Venezuelan athletes' sports cards. Collectors had to piece together information from scattered eBay searches, social media groups, and word of mouth. There was no single source of truth, no price index, no stability scores, no way to compare raw vs graded values across hundreds of athletes at once.",
    "about.story.p5":
      "So we built one. VZLA Sports Elite started as a simple spreadsheet tracking a handful of players. Today it's a full-stack market intelligence platform with 15+ automated data pipelines, statistical pricing models, and analytics covering every major sport where Venezuelan athletes compete.",

    "about.believe.title": "What We Believe",
    "about.believe.p1":
      "For many Venezuelans, sports cards are simply memories. Yet behind every card lies real potential. When condition, rarity, and demand align, collectibles become assets.",
    "about.believe.p2":
      "At VZLA Sports Elite, knowledge is what empowers Venezuelan buyers and collectors around the world who follow Venezuelan athletes to make informed, confident decisions.",
    "about.mission.title": "Our Mission",
    "about.mission.p1":
      "VZLA Sports Elite was created to make it easy for Venezuelans around the world to discover and support their favorite hometown athletes.",
    "about.mission.p2":
      "We also aim to help buyers from Venezuela and collectors worldwide who are passionate about Venezuelan athletes find the cards and memorabilia they're looking for.",
    "about.mission.p3":
      "Beyond simply showcasing athletes, our mission is to share knowledge about this hobby and help collectors understand how to preserve and protect the long-term value of their collections.",
    "about.why.title": "Why It Matters",
    "about.why.p1":
      "Whether you started collecting recently, have been doing it quietly for many years, inherited a large collection from your father or grandfather, or received cards from a friend, your collection has potential.",
    "about.why.p2":
      "We want to help you collect with confidence, understanding what your cards are worth, when to buy, when to hold, and how to protect what you have.",

    "about.data.title": "How Our Data Works",
    "about.data.intro":
      "Transparency is core to what we do. Every number on this site is backed by real eBay market data, processed through automated pipelines, and validated using robust statistical methods. Here's how it all comes together:",
    "about.data.1.title": "15+ Automated Pipelines",
    "about.data.1.desc":
      "GitHub Actions workflows run on schedule to scan eBay listings, track prices, update PSA/BGS population data, and snapshot historical trends. No manual data entry, every number is programmatically sourced and verified.",
    "about.data.2.title": "Taguchi Statistical Pricing",
    "about.data.2.desc":
      "We don't use simple averages. Our Taguchi Winsorized Mean removes extreme outliers (top and bottom 10%) before calculating prices, giving you a more accurate picture of what cards actually cost, not what one outlier listing says.",
    "about.data.3.title": "Stability & Signal Scores",
    "about.data.3.desc":
      "Every athlete gets a Coefficient of Variation (CV) stability score and a Signal-to-Noise ratio measured in decibels. These tell you how predictable an athlete's pricing is, essential for identifying reliable investments vs speculative flips.",
    "about.data.4.title": "Multi-Source Verification",
    "about.data.4.desc":
      "Prices are cross-referenced across eBay US and Canada, raw and graded markets, and PSA population reports. A 6-variant name normalization strategy ensures we match the right cards to the right athletes every time.",
    "about.data.5.title": "Snapshots & History",
    "about.data.5.desc":
      "We take regular snapshots of every athlete's pricing data, building a historical record that powers sparkline trends, market index calculations, and the bi-weekly market analysis reports you see on the homepage.",
    "about.data.6.title": "ISO 9241 UX Standards",
    "about.data.6.desc":
      "Our interface follows ISO 9241 usability guidelines, the international standard for human-computer interaction. This means WCAG-compliant contrast ratios, keyboard-accessible navigation, reduced-motion support, and search/filter layouts designed for efficiency and minimal cognitive load.",
    "about.data.7.title": "Resilient by Design",
    "about.data.7.desc":
      "Every pipeline includes exponential backoff for API failures, batch checkpointing to resume after crashes, and rebase-safe Git commits. If something goes wrong at 3 AM, the system recovers automatically without losing data.",
    "about.data.moreA": "Want the full technical deep-dive? Check out our ",
    "about.data.moreLink": "How It Works",
    "about.data.moreB": " page.",

    "about.community.title": "Join the Community",
    "about.community.p1":
      "VZLA Sports Elite isn't just a data platform, it's a growing community of Venezuelan collectors, investors, and sports fans who share a passion for preserving and celebrating our athletic heritage through cards.",
    "about.community.p2a":
      "Whether you're looking to learn about professional grading, understand how to protect your collection's value, find undervalued cards before the market catches on, or simply connect with other Venezuelans who love this hobby, ",
    "about.community.link": "join our Facebook community",
    "about.community.p2b": " and be part of the movement.",

    "about.faq.title": "Frequently Asked Questions",
    "about.faq.1.q": "How often is the data updated?",
    "about.faq.1.a":
      "Our automated pipelines run on schedule. eBay listing prices and athlete rosters are refreshed on the last scan. PSA and Beckett population data is updated on a regular schedule, and the bi-weekly market analysis report runs on the 1st and 15th of each month.",
    "about.faq.2.q": "What sports do you cover?",
    "about.faq.2.a":
      "We track Venezuelan athletes across baseball (MLB, minor leagues, and LVBP), soccer (MLS and international), basketball (NBA and Superliga), tennis, and boxing. Baseball is our largest category with 490+ athletes tracked.",
    "about.faq.3.q": "What does 'Taguchi Winsorized Mean' mean?",
    "about.faq.3.a":
      "It's a statistical method that removes extreme outliers (the highest and lowest 10% of prices) before calculating an average. This gives you a much more realistic price than a simple average, which can be skewed by a single very expensive or very cheap listing.",
    "about.faq.4.q": "What are the investment signals (Buy Low, Flip Potential, etc.)?",
    "about.faq.4.a":
      "These are data-driven indicators calculated from our pricing models. 'Buy Low' flags cards priced below their reference level, a potential bargain. 'Flip Potential' flags volatile cards with wide price swings. 'Signal Strength' uses the Taguchi S/N ratio to measure how predictable pricing is. These are informational tools, not financial advice.",
    "about.faq.5.q": "Can I suggest an athlete to add?",
    "about.faq.5.a":
      "Absolutely! We're always expanding our roster. Reach out through our Facebook community or eBay store and let us know which Venezuelan athletes you'd like to see tracked.",
    "about.faq.6.q": "Is this financial advice?",
    "about.faq.6.a":
      "No. All investment signals, price indexes, ROI calculations, and market analysis on this site are for informational purposes only and do not constitute financial or professional advice. Please read our full disclaimer on our Privacy Policy page.",

    // ── Methodology ──
    "methodology.back": "← Back to Home",
    "methodology.title": "Methodology & FAQ",
    "methodology.subtitle":
      "How we collect, process, and deliver accurate market data for 550+ Venezuelan athletes' trading cards, and answers to your most common questions.",
    "methodology.approach.title": "Our Data Collection Approach",
    "methodology.approach.p1":
      "**15+ automated pipelines** scan eBay marketplaces for Venezuelan athletes' sports card listings. These workflows run on staggered schedules to avoid API rate limits, collecting raw data from multiple eBay domains including the US, Canadian, and international marketplaces.",
    "methodology.approach.p2":
      "The raw data passes through a rigorous cleaning process. First, we match listing titles against our database of 550+ athlete names, handling accent marks, alternate spellings, and nickname variations. Then, four independent filter layers remove junk listings: bulk lots, reprints, digital cards, stickers, and damaged items. Only legitimate, properly identified single-card listings survive this gauntlet.",
    "methodology.approach.p3":
      "Once filtered, prices are processed using the **Taguchi Winsorized Mean**, a statistical method that trims the top and bottom 20% of extreme prices before averaging. This produces market prices that reflect what collectors actually pay, not what outlier listings distort the picture to look like.",
    "methodology.stats.title": "Statistical Methods",
    "methodology.stats.p1":
      "Traditional price averages are misleading for sports cards. A simple mean of eBay listings would include $0.99 bulk lots alongside $500 graded gems, producing a number that represents neither category. Our approach addresses this with three complementary techniques:",
    "methodology.stats.p2":
      "**1. Taguchi Winsorized Mean:** We sort all prices, trim the most extreme 20% from each end, replace trimmed values with the nearest surviving value (winsorization), and compute the mean. Borrowed from industrial quality engineering, this method is specifically designed for datasets with heavy-tailed distributions, exactly what eBay price data looks like.",
    "methodology.stats.p3":
      "**2. Coefficient of Variation (CV):** Standard deviation divided by mean, expressed as a percentage. This single number tells you how much price agreement exists in the market. A CV of 10% means listings are tightly clustered, strong consensus on value. A CV of 50% means prices are all over the map, the \"average\" is less meaningful.",
    "methodology.stats.p4":
      "**3. Sample Size Transparency:** Every price on the platform shows how many listings contributed to the average. An average from 3 listings is fundamentally different from an average from 30. We display this count so collectors can judge reliability for themselves.",
    "methodology.quality.title": "Data Quality & Reliability",
    "methodology.quality.p1":
      "In a data platform, bad data is worse than no data. A wrong price looks correct, users see a number and make decisions based on it. Our system treats data quality as a first-class monitoring concern, not an afterthought.",
    "methodology.quality.p2":
      "**Four-layer filtering** provides defense in depth: API-level category filters, title-based grading detection with regex pattern matching, junk title exclusion for bulk lots and non-card items, and condition blocklists to exclude damaged or altered cards. If any single layer fails, the others still catch most contamination.",
    "methodology.quality.p3":
      "**Anomaly detection** runs during every bi-weekly analysis cycle. Athletes with CVs above 100% or price changes exceeding 50% are automatically flagged for review. These anomalies often reveal upstream data issues, a changed eBay HTML structure, a failed API filter, or a new type of junk listing that our patterns haven't seen before.",
    "methodology.quality.p4":
      "**Stability badges** surface data quality directly to users. Rather than hiding uncertainty, we show it: \"Stable,\" \"Active,\" \"Volatile,\" and \"Unstable\" badges translate technical CV values into actionable signals that help collectors decide how much trust to place in any given price.",
    "methodology.pipeline.title": "Pipeline Architecture",
    "methodology.pipeline.p1":
      "The platform runs on **15+ GitHub Actions workflows** that operate like a team of research assistants who never sleep. Each workflow is responsible for a specific data domain: eBay raw listings, eBay graded listings, PSA population data, Beckett grading data, SGC population reports, and market analysis.",
    "methodology.pipeline.p2":
      "Workflows run on staggered cron schedules to avoid API rate limits and Git merge conflicts. An eBay scan starts at midnight UTC, grading data refreshes at 6 AM, and historical snapshots consolidate at noon. Each workflow includes progress tracking, if interrupted, it resumes from where it left off rather than restarting from scratch.",
    "methodology.pipeline.p3":
      "All data flows through Git version control, which means every price change is historically tracked, every data point is auditable, and the system can recover from any failure by rolling back to a known good state. Weekly snapshots consolidate all six data sources into a single unified file that powers the analytics dashboard.",
    "methodology.faq.title": "Frequently Asked Questions",
    "methodology.faq.1.q": "How often are prices updated?",
    "methodology.faq.1.a":
      "eBay listing averages refresh on the last scan through automated pipelines. PSA and BGS population data refreshes on a weekly schedule. The bi-weekly market analysis report runs on the 1st and 15th of each month.",
    "methodology.faq.2.q": "What is the Taguchi Winsorized Mean?",
    "methodology.faq.2.a":
      "It's a statistical method borrowed from manufacturing quality control. We sort all listing prices, remove the top and bottom 20% (extreme outliers like $0.99 bulk lots or $10,000 rare finds), replace trimmed values with the nearest surviving value, and compute the mean. This gives you a price that represents what a typical card actually costs, not skewed by fire-sale listings or speculative moonshots.",
    "methodology.faq.3.q": "What does the Stability Score mean?",
    "methodology.faq.3.a":
      "The Stability Score is based on the Coefficient of Variation (CV), standard deviation divided by mean, expressed as a percentage. 'Stable' (0-10%) means strong price agreement among listings. 'Active' (10-20%) indicates normal market activity. 'Volatile' (20-35%) shows meaningful price dispersion. 'Unstable' (35%+) signals high speculation or data noise, treat these averages with caution.",
    "methodology.faq.4.q": "How many athletes do you track?",
    "methodology.faq.4.a":
      "Over 550 Venezuelan athletes across baseball (MLB, MiLB), soccer (MLS, La Liga, Serie A, Ligue 1, Bundesliga), basketball (NBA), tennis (WTA/ATP), BMX, track & field, and bowling. The roster updates monthly from multiple sports data APIs.",
    "methodology.faq.5.q": "How do you filter out junk listings?",
    "methodology.faq.5.a":
      "We use four independent filter layers: (1) API-level category and grading filters, (2) title-based detection for graded cards using tight regex patterns, (3) junk title exclusion for bulk lots, reprints, stickers, and digital cards, and (4) condition blocklists to exclude poor, damaged, or altered cards. Each layer catches what the others miss, defense in depth.",
    "methodology.faq.6.q": "What is Flip Potential?",
    "methodology.faq.6.a":
      "Cards marked as 'Volatile' or 'Unstable' may offer buy-low, sell-high opportunities because of wide price swings. Flip Potential is an informational signal, not financial advice. Always do your own research before making purchasing decisions.",
    "methodology.faq.7.q": "How do you handle eBay API failures?",
    "methodology.faq.7.a":
      "Our pipelines use a three-layer fallback chain: (1) GitHub Raw URLs serve the latest committed data, (2) local copies bundled with the frontend provide a fallback if GitHub is unavailable, (3) PostgreSQL database snapshots serve as disaster recovery. If any layer fails, the next takes over transparently.",
    "methodology.faq.8.q": "Can I suggest an athlete to track?",
    "methodology.faq.8.a":
      "Absolutely! Use the feedback form in the navigation menu or join our Facebook community. We regularly add new athletes based on collector interest and market activity.",
    "methodology.cta.title": "Want to Learn More?",
    "methodology.cta.desc":
      "Explore our detailed technical guide on how the entire data pipeline works, from eBay API queries to the statistical models that power every price you see.",
    "methodology.cta.howItWorks": "How It Works →",
    "methodology.cta.blog": "Read Our Blog →",

    // ── Blog ──
    "blog.title": "Blog",
    "blog.subtitle": "Market insights, top sales, and more.",
    "blog.empty": "No posts yet.",
    "blog.articlesInEnglish": "Articles are published in English.",
  },

  es: {
    // ── About ──
    "about.eyebrow": "NOSOTROS",
    "about.subtitle":
      "La plataforma de inteligencia de mercado que sigue las cartas de más de 550 atletas venezolanos en béisbol, fútbol, baloncesto, MMA y tenis, hecha por coleccionistas, para coleccionistas.",
    "about.story.title": "Nuestra Historia",
    "about.story.p1":
      "En Venezuela, muchos de nosotros crecimos intercambiando cartas deportivas, sobre todo de béisbol, y llenando álbumes de barajitas del Mundial. Recordamos la emoción de correr para completar el álbum antes del pitazo inicial y el orgullo de por fin terminarlo.",
    "about.story.p2":
      "Durante mucho tiempo creímos que estos coleccionables solo tenían valor sentimental. Hoy entendemos algo más. Las cartas deportivas y los artículos de colección pueden tener un valor real con el tiempo, especialmente cuando se conservan y cuidan bien.",
    "about.story.p3a": "Así fue como, en septiembre de 2023, decidimos emprender este camino y abrir la tienda ",
    "about.story.p3b":
      ". Empezamos a hacer crecer nuestra colección personal y a vender cartas valiosas que no sabíamos que valían tanto después de guardarlas por tantos años.",
    "about.story.p4":
      "Lo que empezó como un pasatiempo personal se convirtió rápidamente en algo más grande. Nos dimos cuenta de que no existía una plataforma dedicada a seguir el valor de mercado de las cartas de atletas venezolanos. Los coleccionistas tenían que armar la información entre búsquedas sueltas en eBay, grupos de redes sociales y comentarios de otros. No había una única fuente confiable, ni índice de precios, ni puntajes de estabilidad, ni forma de comparar valores en crudo y graduados de cientos de atletas a la vez.",
    "about.story.p5":
      "Así que la construimos. VZLA Sports Elite comenzó como una simple hoja de cálculo con unos pocos jugadores. Hoy es una plataforma completa de inteligencia de mercado con más de 15 procesos automatizados de datos, modelos estadísticos de precios y análisis que cubren cada deporte importante donde compiten atletas venezolanos.",

    "about.believe.title": "En Qué Creemos",
    "about.believe.p1":
      "Para muchos venezolanos, las cartas deportivas son simplemente recuerdos. Sin embargo, detrás de cada carta hay un potencial real. Cuando la condición, la rareza y la demanda se alinean, los coleccionables se convierten en activos.",
    "about.believe.p2":
      "En VZLA Sports Elite, el conocimiento es lo que permite a compradores venezolanos y a coleccionistas de todo el mundo que siguen a atletas venezolanos tomar decisiones informadas y con confianza.",
    "about.mission.title": "Nuestra Misión",
    "about.mission.p1":
      "VZLA Sports Elite nació para que a los venezolanos en todo el mundo les resulte fácil descubrir y apoyar a sus atletas favoritos.",
    "about.mission.p2":
      "También buscamos ayudar a compradores desde Venezuela y a coleccionistas de todo el mundo apasionados por los atletas venezolanos a encontrar las cartas y los artículos que buscan.",
    "about.mission.p3":
      "Más allá de mostrar atletas, nuestra misión es compartir conocimiento sobre este hobby y ayudar a los coleccionistas a entender cómo preservar y proteger el valor de sus colecciones a largo plazo.",
    "about.why.title": "Por Qué Importa",
    "about.why.p1":
      "Ya sea que hayas comenzado a coleccionar hace poco, que lo hagas en silencio desde hace años, que heredaras una gran colección de tu papá o tu abuelo, o que hayas recibido cartas de un amigo, tu colección tiene potencial.",
    "about.why.p2":
      "Queremos ayudarte a coleccionar con confianza, entendiendo cuánto valen tus cartas, cuándo comprar, cuándo esperar y cómo proteger lo que tienes.",

    "about.data.title": "Cómo Funcionan Nuestros Datos",
    "about.data.intro":
      "La transparencia es parte central de lo que hacemos. Cada número de este sitio está respaldado por datos reales del mercado de eBay, procesados con procesos automatizados y validados con métodos estadísticos sólidos. Así se conecta todo:",
    "about.data.1.title": "Más de 15 Procesos Automatizados",
    "about.data.1.desc":
      "Los flujos de trabajo de GitHub Actions se ejecutan según un calendario para revisar publicaciones de eBay, seguir precios, actualizar datos de población PSA/BGS y guardar tendencias históricas. Sin carga manual de datos, cada número se obtiene y verifica de forma programada.",
    "about.data.2.title": "Precios Estadísticos Taguchi",
    "about.data.2.desc":
      "No usamos promedios simples. Nuestra Media Winsorizada de Taguchi elimina los valores extremos (el 10% superior e inferior) antes de calcular los precios, dándote una imagen más precisa de lo que realmente cuestan las cartas, no lo que dice una sola publicación atípica.",
    "about.data.3.title": "Puntajes de Estabilidad y Señal",
    "about.data.3.desc":
      "Cada atleta recibe un puntaje de estabilidad basado en el Coeficiente de Variación (CV) y una relación señal-ruido medida en decibeles. Esto te dice qué tan predecible es el precio de un atleta, clave para identificar inversiones confiables frente a reventas especulativas.",
    "about.data.4.title": "Verificación de Múltiples Fuentes",
    "about.data.4.desc":
      "Los precios se cruzan entre eBay Estados Unidos y Canadá, mercados en crudo y graduados, e informes de población de PSA. Una estrategia de normalización de nombres con 6 variantes asegura que asignemos las cartas correctas a cada atleta.",
    "about.data.5.title": "Capturas e Historial",
    "about.data.5.desc":
      "Tomamos capturas periódicas de los datos de precios de cada atleta, creando un registro histórico que alimenta las minigráficas de tendencia, los cálculos del índice de mercado y los informes quincenales que ves en la página principal.",
    "about.data.6.title": "Estándares UX ISO 9241",
    "about.data.6.desc":
      "Nuestra interfaz sigue las guías de usabilidad ISO 9241, el estándar internacional de interacción humano-computadora. Esto significa contrastes conformes con WCAG, navegación accesible por teclado, soporte para movimiento reducido y diseños de búsqueda y filtros pensados para la eficiencia y la menor carga cognitiva.",
    "about.data.7.title": "Resiliente por Diseño",
    "about.data.7.desc":
      "Cada proceso incluye reintentos con espera exponencial ante fallas de API, puntos de control por lotes para retomar después de un error y commits de Git seguros ante rebase. Si algo falla a las 3 de la mañana, el sistema se recupera solo sin perder datos.",
    "about.data.moreA": "¿Quieres el detalle técnico completo? Visita nuestra página ",
    "about.data.moreLink": "Cómo Funciona",
    "about.data.moreB": ".",

    "about.community.title": "Únete a la Comunidad",
    "about.community.p1":
      "VZLA Sports Elite no es solo una plataforma de datos, es una comunidad creciente de coleccionistas, inversionistas y fanáticos venezolanos que comparten la pasión por preservar y celebrar nuestra herencia deportiva a través de las cartas.",
    "about.community.p2a":
      "Si quieres aprender sobre graduación profesional, entender cómo proteger el valor de tu colección, encontrar cartas subvaluadas antes que el resto del mercado, o simplemente conectar con otros venezolanos que aman este hobby, ",
    "about.community.link": "únete a nuestra comunidad de Facebook",
    "about.community.p2b": " y sé parte del movimiento.",

    "about.faq.title": "Preguntas Frecuentes",
    "about.faq.1.q": "¿Con qué frecuencia se actualizan los datos?",
    "about.faq.1.a":
      "Nuestros procesos automatizados corren según un calendario. Los precios de publicaciones de eBay y las listas de atletas se actualizan con el último escaneo. Los datos de población de PSA y Beckett se actualizan de forma regular, y el informe quincenal de análisis de mercado se genera el 1 y el 15 de cada mes.",
    "about.faq.2.q": "¿Qué deportes cubren?",
    "about.faq.2.a":
      "Seguimos atletas venezolanos en béisbol (MLB, ligas menores y LVBP), fútbol (MLS e internacional), baloncesto (NBA y Superliga), tenis y boxeo. El béisbol es nuestra categoría más grande, con más de 490 atletas monitoreados.",
    "about.faq.3.q": "¿Qué significa la \"Media Winsorizada de Taguchi\"?",
    "about.faq.3.a":
      "Es un método estadístico que elimina los valores extremos (el 10% más alto y el 10% más bajo de los precios) antes de calcular el promedio. Esto da un precio mucho más realista que un promedio simple, que puede distorsionarse con una sola publicación muy cara o muy barata.",
    "about.faq.4.q": "¿Qué son las señales de inversión (Compra Baja, Potencial de Reventa, etc.)?",
    "about.faq.4.a":
      "Son indicadores basados en datos, calculados con nuestros modelos de precios. \"Compra Baja\" marca cartas con precio por debajo de su nivel de referencia, una posible ganga. \"Potencial de Reventa\" señala cartas volátiles con amplias variaciones de precio. \"Fuerza de Señal\" usa la relación S/R de Taguchi para medir qué tan predecible es el precio. Son herramientas informativas, no asesoría financiera.",
    "about.faq.5.q": "¿Puedo sugerir un atleta para agregar?",
    "about.faq.5.a":
      "¡Claro! Siempre estamos ampliando nuestra lista. Escríbenos por nuestra comunidad de Facebook o por la tienda de eBay y dinos qué atletas venezolanos te gustaría ver.",
    "about.faq.6.q": "¿Esto es asesoría financiera?",
    "about.faq.6.a":
      "No. Todas las señales de inversión, índices de precios, cálculos de retorno y análisis de mercado de este sitio son solo informativos y no constituyen asesoría financiera ni profesional. Lee el descargo completo en nuestra Política de Privacidad.",

    // ── Methodology ──
    "methodology.back": "← Volver al Inicio",
    "methodology.title": "Metodología y Preguntas Frecuentes",
    "methodology.subtitle":
      "Cómo recolectamos, procesamos y entregamos datos de mercado precisos para las cartas de más de 550 atletas venezolanos, y respuestas a las dudas más comunes.",
    "methodology.approach.title": "Nuestro Enfoque de Recolección de Datos",
    "methodology.approach.p1":
      "**Más de 15 procesos automatizados** revisan los mercados de eBay buscando publicaciones de cartas de atletas venezolanos. Estos flujos corren en horarios escalonados para evitar los límites de la API, recolectando datos de varios dominios de eBay, incluidos los mercados de Estados Unidos, Canadá e internacionales.",
    "methodology.approach.p2":
      "Los datos crudos pasan por un proceso riguroso de limpieza. Primero, comparamos los títulos de las publicaciones con nuestra base de más de 550 nombres de atletas, manejando acentos, grafías alternativas y apodos. Luego, cuatro capas de filtros independientes eliminan publicaciones basura: lotes al mayor, reimpresiones, cartas digitales, calcomanías y artículos dañados. Solo sobreviven las publicaciones legítimas de cartas individuales bien identificadas.",
    "methodology.approach.p3":
      "Ya filtrados, los precios se procesan con la **Media Winsorizada de Taguchi**, un método estadístico que recorta el 20% superior e inferior de precios extremos antes de promediar. Esto produce precios que reflejan lo que los coleccionistas pagan realmente, sin la distorsión de las publicaciones atípicas.",
    "methodology.stats.title": "Métodos Estadísticos",
    "methodology.stats.p1":
      "Los promedios tradicionales son engañosos para las cartas deportivas. Un promedio simple de publicaciones de eBay incluiría lotes de $0.99 junto a joyas graduadas de $500, produciendo un número que no representa ninguna de las dos categorías. Nuestro enfoque lo resuelve con tres técnicas complementarias:",
    "methodology.stats.p2":
      "**1. Media Winsorizada de Taguchi:** Ordenamos todos los precios, recortamos el 20% más extremo de cada extremo, reemplazamos los valores recortados por el valor sobreviviente más cercano (winsorización) y calculamos la media. Tomado de la ingeniería industrial de calidad, este método está diseñado para conjuntos de datos con colas pesadas, exactamente como los precios de eBay.",
    "methodology.stats.p3":
      "**2. Coeficiente de Variación (CV):** Desviación estándar dividida entre la media, expresada como porcentaje. Este único número te dice cuánto acuerdo de precios existe en el mercado. Un CV de 10% significa publicaciones muy agrupadas, un consenso fuerte de valor. Un CV de 50% significa precios muy dispersos, y el \"promedio\" pierde significado.",
    "methodology.stats.p4":
      "**3. Transparencia del Tamaño de Muestra:** Cada precio de la plataforma muestra cuántas publicaciones aportaron al promedio. Un promedio de 3 publicaciones es muy distinto a uno de 30. Mostramos ese conteo para que cada coleccionista juzgue la confiabilidad por su cuenta.",
    "methodology.quality.title": "Calidad y Confiabilidad de los Datos",
    "methodology.quality.p1":
      "En una plataforma de datos, un dato malo es peor que ningún dato. Un precio equivocado parece correcto, la gente ve un número y decide con base en él. Nuestro sistema trata la calidad de los datos como una prioridad de monitoreo, no como un detalle secundario.",
    "methodology.quality.p2":
      "**El filtrado en cuatro capas** ofrece defensa en profundidad: filtros de categoría a nivel de API, detección de graduación por título con patrones regex, exclusión de títulos basura para lotes y artículos que no son cartas, y listas de bloqueo por condición para excluir cartas dañadas o alteradas. Si una capa falla, las demás siguen atrapando la mayor parte de la contaminación.",
    "methodology.quality.p3":
      "**La detección de anomalías** corre en cada ciclo quincenal de análisis. Los atletas con CV por encima de 100% o con cambios de precio mayores al 50% se marcan automáticamente para revisión. Estas anomalías suelen revelar problemas de origen: un cambio en el HTML de eBay, un filtro de API que falló o un nuevo tipo de publicación basura que nuestros patrones no conocían.",
    "methodology.quality.p4":
      "**Las insignias de estabilidad** muestran la calidad del dato directamente al usuario. En vez de ocultar la incertidumbre, la mostramos: \"Estable\", \"Activo\", \"Volátil\" e \"Inestable\" traducen valores técnicos de CV en señales accionables que ayudan a decidir cuánta confianza dar a cada precio.",
    "methodology.pipeline.title": "Arquitectura de los Procesos",
    "methodology.pipeline.p1":
      "La plataforma funciona con **más de 15 flujos de GitHub Actions** que operan como un equipo de asistentes de investigación que nunca duerme. Cada flujo se encarga de un dominio de datos específico: publicaciones en crudo de eBay, publicaciones graduadas de eBay, datos de población de PSA, datos de graduación de Beckett, informes de población de SGC y análisis de mercado.",
    "methodology.pipeline.p2":
      "Los flujos corren en horarios cron escalonados para evitar los límites de la API y los conflictos de fusión en Git. Un escaneo de eBay comienza a medianoche UTC, los datos de graduación se actualizan a las 6 AM y las capturas históricas se consolidan al mediodía. Cada flujo incluye seguimiento de progreso, así que si se interrumpe, retoma donde quedó en lugar de empezar de cero.",
    "methodology.pipeline.p3":
      "Todos los datos pasan por control de versiones con Git, lo que significa que cada cambio de precio queda registrado, cada dato es auditable y el sistema puede recuperarse de cualquier falla volviendo a un estado conocido. Las capturas semanales consolidan las seis fuentes de datos en un archivo unificado que alimenta el panel de análisis.",
    "methodology.faq.title": "Preguntas Frecuentes",
    "methodology.faq.1.q": "¿Con qué frecuencia se actualizan los precios?",
    "methodology.faq.1.a":
      "Los promedios de publicaciones de eBay se actualizan con el último escaneo mediante procesos automatizados. Los datos de población de PSA y BGS se actualizan semanalmente. El informe quincenal de análisis de mercado se genera el 1 y el 15 de cada mes.",
    "methodology.faq.2.q": "¿Qué es la Media Winsorizada de Taguchi?",
    "methodology.faq.2.a":
      "Es un método estadístico tomado del control de calidad industrial. Ordenamos todos los precios de las publicaciones, quitamos el 20% superior e inferior (valores extremos como lotes de $0.99 o rarezas de $10,000), reemplazamos los valores recortados por el valor sobreviviente más cercano y calculamos la media. Así obtienes un precio que representa lo que realmente cuesta una carta típica, sin distorsiones por remates ni apuestas especulativas.",
    "methodology.faq.3.q": "¿Qué significa el Puntaje de Estabilidad?",
    "methodology.faq.3.a":
      "El Puntaje de Estabilidad se basa en el Coeficiente de Variación (CV), la desviación estándar dividida entre la media, expresada como porcentaje. \"Estable\" (0-10%) significa fuerte acuerdo de precios entre publicaciones. \"Activo\" (10-20%) indica actividad normal del mercado. \"Volátil\" (20-35%) muestra dispersión significativa de precios. \"Inestable\" (35%+) señala alta especulación o ruido en los datos, toma esos promedios con cautela.",
    "methodology.faq.4.q": "¿A cuántos atletas siguen?",
    "methodology.faq.4.a":
      "Más de 550 atletas venezolanos en béisbol (MLB, MiLB), fútbol (MLS, La Liga, Serie A, Ligue 1, Bundesliga), baloncesto (NBA), tenis (WTA/ATP), BMX, atletismo y bolos. La lista se actualiza mensualmente desde varias APIs de datos deportivos.",
    "methodology.faq.5.q": "¿Cómo filtran las publicaciones basura?",
    "methodology.faq.5.a":
      "Usamos cuatro capas de filtros independientes: (1) filtros de categoría y graduación a nivel de API, (2) detección de cartas graduadas por título con patrones regex estrictos, (3) exclusión de títulos basura para lotes, reimpresiones, calcomanías y cartas digitales, y (4) listas de bloqueo por condición para excluir cartas en mal estado, dañadas o alteradas. Cada capa atrapa lo que las otras dejan pasar, defensa en profundidad.",
    "methodology.faq.6.q": "¿Qué es el Potencial de Reventa?",
    "methodology.faq.6.a":
      "Las cartas marcadas como \"Volátil\" o \"Inestable\" pueden ofrecer oportunidades de comprar barato y vender caro por sus amplias variaciones de precio. El Potencial de Reventa es una señal informativa, no asesoría financiera. Investiga siempre por tu cuenta antes de comprar.",
    "methodology.faq.7.q": "¿Cómo manejan las fallas de la API de eBay?",
    "methodology.faq.7.a":
      "Nuestros procesos usan una cadena de respaldo de tres capas: (1) las URLs Raw de GitHub sirven los datos más recientes, (2) las copias locales incluidas en el sitio sirven de respaldo si GitHub no está disponible, (3) las capturas en la base de datos PostgreSQL funcionan como recuperación ante desastres. Si una capa falla, la siguiente toma el relevo de forma transparente.",
    "methodology.faq.8.q": "¿Puedo sugerir un atleta para seguir?",
    "methodology.faq.8.a":
      "¡Claro! Usa el formulario de comentarios en el menú de navegación o únete a nuestra comunidad de Facebook. Agregamos atletas nuevos con regularidad según el interés de los coleccionistas y la actividad del mercado.",
    "methodology.cta.title": "¿Quieres Saber Más?",
    "methodology.cta.desc":
      "Explora nuestra guía técnica detallada sobre cómo funciona todo el proceso de datos, desde las consultas a la API de eBay hasta los modelos estadísticos que sustentan cada precio que ves.",
    "methodology.cta.howItWorks": "Cómo Funciona →",
    "methodology.cta.blog": "Leer el Blog →",

    // ── Blog ──
    "blog.title": "Blog",
    "blog.subtitle": "Análisis de mercado, ventas destacadas y más.",
    "blog.empty": "Aún no hay publicaciones.",
    "blog.articlesInEnglish": "Los artículos se publican en inglés.",
  },
} as const;
