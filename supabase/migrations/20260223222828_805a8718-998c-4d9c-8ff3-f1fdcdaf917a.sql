
-- Create storage bucket for PDF uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('pdfs', 'pdfs', false);

-- Users can upload PDFs to their own folder
CREATE POLICY "Users can upload own PDFs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view their own PDFs
CREATE POLICY "Users can view own PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own PDFs
CREATE POLICY "Users can delete own PDFs"
ON storage.objects FOR DELETE
USING (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
