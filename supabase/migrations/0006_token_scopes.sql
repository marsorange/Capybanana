-- Token scopes: split the single shared bind token into a per-purpose pair.
--   'web'   — the owner's browser session credential (cloud.bindToken). Many can
--             be active at once: each login mints one and never revokes siblings,
--             so the owner can be signed in on several devices/tabs at the same
--             time. A web session is an account thing, unrelated to the Agent.
--   'agent' — the single bind link baked into connectUrl / skill.md. Minted once
--             when the account has none, then left alone so opening the web app
--             never rotates (and thus disconnects) the connected Agent. Only the
--             owner's explicit "重新生成连接 / 换 Agent" rotates it.
--
-- Existing active tokens belong to whoever is currently connected (web + Agent
-- shared one token before this change). Tag them 'agent' so the live Agent keeps
-- working; the next web login mints a separate 'web' token alongside it.
update agent_tokens
set name = 'agent'
where revoked_at is null and name = 'default';

-- Fast lookup of the active token of a given scope when rotating per-scope.
create index if not exists agent_tokens_user_name_active_idx
on agent_tokens (user_id, name)
where revoked_at is null;
