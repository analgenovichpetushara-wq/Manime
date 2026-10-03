/** Metadata fixtures for the providers AnimAlc ships (captured from their public APIs). */
/** smotret-anime.online (Anime365) — metadata + voiceovers only, no public streams. */
export const a365Series = {
  id: 998877,
  title: 'Тестовый сериал',
  type: 'tv',
  year: 2023,
  season: 'fall',
  poster: 'https://img.smotret-anime.online/998877.jpg',
  genres: ['Драма', 'Романтика'],
  duration: 24,
  episodesTotal: 12,
  description: 'Описание сериала',
  myanimelist_id: 111,
  shikimori_id: 222,
  updatedAt: '2024-09-01T00:00:00.000Z',
};

export const a365Translation = {
  id: 4242,
  type: 'voiceRu',
  title: 'Русская озвучка AnimAlc',
  authors: [{ id: 1, name: 'AnimAlc Team' }],
  episode: 1,
};

export const a365Episode = {
  id: 777,
  seriesId: 998877,
  episode: 1,
  episodeFull: 'Серия 1',
  duration: 1440,
  intro: { start: 10, stop: 95 },
  ending: { start: 1300, stop: 1400 },
};

/** shikimori.io — metadata-only enrichment. */
export const shikimoriAnime = {
  id: 12345,
  name: 'Test Release',
  russian: 'Тестовый релиз',
  url: '/animes/z12345-test-release',
  kind: 'tv',
  score: '8.1',
  status: 'released',
  episodes: 12,
  aired_on: '2024-04-01',
  image: { original: '/system/animes/original/12345.jpg', preview: '/system/animes/preview/12345.jpg' },
  genres: [{ id: 1, name: 'Фэнтези', russian: 'Фэнтези', kind: 'genre' }],
};
