import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal } from "@/components/PaginaLegal";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "As regras para uso da plataforma Repasse Livre.",
};

const EMAIL_CONTATO = "contato@repasselivre.com";

export default function TermosPage() {
  return (
    <PaginaLegal titulo="Termos de Uso" atualizadoEm="3 de julho de 2026">
      <p>
        Estes Termos de Uso regem o acesso e o uso da plataforma <strong>Repasse Livre</strong>
        (<a href="https://repasselivre.com">repasselivre.com</a>). Ao acessar ou usar a plataforma, você
        concorda com estes termos. Se não concordar, não utilize o serviço.
      </p>

      <h2>1. O que é o Repasse Livre</h2>
      <p>
        O Repasse Livre é um <strong>agregador de anúncios</strong> de veículos que destaca ofertas
        anunciadas abaixo do valor da tabela FIPE. Parte dos anúncios é coletada de fontes públicas de
        terceiros (como OLX, Webmotors e Mercado Livre); outra parte é enviada por anunciantes. O Repasse
        Livre <strong>não vende veículos</strong> e <strong>não é parte</strong> das negociações — atuamos
        apenas como ponto de descoberta e contato.
      </p>

      <h2>2. Conta e login</h2>
      <p>
        Algumas funções (favoritar e anunciar) exigem conta, criada por e-mail/senha ou login social
        (Google/Facebook). Você é responsável por manter a confidencialidade do seu acesso e por toda
        atividade realizada na sua conta, comprometendo-se a fornecer informações verdadeiras e atualizadas.
      </p>

      <h2>3. Regras de uso</h2>
      <ul>
        <li>Não usar a plataforma para fins ilícitos, fraudulentos ou que violem direitos de terceiros;</li>
        <li>Não publicar anúncios falsos, enganosos ou de veículos que você não está autorizado a vender;</li>
        <li>Não coletar dados de outros usuários nem tentar burlar mecanismos de segurança da plataforma;</li>
        <li>Fornecer informações verídicas nos anúncios e no cadastro.</li>
      </ul>

      <h2>4. Anúncios e conteúdo de terceiros</h2>
      <p>
        Os valores da FIPE são referência de mercado e podem variar. Os anúncios de terceiros são exibidos
        no estado em que foram coletados de suas fontes públicas — <strong>não garantimos</strong> a
        veracidade, disponibilidade, preço ou condição dos veículos, tampouco a idoneidade de anunciantes.
        A negociação, o pagamento e a transferência ocorrem <strong>diretamente entre as partes</strong>,
        por sua conta e risco. Recomendamos toda a cautela usual (vistoria, checagem de documentação e de
        procedência) antes de qualquer transação.
      </p>

      <h2>5. Propriedade intelectual</h2>
      <p>
        A marca, o layout, os textos e os demais elementos próprios do Repasse Livre são protegidos e não
        podem ser copiados ou reutilizados sem autorização. O conteúdo de anúncios de terceiros pertence às
        respectivas fontes e anunciantes.
      </p>

      <h2>6. Limitação de responsabilidade</h2>
      <p>
        A plataforma é fornecida &ldquo;no estado em que se encontra&rdquo;. Na máxima extensão permitida em
        lei, o Repasse Livre não se responsabiliza por prejuízos decorrentes de negociações entre usuários,
        da indisponibilidade temporária do serviço ou de informações de anúncios de terceiros.
      </p>

      <h2>7. Suspensão e encerramento</h2>
      <p>
        Podemos suspender ou encerrar contas que violem estes termos. Você pode encerrar a sua conta a
        qualquer momento — veja a página de <Link href="/exclusao-de-dados">Exclusão de dados</Link>.
      </p>

      <h2>8. Alterações</h2>
      <p>
        Podemos atualizar estes termos periodicamente; a data no topo indica a versão vigente. O uso
        continuado após mudanças representa concordância com a nova versão.
      </p>

      <h2>9. Lei aplicável e contato</h2>
      <p>
        Estes termos são regidos pelas leis brasileiras. Dúvidas? Fale conosco pelo e-mail{" "}
        <a href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>. Veja também a nossa{" "}
        <Link href="/privacidade">Política de Privacidade</Link>.
      </p>
    </PaginaLegal>
  );
}
