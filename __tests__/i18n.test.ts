import ru from '@/i18n/strings/ru.json';
import en from '@/i18n/strings/en.json';
import { availableKeys, extractPlaceholders, interpolate, originalText, translate, validateOverride } from '@/i18n/textEngine';
import { ACHIEVEMENTS } from '@/features/achievements/achievementsData';

const ruKeys = Object.keys(ru as Record<string, string>);
const enKeys = Object.keys(en as Record<string, string>);

describe('localisation catalogue', () => {
  it('keeps Russian and English dictionaries in sync', () => {
    expect(ruKeys.sort()).toEqual(enKeys.sort());
    expect(ruKeys.length).toBeGreaterThan(400);
  });

  it('has no empty strings and no raw keys leaking into the UI', () => {
    for (const key of ruKeys) {
      expect((ru as Record<string, string>)[key]?.trim().length).toBeGreaterThan(0);
      expect((en as Record<string, string>)[key]?.trim().length).toBeGreaterThan(0);
    }
  });

  it('uses identical placeholders in both languages', () => {
    for (const key of ruKeys) {
      const ruPlaceholders = extractPlaceholders((ru as Record<string, string>)[key]!);
      const enPlaceholders = extractPlaceholders((en as Record<string, string>)[key]!);
      expect({ key, placeholders: enPlaceholders.sort() }).toEqual({ key, placeholders: ruPlaceholders.sort() });
    }
  });

  it('covers every achievement title and description in both languages', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(40);
    for (const achievement of ACHIEVEMENTS) {
      // Keys are flat and contain dots, so membership is checked directly.
      expect(achievement.titleKey in (ru as Record<string, string>)).toBe(true);
      expect(achievement.descriptionKey in (ru as Record<string, string>)).toBe(true);
      expect(achievement.titleKey in (en as Record<string, string>)).toBe(true);
      expect(achievement.descriptionKey in (en as Record<string, string>)).toBe(true);
    }
  });

  it('covers the core screens by string id', () => {
    for (const key of ['app.name', 'nav.home', 'nav.search', 'nav.lists', 'nav.profile', 'nav.settings', 'settings.title', 'profile.edit']) {
      expect(key in (ru as Record<string, string>)).toBe(true);
      expect(key in (en as Record<string, string>)).toBe(true);
    }
  });
});

describe('translation runtime', () => {
  it('interpolates and keeps the raw key visible when a translation is missing', () => {
    expect(interpolate('Привет, {name}!', { name: 'Мир' })).toBe('Привет, Мир!');
    expect(translate('does.not.exist', 'ru')).toBe('does.not.exist');
  });

  it('reads the original text for a language', () => {
    expect(originalText('app.name', 'ru')).toBe((ru as Record<string, string>)['app.name']);
    expect(originalText('app.name', 'en')).toBe((en as Record<string, string>)['app.name']);
  });

  it('lets the user override a string without touching the bundled dictionary', () => {
    const overrides = { 'app.name': { ru: 'АнимАлк' } };
    expect(translate('app.name', 'ru', overrides)).toBe('АнимАлк');
    // Russian is the fallback language, so an override applies until a dedicated
    // English override exists — the screenshot comparison stays predictable.
    expect(translate('app.name', 'en', overrides)).toBe('АнимАлк');
    expect(translate('app.name', 'en', { 'app.name': { ru: 'АнимАлк', en: 'AnimAlcX' } })).toBe('AnimAlcX');
    expect((ru as Record<string, string>)['app.name']).not.toBe('АнимАлк');
  });

  it('keeps placeholders in custom text valid', () => {
    const original = 'Продолжаем с {time} с';
    expect(validateOverride(original, 'Старт с {time} с').valid).toBe(true);
    const invalid = validateOverride(original, 'Старт');
    expect(invalid.valid).toBe(false);
    expect(invalid.missing).toEqual(['time']);
    expect(validateOverride('Без подстановок', 'Что угодно').valid).toBe(true);
  });

  it('exposes every stable key for the editor', () => {
    const keys = availableKeys('ru');
    expect(keys.length).toBe(ruKeys.length);
    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort()).toEqual([...ruKeys].sort());
  });

  it('gives every editable catalogue group a localised chip label', () => {
    const prefixes = [...new Set(ruKeys.map((key) => key.split('.')[0] ?? ''))].filter((prefix) => prefix.length > 0);
    expect(prefixes.length).toBeGreaterThan(20);
    for (const prefix of prefixes) {
      const key = `text.group.${prefix}`;
      expect(translate(key, 'ru')).not.toBe(key);
      expect(translate(key, 'en')).not.toBe(key);
    }
  });
});
