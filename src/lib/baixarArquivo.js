/**
 * Dispara o download de um arquivo no navegador a partir de conteúdo base64.
 * Usado pelos botões "Baixar modelo" das telas de upload.
 */
export function baixarArquivoBase64(base64, nomeArquivo, tipoMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
  const bytes = atob(base64)
  const buffer = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    buffer[i] = bytes.charCodeAt(i)
  }
  const blob = new Blob([buffer], { type: tipoMime })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
