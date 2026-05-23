import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { User } from '@supabase/supabase-js'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'

import { Button } from '@/components/ui/button'

import { Input } from '@/components/ui/input'

import { Label } from '@/components/ui/label'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

import { supabase } from '@/integrations/supabase/client'

import { useToast } from '@/hooks/use-toast'

const BUCKET = 'clients_documents'

const DOCUMENT_TYPES = [
  { value: 'payslip', label: 'Payslip' },
  { value: 'certificate_employment', label: 'Certificate of Employment' },
  { value: 'government_id', label: 'Government ID' },
  {
    value: 'selfie_with_government_id',
    label: 'Selfie Holding Government ID'
  },
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

export function DocumentsView({
  user,
  internalUserId
}: DocumentsViewProps) {

  const [searchParams] = useSearchParams()

  const { toast } = useToast()

  const [documents, setDocuments] =
    useState<DocumentRow[]>([])

  const [loading, setLoading] =
    useState(true)

  const [uploading, setUploading] =
    useState(false)

  const [docType, setDocType] =
    useState('')

  const [docName, setDocName] =
    useState('')

  const [file, setFile] =
    useState<File | null>(null)

  const [folderPath, setFolderPath] =
    useState<string | null>(null)

  // =========================
  // RESOLVE FOLDER
  // ALWAYS USE internal_user_id
  // =========================
  useEffect(() => {

    const resolveFolder = async () => {

      try {

        setLoading(true)

        const urlEmail =
          searchParams.get('email')

        // =========================
        // IMPERSONATION MODE
        // =========================
        if (urlEmail) {

          const normalizedEmail =
            urlEmail
              .trim()
              .toLowerCase()

          const { data, error } =
            await supabase
              .from('userProfiles')
              .select('internal_user_id')
              .eq(
                'email',
                normalizedEmail
              )
              .maybeSingle()

          if (error) {
            throw error
          }

          if (!data?.internal_user_id) {

            throw new Error(
              'Unable to resolve impersonated internal_user_id'
            )

          }

          console.log(
            'Resolved impersonated folder',
            {
              email: normalizedEmail,
              internalUserId:
                data.internal_user_id
            }
          )

          setFolderPath(
            data.internal_user_id
          )

          return

        }

        // =========================
        // NORMAL USER MODE
        // =========================
        if (!user?.email) {

          throw new Error(
            'Authenticated user email missing'
          )

        }

        const normalizedEmail =
          user.email
            .trim()
            .toLowerCase()

        const { data, error } =
          await supabase
            .from('userProfiles')
            .select('internal_user_id')
            .eq(
              'email',
              normalizedEmail
            )
            .maybeSingle()

        if (error) {
          throw error
        }

        if (!data?.internal_user_id) {

          throw new Error(
            'Unable to resolve internal_user_id'
          )

        }

        // =========================
        // SAFETY CHECK
        // =========================
        if (
          data.internal_user_id === user.id
        ) {

          console.warn(
            'internal_user_id matches auth.users.id',
            {
              email: normalizedEmail,
              authUserId: user.id,
              internalUserId:
                data.internal_user_id
            }
          )

        }

        console.log(
          'Resolved document folder',
          {
            email: normalizedEmail,
            authUserId: user.id,
            internalUserId:
              data.internal_user_id
          }
        )

        // 🚫 NEVER FALL BACK TO auth.users.id
        setFolderPath(
          data.internal_user_id
        )

      } catch (error: any) {

        console.error(
          'Failed to resolve document folder',
          error
        )

        setFolderPath(null)

        toast({
          title:
            'Unable to initialize documents',
          description:
            error.message ||
            'Please refresh and try again.',
          variant: 'destructive'
        })

      } finally {

        setLoading(false)

      }

    }

    resolveFolder()

  }, [user?.email, searchParams])

  // =========================
  // SORT
  // =========================
  const sortedDocuments = useMemo(
    () =>
      [...documents].sort(
        (a, b) =>
          new Date(
            b.createdAt
          ).getTime() -
          new Date(
            a.createdAt
          ).getTime()
      ),
    [documents]
  )

  // =========================
  // FETCH DOCUMENTS
  // =========================
  const fetchDocuments =
    async () => {

      if (!folderPath) return

      setLoading(true)

      try {

        const { data, error } =
          await supabase.storage
            .from(BUCKET)
            .list(folderPath)

        if (error) {
          throw error
        }

        const rows: DocumentRow[] =
          (data ?? [])
            .filter(
              (item) => item.name
            )
            .map((item) => {

              const parts =
                item.name.split('__')

              const type =
                parts[1] || 'unknown'

              const rawName =
                parts[2] || item.name

              return {
                type,
                name:
                  rawName.replace(
                    /\.[^/.]+$/,
                    ''
                  ),
                path:
                  `${folderPath}/${item.name}`,
                createdAt:
                  item.created_at ||
                  new Date().toISOString()
              }

            })

        setDocuments(rows)

      } catch (error: any) {

        toast({
          title:
            'Unable to load documents',
          description:
            error.message,
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
  // UPLOAD DOCUMENT
  // =========================
  const uploadDocument =
    async (event: FormEvent) => {

      event.preventDefault()

      if (
        !file ||
        !docName.trim() ||
        !docType
      ) {
        return
      }

      // 🚫 BLOCK UNTIL internal_user_id RESOLVED
      if (!folderPath) {

        toast({
          title: 'Upload blocked',
          description:
            'internal_user_id is not resolved yet.',
          variant: 'destructive'
        })

        return

      }

      // 🚫 NEVER ALLOW auth.users.id
      if (
        folderPath === user?.id
      ) {

        toast({
          title: 'Upload blocked',
          description:
            'Refusing upload using auth.users.id',
          variant: 'destructive'
        })

        return

      }

      setUploading(true)

      try {

        const sanitizedName =
          docName
            .trim()
            .replace(
              /[^a-zA-Z0-9-_ ]/g,
              ''
            )
            .replace(/\s+/g, '-')

        const fileExt =
          file.name
            .split('.')
            .pop()

        const timestamp =
          new Date().toISOString()

        const fileName =
          `${timestamp}__${docType}__${sanitizedName}.${fileExt}`

        const fullPath =
          `${folderPath}/${fileName}`

        console.log(
          'Uploading document',
          {
            bucket: BUCKET,
            fullPath,
            authUserId: user?.id,
            folderPath
          }
        )

        const { error } =
          await supabase.storage
            .from(BUCKET)
            .upload(
              fullPath,
              file
            )

        if (error) {
          throw error
        }

        toast({
          title:
            'Document uploaded',
          description:
            'Your file has been saved.'
        })

        setDocName('')
        setFile(null)
        setDocType('')

        await fetchDocuments()

      } catch (error: any) {

        toast({
          title:
            'Upload failed',
          description:
            error.message,
          variant: 'destructive'
        })

      } finally {

        setUploading(false)

      }

    }

  // =========================
  // OPEN FILE
  // =========================
  const openDocument =
    async (path: string) => {

      const { data, error } =
        await supabase.storage
          .from(BUCKET)
          .createSignedUrl(
            path,
            60
          )

      if (
        error ||
        !data?.signedUrl
      ) {

        toast({
          title:
            'Unable to open file',
          description:
            error?.message ||
            'Try again later',
          variant: 'destructive'
        })

        return

      }

      window.open(
        data.signedUrl,
        '_blank'
      )

    }

  // =========================
  // UI
  // =========================
  return (

    <div className="space-y-6">

      <div>

        <h1 className="text-3xl font-bold">
          Documents
        </h1>

        <p className="text-muted-foreground">
          Upload the documents required
          for your loan application.
        </p>

      </div>

      <Card>

        <CardHeader>

          <CardTitle>
            Upload Document
          </CardTitle>

          <CardDescription>
            Select the document type
            before uploading.
          </CardDescription>

        </CardHeader>

        <CardContent>

          <form
            className="grid gap-4 md:grid-cols-4"
            onSubmit={uploadDocument}
          >

            <div className="space-y-2">

              <Label>
                Document Type
              </Label>

              <Select
                value={docType}
                onValueChange={
                  setDocType
                }
              >

                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>

                <SelectContent>

                  {DOCUMENT_TYPES.map(
                    (t) => (

                      <SelectItem
                        key={t.value}
                        value={t.value}
                      >
                        {t.label}
                      </SelectItem>

                    )
                  )}

                </SelectContent>

              </Select>

            </div>

            <div className="space-y-2">

              <Label>
                Document name
              </Label>

              <Input
                value={docName}
                onChange={(e) =>
                  setDocName(
                    e.target.value
                  )
                }
                placeholder="March Payroll"
                required
              />

            </div>

            <div className="space-y-2">

              <Label>
                File
              </Label>

              <Input
                type="file"
                onChange={(e) =>
                  setFile(
                    e.target.files?.[0] ??
                    null
                  )
                }
                required
              />

            </div>

            <div className="flex items-end">

              <Button
                type="submit"
                className="w-full"
                disabled={
                  uploading ||
                  !docType ||
                  !file ||
                  !folderPath
                }
              >

                {uploading
                  ? 'Uploading...'
                  : 'Upload'}

              </Button>

            </div>

          </form>

        </CardContent>

      </Card>

      <Card>

        <CardHeader>

          <CardTitle>
            All Documents
          </CardTitle>

          <CardDescription>
            Newest files first
          </CardDescription>

        </CardHeader>

        <CardContent>

          {loading ? (

            <div>
              Loading documents...
            </div>

          ) : (

            <Table>

              <TableHeader>

                <TableRow>

                  <TableHead>
                    Date
                  </TableHead>

                  <TableHead>
                    Type
                  </TableHead>

                  <TableHead>
                    Name
                  </TableHead>

                  <TableHead className="text-right">
                    File
                  </TableHead>

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

                {sortedDocuments.map(
                  (doc) => (

                    <TableRow
                      key={doc.path}
                    >

                      <TableCell>
                        {new Date(
                          doc.createdAt
                        ).toLocaleDateString()}
                      </TableCell>

                      <TableCell>
                        {doc.type}
                      </TableCell>

                      <TableCell>
                        {doc.name}
                      </TableCell>

                      <TableCell className="text-right">

                        <Button
                          variant="link"
                          onClick={() =>
                            openDocument(
                              doc.path
                            )
                          }
                        >
                          Open
                        </Button>

                      </TableCell>

                    </TableRow>

                  )
                )}

              </TableBody>

            </Table>

          )}

        </CardContent>

      </Card>

    </div>

  )

}