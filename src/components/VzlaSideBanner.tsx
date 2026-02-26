const EBAY_SEARCH = "https://www.ebay.ca/sch/i.html?_nkw=trading+cards&mkevt=1&mkcid=1&mkrid=706-53473-19255-0&campid=5339142321&toolid=10001";
const CARDHEDGE = "https://www.cardhedger.com?via=vzlaelite";
const BCW = "https://www.bcwsupplies.com/?acc=vzlaelite";

const VzlaSideBanner = () => {
  return (
    <aside className="side-banner">
      <a href={CARDHEDGE} target="_blank" rel="noopener noreferrer" title="Card Hedge Sports & Trading Card Analytics">
        <img src="./assets/cardhedge.jpg" alt="Card Hedge Sports & Trading Card Analytics" />
      </a>
      <a href={EBAY_SEARCH} target="_blank" rel="noopener noreferrer">
        <img src="./assets/ebay-300x600-left.jpg" alt="Shop Trading Cards on eBay" />
      </a>
      <a href={BCW} target="_blank" rel="noopener noreferrer">
        <img src="./assets/BCW.jpg" alt="BCW - Protect, Store, Display" />
      </a>
    </aside>
  );
};

export default VzlaSideBanner;
