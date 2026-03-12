// ============================================
// Service: Social (Amigos, Conquistas, Desafios em Dupla)
// ============================================

import { supabase } from '@/lib/supabase';
import type {
  Profile,
  Friendship,
  UserAchievement,
  AchievementDefinition,
  DuoChallenge,
  DuoChallengeStatus,
} from '@/types';

// ---- PERFIL ------------------------------------------------

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data as Profile | null;
}

export async function upsertProfile(
  userId: string,
  fields: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...fields }, { onConflict: 'id' })
    .select()
    .single();
  return data as Profile | null;
}

export async function searchProfilesByEmail(query: string): Promise<Profile[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_emoji, bio, total_points, email, created_at, updated_at')
    .ilike('email', `%${query}%`)
    .limit(10);
  return (data as Profile[]) ?? [];
}

// ---- AMIZADES -----------------------------------------------

export async function getMyFriendships(userId: string): Promise<Friendship[]> {
  const { data: ships } = await supabase
    .from('friendships')
    .select('*')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (!ships || ships.length === 0) return [];

  // Busca perfis em lote para evitar N+1
  const userIds = [...new Set((ships as any[]).flatMap(f => [f.requester_id, f.addressee_id]))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_emoji, total_points, email')
    .in('id', userIds);

  const profileMap: Record<string, any> = Object.fromEntries(
    (profiles ?? []).map((p: any) => [p.id, p])
  );

  return (ships as any[]).map(f => ({
    ...f,
    requester: profileMap[f.requester_id] ?? null,
    addressee: profileMap[f.addressee_id] ?? null,
  })) as Friendship[];
}

export async function sendFriendRequest(
  requesterId: string,
  addresseeId: string
): Promise<{ error: string | null }> {
  // Usa upsert para evitar violação de unique constraint se já houver
  // um registro anterior (declined, pending reomovido, etc.)
  const { error } = await supabase
    .from('friendships')
    .upsert(
      { requester_id: requesterId, addressee_id: addresseeId, status: 'pending' },
      { onConflict: 'requester_id,addressee_id', ignoreDuplicates: false }
    );
  return { error: error?.message ?? null };
}

export async function respondFriendRequest(
  friendshipId: string,
  status: 'accepted' | 'declined'
): Promise<void> {
  await supabase
    .from('friendships')
    .update({ status })
    .eq('id', friendshipId);
}

export async function removeFriend(friendshipId: string): Promise<void> {
  await supabase.from('friendships').delete().eq('id', friendshipId);
}

// ---- CONQUISTAS -----------------------------------------------

export async function getAllAchievementDefinitions(): Promise<AchievementDefinition[]> {
  const { data } = await supabase
    .from('achievement_definitions')
    .select('*')
    .order('points', { ascending: false });
  return (data as AchievementDefinition[]) ?? [];
}

export async function getMyAchievements(userId: string): Promise<UserAchievement[]> {
  const { data } = await supabase
    .from('user_achievements')
    .select('*, achievement_definitions(*)')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });
  return (data as UserAchievement[]) ?? [];
}

export async function getFriendsAchievements(
  friendIds: string[]
): Promise<UserAchievement[]> {
  if (friendIds.length === 0) return [];
  const { data } = await supabase
    .from('user_achievements')
    .select('*, achievement_definitions(*), profiles(*)')
    .in('user_id', friendIds)
    .order('earned_at', { ascending: false })
    .limit(50);
  return (data as UserAchievement[]) ?? [];
}

export async function awardAchievement(
  userId: string,
  achievementId: string
): Promise<void> {
  // Tenta inserir; se já existe, ignora (UNIQUE constraint)
  await supabase
    .from('user_achievements')
    .upsert({ user_id: userId, achievement_id: achievementId }, { onConflict: 'user_id,achievement_id' });

  // Atualiza pontos do perfil
  const def = await supabase
    .from('achievement_definitions')
    .select('points')
    .eq('id', achievementId)
    .single();
  if (def.data) {
    await supabase.rpc('increment_profile_points', {
      uid: userId,
      pts: (def.data as AchievementDefinition).points,
    }).then(() => {});
  }
}

// ---- DESAFIOS EM DUPLA ----------------------------------------

export async function getMyDuoChallenges(userId: string): Promise<DuoChallenge[]> {
  const { data: duos } = await supabase
    .from('duo_challenges')
    .select('*')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (!duos || duos.length === 0) return [];

  // Busca perfis em lote
  const userIds = [...new Set((duos as any[]).flatMap(d => [d.requester_id, d.addressee_id]))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_emoji')
    .in('id', userIds);

  const profileMap: Record<string, any> = Object.fromEntries(
    (profiles ?? []).map((p: any) => [p.id, p])
  );

  return (duos as any[]).map(d => ({
    ...d,
    requester: profileMap[d.requester_id] ?? null,
    addressee: profileMap[d.addressee_id] ?? null,
  })) as DuoChallenge[];
}

export async function createDuoChallenge(
  challenge: Omit<
    DuoChallenge,
    'id' | 'requester_progress' | 'addressee_progress' | 'requester_completed' | 'addressee_completed' | 'status' | 'created_at' | 'updated_at' | 'requester' | 'addressee'
  >
): Promise<DuoChallenge | null> {
  const { data } = await supabase
    .from('duo_challenges')
    .insert({
      ...challenge,
      requester_progress: 0,
      addressee_progress: 0,
      requester_completed: false,
      addressee_completed: false,
      status: 'pending',
    })
    .select()
    .single();
  return data as DuoChallenge | null;
}

export async function respondDuoChallenge(
  challengeId: string,
  status: 'accepted' | 'declined'
): Promise<void> {
  await supabase
    .from('duo_challenges')
    .update({ status: status === 'accepted' ? 'active' : 'declined' })
    .eq('id', challengeId);
}

export async function updateDuoProgress(
  challengeId: string,
  isRequester: boolean,
  delta: number,
  target: number
): Promise<void> {
  const field = isRequester ? 'requester_progress' : 'addressee_progress';
  const completedField = isRequester ? 'requester_completed' : 'addressee_completed';

  // Busca progresso atual
  const { data: current } = await supabase
    .from('duo_challenges')
    .select(field)
    .eq('id', challengeId)
    .single();

  if (!current) return;
  const currentProgress = Number((current as Record<string, number>)[field] ?? 0);
  const newProgress = Math.min(target, Math.max(0, currentProgress + delta));
  const completed = newProgress >= target;

  await supabase
    .from('duo_challenges')
    .update({ [field]: newProgress, [completedField]: completed })
    .eq('id', challengeId);
}
