export interface ShikimoriImage {
  original?: string | null;
  preview?: string | null;
  x96?: string | null;
  x48?: string | null;
}

export interface ShikimoriAnime {
  id: number;
  name?: string | null;
  russian?: string | null;
  image?: ShikimoriImage | null;
  url?: string | null;
  kind?: string | null;
  score?: string | number | null;
  status?: string | null;
  episodes?: number | null;
  episodes_aired?: number | null;
  aired_on?: string | null;
  released_on?: string | null;
  duration?: number | null;
  description?: string | null;
  genres?: { id: number; name: string; russian?: string | null; kind?: string | null }[] | null;
  studios?: { id: number; name: string }[] | null;
  rating?: string | null;
}
