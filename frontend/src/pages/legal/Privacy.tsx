import LegalLayout from './LegalLayout'

export default function Privacy() {
  return (
    <LegalLayout title="Política de Privacidade" updatedAt="16 de julho de 2026">
      <p>
        Esta Política de Privacidade descreve como a Plimpost coleta, usa, compartilha e protege dados
        pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
        O controlador dos dados é Giuseppe Bertholdi, responsável pela operação da Plimpost, contato
        <a href="mailto:giuseppe.bertholdi@gmail.com" className="text-green font-bold hover:underline"> giuseppe.bertholdi@gmail.com</a>.
      </p>

      <section>
        <h2>1. Quais dados coletamos</h2>
        <p>Coletamos duas categorias de dados:</p>
        <ul>
          <li>
            <b>Dados do cliente da Plimpost</b> (dono do negócio): nome, e-mail, dados da empresa, dados de
            pagamento processados pelo Stripe (não armazenamos números de cartão), tabela de preços, tom de
            voz configurado e conteúdo cadastrado no painel;
          </li>
          <li>
            <b>Dados dos clientes finais do negócio</b>, coletados via WhatsApp em nome do cliente da
            Plimpost: número de telefone, nome de perfil e conteúdo das mensagens trocadas com os agentes
            de IA, necessários para o atendimento automatizado funcionar.
          </li>
        </ul>
        <p>
          Para os dados de clientes finais, a Plimpost atua como operadora de dados, processando-os em nome
          e sob instrução do cliente que contratou a plataforma, que é o controlador dessa relação.
        </p>
      </section>

      <section>
        <h2>2. Para que usamos os dados</h2>
        <ul>
          <li>Viabilizar o funcionamento dos agentes de IA (recepção, cotação, pós-venda);</li>
          <li>Autenticação, segurança e prevenção a fraude;</li>
          <li>Processamento de pagamentos e gestão de assinatura;</li>
          <li>Envio de comunicações operacionais (confirmações, avisos de cobrança, suporte);</li>
          <li>Métricas e relatórios exibidos no painel do próprio cliente;</li>
          <li>Cumprimento de obrigações legais e regulatórias.</li>
        </ul>
        <p>Não vendemos dados pessoais a terceiros.</p>
      </section>

      <section>
        <h2>3. Com quem compartilhamos dados</h2>
        <p>Para operar a Plimpost, compartilhamos dados com os seguintes subprocessadores:</p>
        <ul>
          <li><b>Meta / WhatsApp Business Platform</b> — envio e recebimento de mensagens;</li>
          <li><b>OpenAI</b> — geração das respostas dos agentes de IA a partir do conteúdo das conversas;</li>
          <li><b>Supabase</b> — banco de dados, autenticação e infraestrutura de tempo real;</li>
          <li><b>Stripe</b> — processamento de pagamentos e dados de cobrança;</li>
          <li><b>Netlify e Render</b> — hospedagem do frontend e backend da aplicação.</li>
        </ul>
        <p>
          Cada um desses provedores possui suas próprias políticas de privacidade e é responsável pela
          proteção dos dados que processa em seus sistemas.
        </p>
      </section>

      <section>
        <h2>4. Retenção de dados</h2>
        <p>
          Mantemos os dados pelo tempo necessário para prestar o serviço e cumprir obrigações legais
          (por exemplo, fiscais). Ao encerrar a conta, os dados da empresa e as conversas associadas podem
          ser excluídos ou anonimizados em até 90 dias, exceto quando a retenção for exigida por lei.
        </p>
      </section>

      <section>
        <h2>5. Segurança</h2>
        <p>
          Utilizamos controle de acesso por autenticação (JWT), isolamento de dados por empresa via Row
          Level Security no banco de dados, e conexões criptografadas (HTTPS/TLS) entre frontend, backend
          e provedores integrados. Nenhum sistema é 100% livre de risco; caso identifiquemos um incidente de
          segurança relevante, notificaremos os clientes afetados e a ANPD conforme exigido pela LGPD.
        </p>
      </section>

      <section>
        <h2>6. Seus direitos como titular de dados</h2>
        <p>Nos termos da LGPD, você pode solicitar a qualquer momento:</p>
        <ul>
          <li>Confirmação da existência de tratamento e acesso aos seus dados;</li>
          <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei;</li>
          <li>Portabilidade dos dados a outro fornecedor;</li>
          <li>Revogação do consentimento e eliminação dos dados tratados com base nele;</li>
          <li>Informação sobre com quem seus dados são compartilhados.</li>
        </ul>
        <p>
          Se você é cliente final atendido via WhatsApp por uma empresa que usa a Plimpost, seus pedidos
          devem ser direcionados primeiro a essa empresa (controladora dos seus dados); ainda assim, pode
          nos contatar diretamente e encaminharemos a solicitação.
        </p>
      </section>

      <section>
        <h2>7. Cookies e dados de navegação</h2>
        <p>
          O painel da Plimpost usa armazenamento local do navegador (localStorage) para manter sua sessão
          autenticada. Não utilizamos cookies de rastreamento publicitário.
        </p>
      </section>

      <section>
        <h2>8. Alterações desta política</h2>
        <p>
          Podemos atualizar esta política periodicamente. Alterações relevantes serão comunicadas por e-mail
          ou aviso no painel, com indicação da nova data de atualização no topo desta página.
        </p>
      </section>

      <section>
        <h2>9. Contato</h2>
        <p>
          Para exercer seus direitos ou tirar dúvidas sobre esta política, escreva para{' '}
          <a href="mailto:giuseppe.bertholdi@gmail.com" className="text-green font-bold hover:underline">
            giuseppe.bertholdi@gmail.com
          </a>.
        </p>
      </section>
    </LegalLayout>
  )
}
