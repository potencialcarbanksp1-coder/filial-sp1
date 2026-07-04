import BotaoUpload from '../components/BotaoUpload.jsx'
import BotaoBaixarModelo from '../components/BotaoBaixarModelo.jsx'
import { MODELO_LOJAS_BASE64, MODELO_POTENCIAL_BASE64, MODELO_PRODUCAO_BASE64 } from '../lib/modelosPlanilha.js'

export default function PaginaUpload({
  metaMeses,
  processando,
  uploadPotencial,
  uploadLojas,
  uploadProducao,
  aoEscolherArquivoNovoMes,
}) {
  return (
    <div className="pagina-secao">
      <h1 className="titulo-pagina">Upload de bases</h1>
      <p className="subtitulo-pagina">
        Envie aqui os arquivos de planilha (.xlsx ou .csv) para atualizar cada base de dados do painel.
      </p>

      <div className="grade-upload">
        <div className="cartao-upload">
          <h3>Potencial</h3>
          <p>Base de potencial de mercado por loja (aba SP1).</p>
          <BotaoUpload rotulo="Selecionar arquivo" processando={processando === 'potencial'} aoSelecionar={uploadPotencial} />
          <BotaoBaixarModelo base64={MODELO_POTENCIAL_BASE64} nomeArquivo="Modelo_Potencial.xlsx" />
        </div>

        <div className="cartao-upload">
          <h3>Lojas</h3>
          <p>Cadastro completo das lojas (endereço, GCM, CNPJ).</p>
          <BotaoUpload rotulo="Selecionar arquivo" processando={processando === 'lojas'} aoSelecionar={uploadLojas} />
          <BotaoBaixarModelo base64={MODELO_LOJAS_BASE64} nomeArquivo="Modelo_Lojas.xlsx" />
        </div>

        <div className="cartao-upload">
          <h3>Produção M3</h3>
          <p>Substitui apenas o mês mais antigo (atualmente: {metaMeses.M3 || 'sem dados'}).</p>
          <BotaoUpload
            rotulo="Selecionar arquivo"
            processando={processando === 'M3'}
            aoSelecionar={(arq) => uploadProducao(arq, 'M3')}
            ultimaAtualizacao={metaMeses.M3}
          />
          <BotaoBaixarModelo base64={MODELO_PRODUCAO_BASE64} nomeArquivo="Modelo_Producao.xlsx" />
        </div>

        <div className="cartao-upload">
          <h3>Produção M2</h3>
          <p>Substitui apenas o mês anterior (atualmente: {metaMeses.M2 || 'sem dados'}).</p>
          <BotaoUpload
            rotulo="Selecionar arquivo"
            processando={processando === 'M2'}
            aoSelecionar={(arq) => uploadProducao(arq, 'M2')}
            ultimaAtualizacao={metaMeses.M2}
          />
          <BotaoBaixarModelo base64={MODELO_PRODUCAO_BASE64} nomeArquivo="Modelo_Producao.xlsx" />
        </div>

        <div className="cartao-upload">
          <h3>Produção M1</h3>
          <p>Substitui apenas o mês atual (atualmente: {metaMeses.M1 || 'sem dados'}), sem mover nada.</p>
          <BotaoUpload
            rotulo="Selecionar arquivo"
            processando={processando === 'M1'}
            aoSelecionar={(arq) => uploadProducao(arq, 'M1')}
            ultimaAtualizacao={metaMeses.M1}
          />
          <BotaoBaixarModelo base64={MODELO_PRODUCAO_BASE64} nomeArquivo="Modelo_Producao.xlsx" />
        </div>

        <div className="cartao-upload cartao-upload-destaque">
          <h3>Novo mês</h3>
          <p>Avança a esteira (M1→M2→M3, descarta M3 antigo) e insere o arquivo como o novo mês atual.</p>
          <BotaoUpload rotulo="Selecionar arquivo" processando={processando === 'NOVO_MES'} aoSelecionar={aoEscolherArquivoNovoMes} />
          <BotaoBaixarModelo base64={MODELO_PRODUCAO_BASE64} nomeArquivo="Modelo_Producao.xlsx" />
        </div>
      </div>
    </div>
  )
}
