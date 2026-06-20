"use client";

import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";

const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024;
const MAXIMO_FOTOS = 10;

export interface FotoEnviada {
  id: string;
  nomeArquivo: string;
  previewUrl: string;
  progresso: number;
  status: "enviando" | "ok" | "erro";
  principal: boolean;
  url?: string;
  caminho?: string;
  erro?: string;
}

function uploadComProgresso(
  arquivo: File,
  onProgresso: (percentual: number) => void
): Promise<{ url: string; caminho: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("foto", arquivo);

    xhr.upload.onprogress = (evento) => {
      if (evento.lengthComputable) {
        onProgresso(Math.round((evento.loaded / evento.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const resposta = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ url: resposta.url, caminho: resposta.caminho });
        } else {
          reject(new Error(resposta.erro ?? "Falha ao enviar a foto."));
        }
      } catch {
        reject(new Error("Falha ao enviar a foto."));
      }
    };
    xhr.onerror = () => reject(new Error("Falha de rede ao enviar a foto."));
    xhr.open("POST", "/api/fotos");
    xhr.send(formData);
  });
}

export function DropzoneFotos({
  fotos,
  onChange,
}: {
  fotos: FotoEnviada[];
  onChange: Dispatch<SetStateAction<FotoEnviada[]>>;
}) {
  const [arrastandoSobre, setArrastandoSobre] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const adicionarArquivos = useCallback(
    (arquivos: FileList | File[]) => {
      const vagas = MAXIMO_FOTOS - fotos.length;
      const lista = Array.from(arquivos).slice(0, Math.max(vagas, 0));

      const novasFotos: FotoEnviada[] = lista.map((arquivo) => ({
        id: crypto.randomUUID(),
        nomeArquivo: arquivo.name,
        previewUrl: URL.createObjectURL(arquivo),
        progresso: 0,
        status: arquivo.type.startsWith("image/")
          ? arquivo.size > TAMANHO_MAXIMO_FOTO
            ? "erro"
            : "enviando"
          : "erro",
        erro: !arquivo.type.startsWith("image/")
          ? "Só são aceitas imagens."
          : arquivo.size > TAMANHO_MAXIMO_FOTO
            ? "Máximo de 5MB."
            : undefined,
        principal: false,
      }));

      onChange((fotosAtuais) => [...fotosAtuais, ...novasFotos]);

      novasFotos
        .filter((f) => f.status === "enviando")
        .forEach((fotoPendente, indice) => {
          uploadComProgresso(lista[indice], (progresso) => {
            onChange((fotosAtuais) =>
              fotosAtuais.map((f) => (f.id === fotoPendente.id ? { ...f, progresso } : f))
            );
          })
            .then(({ url, caminho }) => {
              onChange((fotosAtuais) => {
                const jaTemPrincipal = fotosAtuais.some((f) => f.status === "ok" && f.principal);
                return fotosAtuais.map((f) =>
                  f.id === fotoPendente.id
                    ? { ...f, status: "ok", progresso: 100, url, caminho, principal: !jaTemPrincipal }
                    : f
                );
              });
            })
            .catch((erro: Error) => {
              onChange((fotosAtuais) =>
                fotosAtuais.map((f) =>
                  f.id === fotoPendente.id ? { ...f, status: "erro", erro: erro.message } : f
                )
              );
            });
        });
    },
    [fotos.length, onChange]
  );

  function removerFoto(foto: FotoEnviada) {
    onChange((fotosAtuais) => {
      const restantes = fotosAtuais.filter((f) => f.id !== foto.id);
      if (!foto.principal) return restantes;
      const idProxima = restantes.find((f) => f.status === "ok")?.id;
      return restantes.map((f) => (f.id === idProxima ? { ...f, principal: true } : f));
    });
    URL.revokeObjectURL(foto.previewUrl);
    if (foto.caminho) {
      fetch("/api/fotos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caminho: foto.caminho }),
      }).catch(() => {});
    }
  }

  function definirComoPrincipal(foto: FotoEnviada) {
    onChange((fotosAtuais) =>
      fotosAtuais.map((f) => ({ ...f, principal: f.id === foto.id }))
    );
  }

  return (
    <div className="dropzone-container">
      <label
        className={`dropzone ${arrastandoSobre ? "dropzone-ativa" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastandoSobre(true);
        }}
        onDragLeave={() => setArrastandoSobre(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastandoSobre(false);
          if (e.dataTransfer.files.length) adicionarArquivos(e.dataTransfer.files);
        }}
      >
        <p>📷 Arraste fotos aqui ou clique para escolher</p>
        <small>Até {MAXIMO_FOTOS} fotos, JPG/PNG, máximo 5MB cada</small>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) adicionarArquivos(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {fotos.length > 0 && (
        <div className="dropzone-lista">
          {fotos.map((foto) => (
            <div key={foto.id} className="dropzone-item">
              <img src={foto.previewUrl} alt={foto.nomeArquivo} />
              {foto.status === "enviando" && (
                <div className="dropzone-progresso">
                  <div className="dropzone-progresso-barra" style={{ width: `${foto.progresso}%` }} />
                  <span>{foto.progresso}%</span>
                </div>
              )}
              {foto.status === "erro" && <small className="campo-erro">{foto.erro}</small>}
              {foto.status === "ok" && foto.principal && (
                <span className="dropzone-selo-principal">Principal</span>
              )}
              {foto.status === "ok" && !foto.principal && (
                <button
                  type="button"
                  className="dropzone-definir-principal"
                  onClick={() => definirComoPrincipal(foto)}
                >
                  Definir como principal
                </button>
              )}
              <button
                type="button"
                className="dropzone-remover"
                onClick={() => removerFoto(foto)}
                aria-label="Remover foto"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
