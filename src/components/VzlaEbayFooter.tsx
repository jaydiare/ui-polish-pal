const EBAY_BANNER = "https://www.ebay.ca/sch/i.html?_nkw=trading+cards&mkevt=1&mkcid=1&mkrid=706-53473-19255-0&campid=5339142321&toolid=10001";

const VzlaEbayFooter = () => {
  return (
    <footer className="ebay-footer">
      <a href={EBAY_BANNER} target="_blank" rel="noopener noreferrer">
        <img src="./assets/Baseball-728x90.jpg" alt="eBay banner" className="ebay-banner-img" loading="eager" />
      </a>
    </footer>
  );
};

export default VzlaEbayFooter;
