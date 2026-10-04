/**
 * Payloads captured live from the open CdnVideoHub API on 2026-10-04:
 *   GET https://plapi.cdnvideohub.com/api/v1/player/sv/playlist?pub=747&aggr=mali&id=51019
 *   GET https://plapi.cdnvideohub.com/api/v1/player/sv/video/10417869052469
 * Trimmed to the first episodes; field names and shapes are untouched.
 */
import type { CvhPlaylistResponse, CvhVideoResponse } from '@/providers/implementations/cvh/types';

export const cvhPlaylist: CvhPlaylistResponse = {
  titleName: 'Истребитель демонов: Собрание высших лун и деревня кузнецов',
  isSerial: true,
  items: [
    { cvhId: '0199a529-ace1-7630-9a5c-a69880e4adb6', vkId: '10417869052469', voiceStudio: 'AniDub Online', voiceType: 'Многоголосый', season: 1, episode: 1 },
    { cvhId: '0191526f-0f79-7e39-a050-888d764a2273', vkId: '7043868678752', voiceStudio: 'AnilibriaTV', voiceType: 'Неизвестный', season: 1, episode: 1 },
    { cvhId: '0191528b-25a6-72f7-a36d-9ef5a9ab63a9', vkId: '7583960750698', voiceStudio: 'Dream Cast', voiceType: 'Неизвестный', season: 1, episode: 1 },
    { cvhId: '0199a529-ad82-706e-970a-9912fd4cceb1', vkId: '10417890023989', voiceStudio: 'AniDub Online', voiceType: 'Многоголосый', season: 1, episode: 2 },
    { cvhId: '0191526f-0ff3-7eb9-bd3d-7fc4b5d03dfc', vkId: '7043868744288', voiceStudio: 'AnilibriaTV', voiceType: 'Неизвестный', season: 1, episode: 2 },
  ],
};

export const cvhVideo: CvhVideoResponse = {
  unitedVideoId: 10417869052469,
  duration: 2966,
  failoverHost: 'vd737.okcdn.ru',
  thumbUrl: 'https://iv.okcdn.ru/videoPreview?id=9153116637749&type=32&idx=9&tkn=xye0',
  sources: {
    hlsUrl: 'https://vd576.okcdn.ru/video.m3u8?cmd=videoPlayerCdn&expires=1791203598913&type=2&id=9153116637749',
    dashUrl: 'https://vd576.okcdn.ru/?expires=1791203598913&type=1&id=9153116637749',
    mpegQhdUrl: '',
    mpeg2kUrl: '',
    mpeg4kUrl: '',
    mpegHighUrl: 'https://vd576.okcdn.ru/?expires=1791203598913&type=3&id=9153116637749',
    mpegFullHdUrl: 'https://vd576.okcdn.ru/?expires=1791203598913&type=5&id=9153116637749',
    mpegMediumUrl: 'https://vd576.okcdn.ru/?expires=1791203598913&type=2&ct=0&id=9153116637749',
    mpegLowUrl: 'https://vd576.okcdn.ru/?expires=1791203598913&type=1&ct=0&id=9153116637749',
    mpegLowestUrl: 'https://vd576.okcdn.ru/?expires=1791203598913&type=0&ct=0&id=9153116637749',
    mpegTinyUrl: 'https://vd576.okcdn.ru/?expires=1791203598913&type=4&ct=0&id=9153116637749',
  },
};
