import { useEffect } from 'react'
import { APP_NAME } from '../lib/constants'

/** Sets `document.title` to "<title> · ResumeFilter AI". */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
  }, [title])
}
