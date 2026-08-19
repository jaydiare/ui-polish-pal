import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
  /** Extra keywords appended to the Spanish/Venezuela base set */
  keywords?: string;
}


const BASE_URL = "https://vzlasportselite.com";
const DEFAULT_IMAGE = `${BASE_URL}/assets/feature_image.jpg`;
const BASE_KEYWORDS =
  "Venezuelan sports cards, barajitas de beisbol, cartas de beisbol venezolanas, precios de barajitas, peloteros venezolanos cartas, valor de cartas deportivas, eBay card prices";

const SEOHead = ({
  title,
  description,
  path = "/",
  image = DEFAULT_IMAGE,
  type = "website",
  jsonLd,
  keywords,
}: SEOHeadProps) => {
  const url = `${BASE_URL}${path}`;
  const fullTitle = path === "/" ? title : `${title} | VZLA Sports Elite`;

  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords ? `${BASE_KEYWORDS}, ${keywords}` : BASE_KEYWORDS} />
      <meta name="geo.region" content="VE" />
      <meta name="geo.placename" content="Venezuela" />
      <link rel="canonical" href={url} />

      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="VZLA Sports Elite" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:locale:alternate" content="es_VE" />
      <meta property="og:locale:alternate" content="es_419" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(schema)}</script>
      ))}
    </Helmet>
  );
};

export default SEOHead;
