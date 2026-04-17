export interface PlexItem {
  id:            string;
  title:         string;
  year:          number;
  type:          "movie" | "show";
  category:      "movie" | "show" | "anime" | "music" | "exclusive";
  sectionTitle:  string;
  thumb?:        string;
  rating?:       number;
  summary?:      string;
  duration?:     number;
  seasons?:      number;
  episodes?:     number;
  contentRating?: string;
  genre:         string[];
}

export interface ApiResponse {
  items:      PlexItem[];
  total:      number;
  page:       number;
  totalPages: number;
  counts?:    { all: number; movie: number; show: number; anime: number; music: number; exclusive: number };
  demo?:      boolean;
}

export type Category = "all" | "movie" | "show" | "anime" | "music" | "exclusive";
export type SortMode  = "recent" | "alpha" | "rating" | "year";
