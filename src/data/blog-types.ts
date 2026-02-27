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

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  coverImage: string;
  sections: BlogSection[];
}
