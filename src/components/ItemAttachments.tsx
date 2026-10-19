"use client";

import { useRef } from "react";
import styles from "./ItemAttachments.module.css";
import { useLanguage } from "../context/LanguageContext";

export interface ItemFile {
  id: string;
  fileName: string;
  mimeType: string | null;
  url: string | null;
}

export const ITEM_FILE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
export const MAX_ITEM_FILE_SIZE = 10 * 1024 * 1024;

interface Props {
  files: ItemFile[];
  onAdd?: (files: File[]) => void;
  onRemove?: (id: string) => void;
  busy?: boolean;
}

export default function ItemAttachments({ files, onAdd, onRemove, busy }: Props) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const editable = !!onAdd;

  if (!editable && files.length === 0) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    const valid: File[] = [];
    for (const f of picked) {
      if (!ITEM_FILE_TYPES.includes(f.type)) {
        alert(`${f.name}: ${t("fileTypeNotAllowed")}`);
      } else if (f.size > MAX_ITEM_FILE_SIZE) {
        alert(`${f.name}: ${t("fileSizeLimit")}`);
      } else {
        valid.push(f);
      }
    }
    if (valid.length) onAdd!(valid);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.heading}>{t("referenceImages")}</div>
      <div className={styles.grid}>
        {files.map((f) => {
          const isImage = !!f.mimeType?.startsWith("image/") && !!f.url;
          return (
            <div key={f.id} className={styles.tile}>
              <a
                href={f.url ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.preview}
                title={f.fileName}
              >
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.url!} alt={f.fileName} />
                ) : (
                  <span className={styles.fileBadge}>{f.fileName.split(".").pop()?.toUpperCase() || "FILE"}</span>
                )}
              </a>
              <span className={styles.name} title={f.fileName}>{f.fileName}</span>
              {onRemove && (
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => onRemove(f.id)}
                  aria-label={`${t("removeFile")}: ${f.fileName}`}
                  title={t("removeFile")}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}

        {editable && (
          <button
            type="button"
            className={styles.addTile}
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <span className={styles.plus}>+</span>
            <span>{busy ? t("uploading") : t("addImage")}</span>
          </button>
        )}
      </div>
      {editable && (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
            onChange={handleChange}
            hidden
          />
          <p className={styles.hint}>{t("referenceImagesHint")}</p>
        </>
      )}
    </div>
  );
}
