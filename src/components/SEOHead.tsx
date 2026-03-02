import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: string;
  jsonLd?: Record<string, any>;
}

const BASE_URL = "https://vzlasportselite.com";
const DEFAULT_IMAGE = `${BASE_URL}/assets/feature_image.jpg`;

const SEOHead = ({
  title,
  description,
  path = "/",
  image = DEFAULT_IMAGE,
  type = "website",
  jsonLd,
}: SEOHeadProps) => {
  const url = `${BASE_URL}${path}`;
  const fullTitle = path === "/" ? title : `${title} | VZLA Sports Elite`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="VZLA Sports Elite" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
};

export default SEOHead;
