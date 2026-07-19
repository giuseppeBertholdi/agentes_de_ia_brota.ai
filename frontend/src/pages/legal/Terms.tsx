import LegalLayout from './LegalLayout'

export default function Terms() {
  return (
    <LegalLayout title="Termos de Uso" updatedAt="16 de julho de 2026">
      <p>
        Estes Termos de Uso regem o acesso e uso da plataforma Plimpost ("Plimpost", "nós", "plataforma"),
        operada por Giuseppe Bertholdi, pessoa física/empreendedor individual, sediado no Brasil. Ao criar
        uma conta ou utilizar a Plimpost, você ("cliente", "usuário") concorda com estes termos.
      </p>

      <section>
        <h2>1. O que é a Plimpost</h2>
        <p>
          A Plimpost é uma plataforma que conecta ao número de WhatsApp Business do cliente agentes de
          inteligência artificial capazes de atender, orçar e acompanhar conversas com os clientes finais
          do cliente, além de oferecer um painel de gestão (conversas, cotações, relatórios e configurações).
        </p>
      </section>

      <section>
        <h2>2. Cadastro e responsabilidade pela conta</h2>
        <p>
          Você é responsável por manter a veracidade dos dados cadastrais, pela guarda de suas credenciais
          de acesso e por toda atividade realizada na sua conta. Avise-nos imediatamente em caso de uso não
          autorizado da sua conta.
        </p>
      </section>

      <section>
        <h2>3. Plano, cobrança e cancelamento</h2>
        <p>
          A Plimpost é oferecida em plano único de assinatura mensal recorrente, no valor vigente exibido na
          página de preços no momento da contratação. A cobrança é processada por um terceiro (Stripe) e só
          é iniciada quando você conecta um número de WhatsApp à plataforma — a etapa de configuração inicial
          (onboarding) é gratuita.
        </p>
        <p>
          Você pode cancelar a assinatura a qualquer momento pelo painel ou entrando em contato pelo suporte,
          sem multa. O cancelamento interrompe cobranças futuras; valores já pagos por períodos em andamento
          não são reembolsados proporcionalmente, salvo obrigação legal em contrário.
        </p>
        <p>
          Em caso de falha de pagamento, a assinatura pode ser marcada como inadimplente e o atendimento
          automático via WhatsApp suspenso até a regularização.
        </p>
      </section>

      <section>
        <h2>4. Uso aceitável</h2>
        <p>Ao usar a Plimpost, você concorda em não:</p>
        <ul>
          <li>Utilizar a plataforma para enviar mensagens não solicitadas (spam) ou violar as políticas comerciais da Meta/WhatsApp;</li>
          <li>Usar os agentes de IA para fins ilegais, fraudulentos, discriminatórios ou que violem direitos de terceiros;</li>
          <li>Tentar contornar limites técnicos, de uso ou de segurança da plataforma;</li>
          <li>Revender ou sublicenciar o acesso à Plimpost sem autorização prévia por escrito.</li>
        </ul>
        <p>
          Para preservar a qualidade e o custo do serviço para todos os clientes, o volume de respostas
          automáticas geradas por IA está sujeito a um limite de uso razoável por mês, informado no painel
          quando aplicável. Ao atingir o limite, o atendimento automático é pausado até o próximo ciclo,
          sem interromper o acesso ao restante da plataforma.
        </p>
      </section>

      <section>
        <h2>5. Integrações com terceiros</h2>
        <p>
          A Plimpost depende de serviços de terceiros para funcionar, entre eles a WhatsApp Business Platform
          (Meta), provedores de inteligência artificial (OpenAI), infraestrutura de banco de dados e
          autenticação (Supabase) e processamento de pagamentos (Stripe). O uso desses serviços está sujeito
          também aos termos e políticas de cada provedor, e eventuais indisponibilidades desses terceiros
          podem afetar o funcionamento da Plimpost.
        </p>
      </section>

      <section>
        <h2>6. Conteúdo e dados do cliente</h2>
        <p>
          Você mantém a titularidade dos dados que insere na plataforma (tabela de preços, descrição do
          negócio, conversas com seus clientes finais etc.). Você declara ter base legal para que a Plimpost
          processe, em seu nome, as conversas do WhatsApp do seu negócio, inclusive por meio de IA.
        </p>
      </section>

      <section>
        <h2>7. Disponibilidade e limitação de responsabilidade</h2>
        <p>
          A Plimpost é fornecida "como está". Empregamos esforços razoáveis para manter o serviço disponível,
          mas não garantimos operação ininterrupta ou livre de erros, especialmente diante de falhas de
          terceiros (Meta, OpenAI, Supabase, Stripe) fora do nosso controle. Na máxima extensão permitida
          por lei, não respondemos por lucros cessantes ou danos indiretos decorrentes do uso da plataforma.
        </p>
      </section>

      <section>
        <h2>8. Alterações destes termos</h2>
        <p>
          Podemos atualizar estes Termos de Uso periodicamente. Alterações relevantes serão comunicadas por
          e-mail ou aviso no painel. O uso continuado da Plimpost após a alteração implica concordância com
          os novos termos.
        </p>
      </section>

      <section>
        <h2>9. Lei aplicável</h2>
        <p>
          Estes termos são regidos pelas leis da República Federativa do Brasil, com foro eleito para
          dirimir eventuais controvérsias o domicílio do responsável pela Plimpost, salvo disposição legal em contrário.
        </p>
      </section>

      <section>
        <h2>10. Contato</h2>
        <p>
          Dúvidas sobre estes termos podem ser enviadas para{' '}
          <a href="mailto:giuseppe.bertholdi@gmail.com" className="text-green font-bold hover:underline">
            giuseppe.bertholdi@gmail.com
          </a>.
        </p>
      </section>
    </LegalLayout>
  )
}
