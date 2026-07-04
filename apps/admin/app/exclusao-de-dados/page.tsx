import type { Metadata } from "next";
import Link from "next/link";
import { PaginaLegal } from "@/components/PaginaLegal";

export const metadata: Metadata = {
  title: "Exclusão de dados",
  description: "Como solicitar a exclusão dos seus dados e da sua conta no Repasse Livre.",
};

const EMAIL_CONTATO = "contato@repasselivre.com";

export default function ExclusaoDeDadosPage() {
  return (
    <PaginaLegal titulo="Exclusão de dados do usuário" atualizadoEm="3 de julho de 2026">
      <p>
        Você pode solicitar, a qualquer momento e sem custo, a exclusão da sua conta e dos dados pessoais
        que o <strong>Repasse Livre</strong> mantém sobre você, incluindo os obtidos por login com Google
        ou Facebook.
      </p>

      <h2>Como solicitar</h2>
      <p>
        Envie um e-mail para <a href={`mailto:${EMAIL_CONTATO}?subject=Exclusão%20de%20dados`}>{EMAIL_CONTATO}</a>{" "}
        com o assunto <strong>&ldquo;Exclusão de dados&rdquo;</strong>, a partir do e-mail cadastrado na sua
        conta (ou informando o e-mail usado no login social), pedindo a exclusão. Podemos solicitar uma
        confirmação simples para verificar que o pedido é realmente seu.
      </p>

      <h2>O que é excluído</h2>
      <ul>
        <li>A sua conta de acesso;</li>
        <li>Os seus dados de perfil (nome, e-mail e foto, quando houver);</li>
        <li>Os seus favoritos;</li>
        <li>Os anúncios que você enviou diretamente pela plataforma.</li>
      </ul>
      <p>
        Alguns registros podem ser mantidos por período limitado quando houver obrigação legal ou necessidade
        de prevenção a fraudes, sempre de forma restrita e segura.
      </p>

      <h2>Prazo</h2>
      <p>
        Concluímos a exclusão em até <strong>30 dias</strong> a partir da confirmação do pedido, e enviamos
        um aviso quando finalizado.
      </p>

      <h2>Login com Facebook</h2>
      <p>
        Se você entrou com o Facebook, também pode remover o acesso do aplicativo em{" "}
        <em>Facebook &rarr; Configurações e privacidade &rarr; Configurações &rarr; Apps e sites</em>. Isso
        desconecta o app, mas para apagar de fato os dados já armazenados no Repasse Livre, faça a
        solicitação por e-mail acima.
      </p>

      <p>
        Para saber quais dados tratamos, consulte a nossa{" "}
        <Link href="/privacidade">Política de Privacidade</Link>.
      </p>
    </PaginaLegal>
  );
}
