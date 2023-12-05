ALTER TABLE public.companies ADD COLUMN address TEXT;
ALTER TABLE public.companies ADD COLUMN zip TEXT;
ALTER TABLE public.companies ADD COLUMN city TEXT;
ALTER TABLE public.companies ADD COLUMN state TEXT;
ALTER TABLE public.companies ADD COLUMN country TEXT;

ALTER TABLE public.companies ADD COLUMN domain TEXT;
ALTER TABLE public.companies ADD COLUMN website TEXT;
ALTER TABLE public.companies ADD COLUMN owner_hs_id BIGINT; -- note: This is not a reference because it would be hard to garantee operation on splinar db are run exactly in same order as hubspot, so there may be some owner updated before the contact is created and vice-versa
ALTER TABLE public.companies ADD COLUMN phone TEXT;

ALTER TABLE public.companies ADD COLUMN facebook_company_page TEXT;
ALTER TABLE public.companies ADD COLUMN linkedin_company_page TEXT;
ALTER TABLE public.companies ADD COLUMN twitterhandle TEXT;

ALTER TABLE public.companies ADD COLUMN similarity_checked boolean DEFAULT false NOT NULL;
ALTER TABLE public.companies ADD COLUMN dup_checked boolean DEFAULT false NOT NULL;
ALTER TABLE public.companies ADD COLUMN filled_score bigint DEFAULT 1 NOT NULL;
ALTER TABLE public.companies ALTER COLUMN similarity_checked DROP DEFAULT;
ALTER TABLE public.companies ALTER COLUMN dup_checked DROP DEFAULT;
ALTER TABLE public.companies ALTER COLUMN filled_score DROP DEFAULT;