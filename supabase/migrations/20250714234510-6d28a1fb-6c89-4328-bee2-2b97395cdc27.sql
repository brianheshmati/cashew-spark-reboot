-- Create storage bucket for loan documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('loan-documents', 'loan-documents', false);

-- Create policy for authenticated users to upload their own documents
CREATE POLICY "Users can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy for authenticated users to view their own documents
CREATE POLICY "Users can view their own documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy for authenticated users to update their own documents
CREATE POLICY "Users can update their own documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);