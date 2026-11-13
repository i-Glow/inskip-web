import { useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../ui/Button'
import { useToast } from '../ui/useToast'
import { useCreateChallengeFromFile } from '../../hooks/useChallenges'

export default function NewChallengeUpload() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const create = useCreateChallengeFromFile()
  const toast = useToast()
  const navigate = useNavigate()

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    create.mutate(file, {
      onSuccess: ({ challengeId, imported, skipped, duplicates }) => {
        let msg = `${imported} ${imported > 1 ? 'idées importées' : 'idée importée'}`
        if (duplicates > 0) {
          msg += `, ${duplicates} ${duplicates > 1 ? 'doublons détectés' : 'doublon détecté'}`
        }
        if (skipped > 0) {
          msg += ` · ${skipped} ${skipped > 1 ? 'lignes ignorées' : 'ligne ignorée'} : titre ou description manquant`
        }
        toast.show(msg, 'success')
        navigate(`/challenges/${challengeId}/ideas`)
      },
      onError: (err) => {
        setError(err.message)
        toast.show(err.message, 'error')
      },
    })
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx"
        className="hidden"
        onChange={onChange}
        data-testid="challenge-file-input"
      />
      <Button type="button" disabled={create.isPending} onClick={() => inputRef.current?.click()}>
        {create.isPending ? 'Import en cours…' : 'Nouveau challenge'}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
