-- 0008: business profiles gain revenue and advertising spend (client request).
-- Free-text values as the member states them, e.g. "$40k/month", "$150/day". Additive only.

alter table public.ai_knowledge_chat_user_insights add column if not exists monthly_revenue text check (char_length(monthly_revenue) <= 120);
alter table public.ai_knowledge_chat_user_insights add column if not exists meta_ad_spend text check (char_length(meta_ad_spend) <= 120);
alter table public.ai_knowledge_chat_user_insights add column if not exists google_ad_spend text check (char_length(google_ad_spend) <= 120);
