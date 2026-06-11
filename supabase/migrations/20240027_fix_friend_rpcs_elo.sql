-- Fix get_friends and search_users_by_username to include chess_elo

CREATE OR REPLACE FUNCTION public.get_friends(p_user_id uuid)
RETURNS TABLE (
  friendship_id uuid,
  friend_id     uuid,
  username      text,
  full_name     text,
  avatar_url    text,
  requester_id  uuid,
  chess_elo     integer
) AS $$
  SELECT
    f.id AS friendship_id,
    CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END AS friend_id,
    p.username,
    p.full_name,
    p.avatar_url,
    f.requester_id,
    COALESCE(p.chess_elo, 1000) AS chess_elo
  FROM public.friendships f
  JOIN public.profiles p
    ON p.id = CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END
  WHERE (f.requester_id = p_user_id OR f.addressee_id = p_user_id)
    AND f.status = 'accepted';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.search_users_by_username(
  p_query    text,
  p_user_id  uuid,
  p_limit    int DEFAULT 10
) RETURNS TABLE (
  id         uuid,
  username   text,
  full_name  text,
  avatar_url text,
  chess_elo  integer
) AS $$
  SELECT p.id, p.username, p.full_name, p.avatar_url, COALESCE(p.chess_elo, 1000) AS chess_elo
  FROM public.profiles p
  WHERE p.id <> p_user_id
    AND p.username IS NOT NULL
    AND lower(p.username) LIKE lower(p_query) || '%'
  ORDER BY p.username
  LIMIT p_limit;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
