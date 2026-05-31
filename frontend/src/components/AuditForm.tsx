import { useRef, useState } from "react";

type Tab = "url" | "image";

interface Props {
  onAuditUrl: (url: string, persona?: string, projectDescription?: string) => void;
  onAuditImage: (files: File[], persona?: string, projectDescription?: string) => void;
  loading: boolean;
}

export default function AuditForm({ onAuditUrl, onAuditImage, loading }: Props) {
  const [tab, setTab] = useState<Tab>("url");
  const [url, setUrl] = useState("");
  const [persona, setPersona] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (url.trim()) onAuditUrl(url.trim(), persona.trim() || undefined, projectDescription.trim() || undefined);
  }

  function handleImageSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length) onAuditImage(files, persona.trim() || undefined, projectDescription.trim() || undefined);
  }

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const valid = Array.from(incoming).filter(f =>
      ["image/png", "image/jpeg", "image/webp"].includes(f.type)
    );
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      return [...prev, ...valid.filter(f => !existing.has(f.name + f.size))];
    });
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  const sharedFields = (
    <>
      <input
        type="text"
        className="input"
        placeholder="Persona hint  (e.g. 'first-time visitor', optional)"
        value={persona}
        onChange={(e) => setPersona(e.target.value)}
      />
      <textarea
        className="input textarea"
        placeholder="Project description  (optional) — describe your app's features and use cases so the audit can check whether all of them are visible in the UI"
        value={projectDescription}
        onChange={(e) => setProjectDescription(e.target.value)}
        rows={3}
      />
    </>
  );

  return (
    <div className="form-card">
      <div className="tabs">
        <button className={tab === "url" ? "tab active" : "tab"} onClick={() => setTab("url")}>
          URL
        </button>
        <button className={tab === "image" ? "tab active" : "tab"} onClick={() => setTab("image")}>
          Upload Image
        </button>
      </div>

      {tab === "url" ? (
        <form onSubmit={handleUrlSubmit} className="form-body">
          <input
            type="url"
            className="input"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          {sharedFields}
          <button type="submit" className="btn-primary" disabled={loading || !url.trim()}>
            {loading ? "Auditing…" : "Run Audit"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleImageSubmit} className="form-body">
          <div
            className={`dropzone${dragOver ? " drag-over" : ""}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {files.length === 0 ? (
              <span>Drop screenshots here or <u>click to browse</u> — multiple allowed</span>
            ) : (
              <ul className="file-list">
                {files.map((f, i) => (
                  <li key={f.name + f.size} className="file-list-item">
                    <span className="file-name">{f.name}</span>
                    <button
                      type="button"
                      className="file-remove"
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              style={{ display: "none" }}
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>
          {sharedFields}
          <button type="submit" className="btn-primary" disabled={loading || files.length === 0}>
            {loading ? "Auditing…" : "Run Audit"}
          </button>
        </form>
      )}
    </div>
  );
}
