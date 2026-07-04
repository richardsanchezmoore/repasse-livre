import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal } from "@/components/PaginaLegal";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como o Repasse Livre coleta, usa e protege os seus dados pessoais.",
};

const EMAIL_CONTATO = "contato@repasselivre.com";

export default function PrivacidadePage() {
  return (
    <PaginaLegal titulo="Política de Privacidade" atualizadoEm="3 de julho de 2026">
      <p>
        Esta Política de Privacidade explica como o <strong>Repasse Livre</strong> (&ldquo;nós&rdquo;),
        acessível em <a href="https://repasselivre.com">repasselivre.com</a>, coleta, usa, compartilha e
        protege os seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº
        13.709/2018 &ndash; LGPD). Ao usar a plataforma, você concorda com as práticas descritas aqui.
      </p>

      <h2>1. Quem somos</h2>
      <p>
        O Repasse Livre é uma plataforma que reúne e destaca anúncios de veículos anunciados abaixo do
        valor da tabela FIPE, coletados de fontes públicas (como OLX, Webmotors e Mercado Livre) e também
        enviados diretamente por anunciantes. Somos os controladores dos dados pessoais tratados na
        plataforma.
      </p>

      <h2>2. Dados que coletamos</h2>
      <p>Coletamos os seguintes dados, conforme a sua interação com a plataforma:</p>
      <ul>
        <li>
          <strong>Dados de conta e login:</strong> ao criar conta ou entrar com Google, Facebook ou
          e-mail/senha, coletamos seu <strong>nome</strong>, <strong>e-mail</strong> e, quando disponível,
          sua foto de perfil. No login social, recebemos esses dados do provedor escolhido apenas para
          autenticar você — <strong>não publicamos nada</strong> no seu perfil.
        </li>
        <li>
          <strong>Dados de anunciante:</strong> se você anuncia um veículo, coletamos os dados que você
          informa, como <strong>nome</strong>, <strong>WhatsApp</strong> e as informações do veículo.
        </li>
        <li>
          <strong>Dados de navegação e uso:</strong> páginas visitadas, buscas, favoritos, além de dados
          técnicos (endereço IP, tipo de dispositivo e navegador) coletados por cookies e ferramentas de
          análise.
        </li>
      </ul>

      <h2>3. Como usamos os seus dados</h2>
      <ul>
        <li>Autenticar o seu acesso e manter a sua sessão;</li>
        <li>Permitir favoritar oportunidades e publicar anúncios;</li>
        <li>Exibir e intermediar o contato entre interessados e anunciantes;</li>
        <li>Operar, manter e melhorar a plataforma e a relevância das oportunidades;</li>
        <li>Comunicar novidades, avisos de segurança e responder solicitações;</li>
        <li>Medir audiência e desempenho, inclusive remarketing, por ferramentas de análise.</li>
      </ul>

      <h2>4. Compartilhamento com terceiros</h2>
      <p>
        <strong>Não vendemos</strong> os seus dados. Compartilhamos dados apenas com prestadores de
        serviço que viabilizam a plataforma — como infraestrutura de nuvem, autenticação, hospedagem e
        ferramentas de medição de audiência —, sempre limitados ao necessário para operar o serviço.
        Também compartilhamos com os provedores de login que você escolher usar, para autenticar o seu
        acesso, e quando exigido por lei ou ordem judicial.
      </p>

      <h2>5. Cookies e rastreamento</h2>
      <p>
        Usamos cookies e tecnologias semelhantes para manter você conectado, lembrar preferências (como o
        estado selecionado) e medir o uso da plataforma. Você pode gerenciar ou bloquear cookies nas
        configurações do seu navegador, ciente de que isso pode afetar o funcionamento do site.
      </p>

      <h2>6. Seus direitos (LGPD)</h2>
      <p>Você pode, a qualquer momento, solicitar:</p>
      <ul>
        <li>Confirmação de tratamento e acesso aos seus dados;</li>
        <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>Anonimização, bloqueio ou <strong>eliminação</strong> dos dados;</li>
        <li>Portabilidade e informação sobre compartilhamento;</li>
        <li>Revogação do consentimento.</li>
      </ul>
      <p>
        Para exercer esses direitos, escreva para <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>.
        Para apagar sua conta e dados, veja a página de{" "}
        <Link href="/exclusao-de-dados">Exclusão de dados</Link>.
      </p>

      <h2>7. Retenção e segurança</h2>
      <p>
        Mantemos os seus dados apenas pelo tempo necessário às finalidades desta política ou conforme
        exigido por lei. Adotamos medidas técnicas e organizacionais razoáveis para proteger os dados
        contra acesso não autorizado, perda ou alteração indevida.
      </p>

      <h2>8. Alterações desta política</h2>
      <p>
        Podemos atualizar esta política periodicamente. A data de &ldquo;última atualização&rdquo; no topo
        indica a versão vigente. Mudanças relevantes serão sinalizadas na plataforma.
      </p>

      <h2>9. Contato</h2>
      <p>
        Dúvidas sobre esta política ou sobre os seus dados? Fale com o nosso encarregado de dados pelo
        e-mail <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>.
      </p>
    </PaginaLegal>
  );
}
