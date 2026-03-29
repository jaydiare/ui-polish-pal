export interface BlogSaleItem {
  rank: number;
  title: string;
  imageUrl: string;
  soldPrice: number;
  sourceUrl?: string;
}

export interface BlogSection {
  heading: string;
  description: string;
  items: BlogSaleItem[];
}

export interface BlogTextSection {
  heading: string;
  paragraphs: string[];
}

export interface EbayCard {
  title: string;
  imageUrl: string;
  ebayUrl: string;
  price?: string;
}

export interface ShowRankingPlayer {
  rank: number;
  name: string;
  team: string;
  position: string;
  ovr: number;
  pot: string;
}

export interface ShowRankingSection {
  title: string;
  sourceUrl: string;
  sourceLabel: string;
  players: ShowRankingPlayer[];
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  coverImage: string;
  sections: BlogSection[];
  textSections?: BlogTextSection[];
  type?: "ranked" | "roster" | "data-table" | "ebay-cards" | "the-show-ranking";
  playerNames?: string[];
  ebayCards?: EbayCard[];
  showRankingPlayers?: ShowRankingPlayer[];
  showRankingSections?: ShowRankingSection[];
}
