/** Trimmed payloads captured from the public AniLiberty API (api.anilibria.app/api/v1). */
export const anilibriaRelease = {
  id: 16605,
  type: { value: 'TV', description: 'ТВ-сериал' },
  year: 2024,
  name: { main: 'Тестовый релиз', english: 'Test Release', alternative: 'Тэст Рилиз' },
  alias: 'test-release',
  season: { value: 'spring', description: 'Весна' },
  description: 'Описание релиза с <b>разметкой</b>.',
  is_ongoing: false,
  is_in_production: false,
  age_rating: { value: '16', label: '16+', is_adult: false },
  rating: { average: 8.42, votes: 1200 },
  shikimori: { id: 12345, rating: 8.1, votes: 900 },
  mal: { id: 54321, rating: 8.0, votes: 800 },
  episodes_total: 12,
  average_duration_of_episode: 24,
  poster: { src: '/storage/releases/posters/16605/poster.jpg', optimized: { src: '/storage/releases/posters/16605/optimized.jpg' } },
  background_covers: [{ src: '/storage/releases/backgrounds/16605/bg.jpg' }],
  genres: [{ id: 1, name: 'Фэнтези' }, { id: 2, name: 'Приключения' }],
  members: [{ id: 'm1', nickname: 'AnimAlc Team', role: { value: 'voicing', description: 'Озвучка' } }],
  updated_at: '2024-10-01T10:00:00+00:00',
};

export const anilibriaEpisode = {
  id: 'ep-1',
  name: 'Первая серия',
  name_english: 'First episode',
  ordinal: 1,
  duration: 1440,
  hls_480: '/storage/releases/episodes/16605/480.m3u8',
  hls_720: '/storage/releases/episodes/16605/720.m3u8',
  hls_1080: '/storage/releases/episodes/16605/1080.m3u8',
  opening: { start: 12, stop: 102 },
  ending: { start: 1320, stop: 1420 },
  preview: { src: '/storage/releases/episodes/16605/preview.jpg' },
  release_id: 16605,
  sort_order: 1,
};

export const anilibriaEpisodeWithoutStreams = {
  id: 'ep-blocked',
  ordinal: 2,
  duration: null,
  hls_480: null,
  hls_720: null,
  hls_1080: null,
  release_id: 16605,
};

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
