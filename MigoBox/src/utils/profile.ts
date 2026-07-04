import { domain } from '@/types/domain';

export const PROFILE_MIN_TAGS = 3;

export type ProfileGap = {
  key: 'likes' | 'dislikes' | 'personality' | 'birthDate' | 'city';
  label: string;
  action: 'chat' | 'edit';
  missing: number;
};

const TAG_DIMENSIONS: { key: 'likes' | 'dislikes' | 'personality'; label: string }[] = [
  { key: 'likes', label: 'gostos' },
  { key: 'dislikes', label: 'não gosta' },
  { key: 'personality', label: 'personalidade' },
];

function tagCount(profile: domain.Profile | null | undefined, key: 'likes' | 'dislikes' | 'personality'): number {
  return profile?.[key]?.length ?? 0;
}

function tagDimensionScore(count: number): number {
  const ratio = Math.min(count, PROFILE_MIN_TAGS) / PROFILE_MIN_TAGS;
  return ratio * 20;
}

function boolScore(present: boolean): number {
  return present ? 20 : 0;
}

export function calcProfileProgress(
  friend: Pick<domain.Friend, 'birthDate' | 'city'>,
  profile: domain.Profile | null | undefined,
): number {
  const tagTotal =
    tagDimensionScore(tagCount(profile, 'likes')) +
    tagDimensionScore(tagCount(profile, 'dislikes')) +
    tagDimensionScore(tagCount(profile, 'personality'));
  const dataTotal = boolScore(Boolean(friend.birthDate)) + boolScore(Boolean(friend.city));
  return Math.min(100, Math.round(tagTotal + dataTotal));
}

export function profileGaps(
  friend: Pick<domain.Friend, 'birthDate' | 'city' | 'name'>,
  profile: domain.Profile | null | undefined,
): ProfileGap[] {
  const gaps: ProfileGap[] = [];

  TAG_DIMENSIONS.forEach(({ key, label }) => {
    const count = tagCount(profile, key);
    if (count < PROFILE_MIN_TAGS) {
      gaps.push({
        key,
        label,
        action: 'chat',
        missing: PROFILE_MIN_TAGS - count,
      });
    }
  });

  if (!friend.birthDate) {
    gaps.push({ key: 'birthDate', label: 'data de nascimento', action: 'edit', missing: 1 });
  }
  if (!friend.city) {
    gaps.push({ key: 'city', label: 'cidade', action: 'edit', missing: 1 });
  }

  return gaps;
}

export function buildHintMessage(
  friend: Pick<domain.Friend, 'birthDate' | 'city' | 'name'>,
  profile: domain.Profile | null | undefined,
): string {
  const gaps = profileGaps(friend, profile);
  if (gaps.length === 0) return '';

  const name = friend.name?.trim() || 'seu Migo';
  const tagGaps = gaps.filter((gap) => gap.action === 'chat');
  const editGaps = gaps.filter((gap) => gap.action === 'edit');

  const parts: string[] = [];

  if (tagGaps.length > 0) {
    const firstTag = tagGaps[0];
    if (tagGaps.length === 1) {
      parts.push(`Fale mais sobre o que ${name} ${firstTag.label} (faltam ${firstTag.missing})`);
    } else {
      parts.push(`Converse com a IA para descobrir mais sobre ${name}`);
    }
  }

  if (editGaps.length > 0) {
    const labels = editGaps.map((gap) => gap.label).join(' e ');
    parts.push(`adicione a ${labels} de ${name}`);
  }

  if (parts.length === 1) return parts[0];
  return `${parts[0]} ou ${parts[1]}`;
}
