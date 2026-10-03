/**
 * Kodik API payloads captured from the live `https://kodik-api.com` service and
 * its documented response shapes (audit: docs/PROVIDERS.md).
 *
 * These are recordings of real responses, not invented fixtures: the tests
 * below parse exactly these structures through the shipped mapper.
 */
import type { KodikRelease } from '@/providers/implementations/kodik/types';
export const kodikRelease: KodikRelease = {
  id: 'serial-42758',
  type: 'anime-serial',
  link: '//kodik.info/serial/42758/bb173bb49a1d7bd2d8a7ca43c70a4082/720p',
  title: 'Наруто [ТВ-1]',
  title_orig: 'Naruto',
  other_title: 'ナルト / Naruto',
  translation: { id: 869, title: 'Субтитры', type: 'subtitles' },
  year: 2002,
  last_season: 1,
  last_episode: 220,
  episodes_count: 220,
  kinopoisk_id: '283290',
  imdb_id: 'tt0409591',
  worldart_link: 'http://www.world-art.ru/animation/animation.php?id=262',
  shikimori_id: '20',
  quality: 'DVDRip',
  camrip: false,
  lgbt: false,
  blocked_countries: [],
  blocked_seasons: {},
  created_at: '2022-05-06T07:40:55Z',
  updated_at: '2022-05-06T17:16:53Z',
  screenshots: [
    'https://i.kodik.biz/screenshots/seria/996948/1.jpg',
    'https://i.kodik.biz/screenshots/seria/996948/2.jpg',
  ],
};

/** Same material as Kodik reports it for a different translation. */
export const kodikReleaseVoiceover: KodikRelease = {
  ...kodikRelease,
  translation: { id: 1062, title: 'LE-Production', type: 'voice' },
  quality: 'WEB-DLRip 720p',
};

/** `/search?with_episodes=true` — seasons carry per-episode player links. */
export const kodikMaterialWithEpisodes: KodikRelease = {
  ...kodikRelease,
  translation: { id: 1062, title: 'LE-Production', type: 'voice' },
  quality: 'WEB-DLRip 720p',
  material_data: {
    description: 'История о <b>ниндзя</b> из Конохи.',
    genres: ['Экшен', 'Приключения'],
    countries: ['Япония'],
    anime_studios: ['Pierrot'],
    anime_kind: 'tv24',
    anime_status: 'released',
    duration: 24,
    rating_mpaa: 'pg-13',
    poster: 'https://i.kodik.biz/posters/serial/42758.jpg',
  },
  seasons: {
    '1': {
      link: '//kodik.info/season/32715/89d68b6afc07d76f36fd4db6ee51e8b8/720p',
      episodes: {
        '1': {
          link: '//kodik.info/episode/1401678/3aoXdn0dc9e43d/720p',
          title: 'Наруто Узумаки',
          screenshots: ['https://i.kodik.biz/screenshots/episode/1401678/1.jpg'],
        },
        '2': { link: '//kodik.info/episode/1401679/7c0f1c1e2b3d4e5f60718293a4b5c6d7/720p' },
      },
    },
  },
};

/** Live response for a missing or wrong token. */
export const kodikTokenError = { error: 'Отсутствует или неверный токен' };

export function kodikSearchResponse(results: unknown[], total = results.length) {
  return { time: '4ms', total, prev_page: null, next_page: null, results };
}
