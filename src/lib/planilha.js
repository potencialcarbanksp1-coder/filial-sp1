// XLSX é importado dinamicamente dentro de lerArquivoPlanilha() para reduzir o bundle inicial.

/**
 * Lê um arquivo (xlsx, xls ou csv) e retorna um array de objetos,
 * um por linha, com as chaves sendo o cabeçalho original da planilha.
 */
export async function lerArquivoPlanilha(arquivo) {
  const XLSX = await import('xlsx')
  const buffer = await arquivo.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const primeiraAba = workbook.SheetNames[0]
  const planilha = workbook.Sheets[primeiraAba]
  // defval: '' garante que células vazias não quebrem o mapeamento de colunas
  const linhas = XLSX.utils.sheet_to_json(planilha, { defval: '', raw: false })
  return linhas
}

/**
 * Normaliza um texto de cabeçalho: remove acentos, espaços extras,
 * deixa minúsculo e troca espaços por underline.
 * Isso permite reconhecer "Razão Social", "razao social", "RAZAO_SOCIAL" como o mesmo campo.
 */
export function normalizarCabecalho(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/**
 * Dado um objeto "mapa" { nome_coluna_banco: [possíveis nomes na planilha] },
 * e uma linha lida da planilha, devolve um novo objeto já mapeado
 * para os nomes de coluna do banco de dados.
 */
export function mapearLinha(linha, mapaColunas) {
  const linhaNormalizada = {}
  for (const chaveOriginal of Object.keys(linha)) {
    linhaNormalizada[normalizarCabecalho(chaveOriginal)] = linha[chaveOriginal]
  }

  const resultado = {}
  for (const [colunaBanco, possiveisNomes] of Object.entries(mapaColunas)) {
    for (const nomePossivel of possiveisNomes) {
      const chaveNormalizada = normalizarCabecalho(nomePossivel)
      if (linhaNormalizada[chaveNormalizada] !== undefined && linhaNormalizada[chaveNormalizada] !== '') {
        resultado[colunaBanco] = linhaNormalizada[chaveNormalizada]
        break
      }
    }
  }
  return resultado
}

/**
 * Converte um valor de planilha em número, aceitando tanto o formato
 * brasileiro ("1.234.567,89") quanto o americano ("1,234,567.89" ou "R$ 71,708.01"),
 * detectando automaticamente qual separador é o decimal.
 */
export function paraNumero(valor) {
  if (valor === '' || valor === null || valor === undefined) return null
  if (typeof valor === 'number') return valor

  let texto = String(valor).trim()
  if (texto === '-' || texto === '') return 0

  // Remove qualquer símbolo de moeda, espaços e letras (ex: "R$ 71,708.01" -> "71,708.01")
  texto = texto.replace(/[^\d.,-]/g, '')
  if (texto === '' || texto === '-') return 0

  const posUltimaVirgula = texto.lastIndexOf(',')
  const posUltimoPonto = texto.lastIndexOf('.')

  let textoLimpo
  if (posUltimaVirgula === -1 && posUltimoPonto === -1) {
    // Só dígitos, sem separador nenhum
    textoLimpo = texto
  } else if (posUltimaVirgula > posUltimoPonto) {
    // A vírgula vem depois do ponto -> formato brasileiro (1.234,56)
    // Ponto = separador de milhar (remover), vírgula = decimal (trocar por ponto)
    textoLimpo = texto.replace(/\./g, '').replace(',', '.')
  } else if (posUltimoPonto > posUltimaVirgula) {
    // O ponto vem depois da vírgula -> formato americano (1,234.56)
    // Vírgula = separador de milhar (remover), ponto = decimal (mantém)
    textoLimpo = texto.replace(/,/g, '')
  } else {
    // Só um dos dois apareceu uma única vez (ex: "1234.56" ou "1234,56")
    textoLimpo = texto.replace(',', '.')
  }

  const numero = parseFloat(textoLimpo)
  return isNaN(numero) ? null : numero
}

/**
 * Converte uma data de planilha (Date, serial Excel, "dd/mm/aaaa" ou "m/d/aa")
 * para o formato "AAAA-MM-DD" usado pelo banco de dados.
 */
export function paraDataISO(valor) {
  if (!valor) return null
  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10)
  }
  const texto = String(valor).trim()

  // Formato brasileiro: dd/mm/aaaa (ano com 4 dígitos)
  const matchBr = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (matchBr) {
    const [, dia, mes, ano] = matchBr
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
  }

  // Formato americano: m/d/aa ou m/d/aaaa (ano com 2 ou 4 dígitos)
  const matchUs = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (matchUs) {
    let [, mes, dia, ano] = matchUs
    if (ano.length === 2) ano = `20${ano}` // assume século 2000+
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
  }

  return null
}
