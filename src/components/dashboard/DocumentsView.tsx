import { FormEvent, useEffect, useMemo, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const BUCKET = 'documents';

type DocumentRow = {
  name: string;
  path: string;
  createdAt: string;
};

interface DocumentsViewProps {
  user: User | null;
}

export function DocumentsView({ user }: DocumentsViewProps) {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docName, setDocName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const sortedDocuments = useMemo(
    () => [...documents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [documents],
  );

  const fetchDocuments = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.storage.from(BUCKET).list(user.id, {
        sortBy: { column: 'created_at', order: 'desc' },
      });

      if (error) throw error;

      const rows: DocumentRow[] = (data ?? [])
        .filter((item) => item.name)
        .map((item) => {
          const [_, rawName] = item.name.split('__');
          return {
            name: rawName || item.name,
            path: `${user.id}/${item.name}`,
            createdAt: item.created_at || new Date().toISOString(),
          };
        });

      setDocuments(rows);
    } catch (error: unknown) {
      toast({
        title: 'Unable to load documents',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const uploadDocument = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !file || !docName.trim()) return;

    setUploading(true);
    try {
      const sanitizedName = docName.trim().replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
      const path = `${user.id}/${new Date().toISOString()}__${sanitizedName}`;

      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: false,
      });

      if (error) throw error;

      toast({ title: 'Document uploaded', description: 'Your file is now available in Documents.' });
      setDocName('');
      setFile(null);
      await fetchDocuments();
    } catch (error: unknown) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Please check your file and try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const openDocument = async (path: string) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      toast({
        title: 'Unable to open file',
        description: error?.message || 'Try again in a few moments.',
        variant: 'destructive',
      });
      return;
    }

    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Documents</h1>
        <p className="text-muted-foreground">Manage your uploaded files.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload document</CardTitle>
          <CardDescription>Upload one file at a time to secure storage.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-3" onSubmit={uploadDocument}>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="docName">Document name</Label>
              <Input
                id="docName"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Government ID"
                required
              />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="docFile">File</Label>
              <Input
                id="docFile"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
            <div className="md:col-span-1 flex items-end">
              <Button type="submit" disabled={uploading || !file || !docName.trim()} className="w-full">
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All documents</CardTitle>
          <CardDescription>Sorted by newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground">Loading documents...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Document Name</TableHead>
                  <TableHead className="text-right">File</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      No documents uploaded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedDocuments.map((document) => (
                    <TableRow key={document.path}>
                      <TableCell>{new Date(document.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{document.name}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="link" onClick={() => openDocument(document.path)}>
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
