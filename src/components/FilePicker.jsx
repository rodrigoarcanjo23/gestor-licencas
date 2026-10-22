import { useRef } from 'react'
import { FiPaperclip, FiX, FiFileText } from 'react-icons/fi'
import { ACCEPTED_FILES, MAX_FILE_MB } from '../utils/files'

// file = novo arquivo escolhido; currentName = anexo já salvo
export default function FilePicker({ file, currentName, removed, onPick, onRemove, error }) {
  const input = useRef(null)
  const shownName = file?.name || (!removed && currentName)

  return (
    <div className="field">
      <label>Anexo <span className="muted">(opcional · PDF ou imagem até {MAX_FILE_MB} MB)</span></label>
      {shownName ? (
        <div className="file-chip">
          <FiFileText aria-hidden="true" />
          <span title={shownName}>{shownName}</span>
          {file && <em>novo</em>}
          <button type="button" className="icon-btn" onClick={onRemove} aria-label="Remover anexo"><FiX /></button>
        </div>
      ) : (
        <button type="button" className="file-drop" onClick={() => input.current?.click()}>
          <FiPaperclip aria-hidden="true" /> Escolher arquivo
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_FILES}
        hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = '' }}
      />
      {error && <p className="field__error">{error}</p>}
    </div>
  )
}
