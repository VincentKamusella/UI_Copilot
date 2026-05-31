import { useRef, useState } from "react";

type Tab = "url" | "image";

interface Props {
  onAuditUrl: (url: string, persona?: string, projectDescription?: string) => void;
  onAuditImage: (file: File, persona?: string, projectDescription?: string) => void;
  loading: boolean;
}

export default function AuditForm({ onAuditUrl, onAuditImage, loading }: Props) {
  const [tab, setTab] = useState<Tab>("url");
  const [url, setUrl] = useState("");
  const [persona, setPersona] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (url.trim()) onAuditUrl(url.trim(), persona.trim() || undefined, projectDescription.trim() || undefined);
  }

  function handleImageSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (file) onAuditImage(file, persona.trim() || undefined, projectDescription.trim() || undefined);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
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
            {file ? (
              <span className="file-name">{file.name}</span>
            ) : (
              <span>Drop a PNG / JPEG here or <u>click to browse</u></span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {sharedFields}
          <button type="submit" className="btn-primary" disabled={loading || !file}>
            {loading ? "Auditing…" : "Run Audit"}
          </button>
        </form>
      )}
    </div>
  );
}
