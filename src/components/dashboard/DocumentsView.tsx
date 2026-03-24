import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

const BUCKET = 'clients_documents'

const DOCUMENT_TYPES = [
  { value: 'payslip', label: 'Payslip' },
  { value: 'certificate_employment', label: 'Certificate of Employment' },
  { value: 'government_id', label: 'Government ID' },
  { value: 'bank_statement', label: 'Bank Statement' }
]

type DocumentRow = {
  name: string
  type: string
  path: string
  createdAt: string
}

interface DocumentsViewProps {
  user: User | null
  internalUserId?: string
}

export function DocumentsView({ user, internalUserId }: DocumentsViewProps) {

  const [searchParams] = useSearchParams()
  const { toast } = useToast()

  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const [docType, setDocType] = useState('')
  const [docName, setDocName] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const [folderPath, setFolderPath] = useState<string | null>(null)

  // =========================
  // RESOLVE FOLDER (IMPERSONATION FIRST)
  // =========================
  useEffect(() => {
    const resolveFolder = async () => {
      const urlEmail = searchParams.get('email')

      // 🔥 impersonation path
      if (urlEmail) {
        const normalizedEmail = urlEmail.toLowerCase()

        const { data, error } = await supabase
          .from('userProfiles')
          .select('internal_user_id')
          .eq('email', normalizedEmail)
          .single()

        if (error || !data?.internal_user_id) {
          toast({
            title: 'Error',
            description: 'Failed to resolve impersonated user',
            variant: 'destructive'
          })
          setLoading(false)
          return
        }

        setFolderPath(data.internal_user_id)
        return
      }

      // fallback
      setFolderPath(internalUserId ?? user?.id ?? null)
    }

    resolveFolder()
  }, [internalUserId, user, searchParams])

  // =========================
  // SORT
  // =========================
  const sortedDocuments = useMemo(
    () =>
      [...documents].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      ),
    [documents]
  )

  // =========================
  // FETCH
  // =========================
  const fetchDocuments = async () => {

    if (!folderPath) return

    setLoading(true)

    try {

      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(folderPath)

      if (error) throw error

      const rows: DocumentRow[] = (data ?? [])
        .filter((item) => item.name)
        .map((item) => {

          const parts = item.name.split('__')

          const type = parts[1] || 'unknown'
          const rawName = parts[2] || item.name

          return {
            type,
            name: rawName.replace(/\.[^/.]+$/, ''),
            path: `${folderPath}/${item.name}`,
            createdAt: item.created_at || new Date().toISOString()
          }

        })

      setDocuments(rows)

    } catch (error: any) {

      toast({
        title: 'Unable to load documents',
        description: error.message,
        variant: 'destructive'
      })

    } finally {
      setLoading(false)
    }

  }

  useEffect(() => {
    fetchDocuments()
  }, [folderPath])

  // =========================
  // UPLOAD
  // =========================
  const uploadDocument = async (event: FormEvent) => {

    event.preventDefault()

    if (!file || !docName.trim() || !docType || !folderPath) return

    setUploading(true)

    try {

      const sanitizedName = docName
        .trim()
        .replace(/[^a-zA-Z0-9-_ ]/g, '')
        .replace(/\s+/g, '-')

      const fileExt = file.name.split('.').pop()

      const timestamp = new Date().toISOString()

      const fileName =
        `${timestamp}__${docType}__${sanitizedName}.${fileExt}`

      const fullPath = `${folderPath}/${fileName}`

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(fullPath, file)

      if (error) throw error

      toast({
        title: 'Document uploaded',
        description: 'Your file has been saved.'
      })

      setDocName('')
      setFile(null)
      setDocType('')

      await fetchDocuments()

    } catch (error: any) {

      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive'
      })

    } finally {
      setUploading(false)
    }

  }

  // =========================
  // OPEN FILE
  // =========================
  const openDocument = async (path: string) => {

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60)

    if (error || !data?.signedUrl) {

      toast({
        title: 'Unable to open file',
        description: error?.message || 'Try again later',
        variant: 'destructive'
      })

      return
    }

    window.open(data.signedUrl, '_blank')

  }

  // =========================
  // UI
  // =========================
  return (

    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold">Documents</h1>
        <p className="text-muted-foreground">
          Upload the documents required for your loan application.
        </p>
      </div>

      <Card>

        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
          <CardDescription>
            Select the document type before uploading.
          </CardDescription>
        </CardHeader>

        <CardContent>

          <form
            className="grid gap-4 md:grid-cols-4"
            onSubmit={uploadDocument}
          >

            <div className="space-y-2">
              <Label>Document Type</Label>

              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

            </div>

            <div className="space-y-2">
              <Label>Document name</Label>
              <Input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="March Payroll"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>File</Label>
              <Input
                type="file"
                onChange={(e) =>
                  setFile(e.target.files?.[0] ?? null)
                }
                required
              />
            </div>

            <div className="flex items-end">
              <Button
                type="submit"
                className="w-full"
                disabled={uploading || !docType || !file}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>

          </form>

        </CardContent>

      </Card>

      <Card>

        <CardHeader>
          <CardTitle>All Documents</CardTitle>
          <CardDescription>
            Newest files first
          </CardDescription>
        </CardHeader>

        <CardContent>

          {loading ? (
            <div>Loading documents...</div>
          ) : (

            <Table>

              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">File</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>

                {sortedDocuments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      No documents uploaded
                    </TableCell>
                  </TableRow>
                )}

                {sortedDocuments.map((doc) => (

                  <TableRow key={doc.path}>

                    <TableCell>
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </TableCell>

                    <TableCell>{doc.type}</TableCell>

                    <TableCell>{doc.name}</TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="link"
                        onClick={() => openDocument(doc.path)}
                      >
                        Open
                      </Button>
                    </TableCell>

                  </TableRow>

                ))}

              </TableBody>

            </Table>

          )}

        </CardContent>

      </Card>

    </div>

  )
}