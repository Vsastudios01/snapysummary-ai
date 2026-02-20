
-- Plans table (public readable)
CREATE TABLE public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly NUMERIC DEFAULT 0,
  price_yearly NUMERIC DEFAULT 0,
  credits_per_day INTEGER NOT NULL DEFAULT 3,
  video_limit INTEGER DEFAULT 1,
  pdf_limit INTEGER DEFAULT 1,
  article_limit INTEGER DEFAULT 1,
  features JSONB DEFAULT '{}',
  trial_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans are readable by everyone" ON public.plans FOR SELECT USING (true);

-- Insert the 4 plans
INSERT INTO public.plans (name, price_monthly, price_yearly, credits_per_day, video_limit, pdf_limit, article_limit, features, trial_days) VALUES
  ('FREE', 0, 0, 3, 1, 1, 1, '{"quick_summary":true,"detailed_summary":true,"bullet_points":true}', 0),
  ('STARTER', 14.90, 149, 10, 2, 2, 2, '{"quick_summary":true,"detailed_summary":true,"bullet_points":true,"study_mode":true,"mindmap":true,"twitter_thread":true}', 7),
  ('PRO', 29.90, 299, 25, 5, 5, 5, '{"quick_summary":true,"detailed_summary":true,"bullet_points":true,"study_mode":true,"mindmap":true,"twitter_thread":true,"review_questions":true,"audio":true,"personalized":true,"multi_language":true,"visual":true,"email_digest":true}', 7),
  ('ANNUAL_PRO', 0, 149, 100, 999, 999, 999, '{"quick_summary":true,"detailed_summary":true,"bullet_points":true,"study_mode":true,"mindmap":true,"twitter_thread":true,"review_questions":true,"audio":true,"personalized":true,"multi_language":true,"visual":true,"email_digest":true,"vip_support":true,"affiliate":true}', 7);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  plan_id UUID REFERENCES public.plans(id),
  credits_available INTEGER NOT NULL DEFAULT 3,
  credits_reset_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  streak_days INTEGER NOT NULL DEFAULT 0,
  preferred_language TEXT DEFAULT 'pt-BR',
  affiliate_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profiles_user_id_unique UNIQUE (user_id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Summaries table
CREATE TABLE public.summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'pdf', 'article')),
  original_link TEXT,
  summary_format TEXT NOT NULL,
  summary_text TEXT,
  audio_url TEXT,
  tokens_used INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

-- Helper function for summary ownership
CREATE OR REPLACE FUNCTION public.owns_summary(_summary_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.summaries s
    JOIN public.profiles p ON s.user_id = p.id
    WHERE s.id = _summary_id AND p.user_id = auth.uid()
  );
$$;

CREATE POLICY "Users can view own summaries" ON public.summaries FOR SELECT USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own summaries" ON public.summaries FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete own summaries" ON public.summaries FOR DELETE USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Usage logs
CREATE TABLE public.usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON public.usage_logs FOR SELECT USING (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own usage" ON public.usage_logs FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  SELECT id INTO free_plan_id FROM public.plans WHERE name = 'FREE' LIMIT 1;
  INSERT INTO public.profiles (user_id, full_name, plan_id, credits_available, credits_reset_at)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), free_plan_id, 3, now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
