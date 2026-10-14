import { Download, ExternalLink, FileText } from 'lucide-react'
import { useState } from 'react'
import { resumesApi } from '../../api/endpoints'
import { ButtonAnchor, Card, CardHeader, SegmentedControl } from '../../components/ui'
import { fileExtension } from '../../lib/format'

type View = 'original' | 'text'

export function ResumeViewer({
  resumeId,
  filename,
  contentType,
  rawText,
}: {
  resumeId: string
  filename: string
  contentType: string
  rawText: string
}) {
  const isPdf = contentType.toLowerCase().includes('pdf') || fileExtension(filename) === 'pdf'
  const [view, setView] = useState<View>(isPdf ? 'original' : 'text')
  const fileUrl = resumesApi.fileUrl(resumeId)

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Resume"
        description={filename}
        icon={<FileText className="h-4 w-4" />}
        actions={
          <>
            {isPdf && (
              <SegmentedControl<View>
                size="sm"
                ariaLabel="Resume view"
                value={view}
                onChange={setView}
                options={[
                  { value: 'original', label: 'Original PDF' },
                  { value: 'text', label: 'Extracted text' },
                ]}
              />
            )}
            <ButtonAnchor
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              size="sm"
              variant="secondary"
              icon={isPdf ? <ExternalLink className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
              {...(isPdf ? {} : { download: filename })}
            >
              {isPdf ? 'Open original' : 'Download original'}
            </ButtonAnchor>
          </>
        }
      />
      {view === 'original' && isPdf ? (
        <iframe src={fileUrl} title={`Resume of ${filename}`} className="block h-[80vh] max-h-[1100px] min-h-[600px] w-full border-0 bg-slate-100" />
      ) : rawText.trim() ? (
        <pre className="max-h-[700px] overflow-auto bg-slate-50/60 px-5 py-4 font-sans text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
          {rawText}
        </pre>
      ) : (
        <p className="px-5 py-6 text-sm text-slate-400">No text could be extracted from this file.</p>
      )}
    </Card>
  )
}
