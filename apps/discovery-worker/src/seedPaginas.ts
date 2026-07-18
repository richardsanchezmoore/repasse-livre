import "dotenv/config";
import { supabase } from "./supabaseClient.js";

/**
 * SEED ÚNICO das páginas institucionais (termos/privacidade/exclusao-de-dados) no CMS.
 * Migra o conteúdo que estava HARDCODE (nas page.tsx + PaginaLegal) pra tabela
 * `paginas`, pra passar a ser editável pelo painel. Guarda o HTML (conteudo_json fica
 * null; o editor Tiptap bootstrapa do HTML no 1º open). atualizado_em = a data legal
 * original ("3 de julho de 2026"). Idempotente (upsert por slug). Rodar 1×:
 *   npx tsx src/seedPaginas.ts
 */

const DATA_LEGAL = "2026-07-03T00:00:00-03:00";

const TERMOS = `
<p>Estes Termos de Uso regem o acesso e o uso da plataforma <strong>Repasse Livre</strong> (<a href="https://repasselivre.com">repasselivre.com</a>). Ao acessar ou usar a plataforma, você concorda com estes termos. Se não concordar, não utilize o serviço.</p>
<h2>1. O que é o Repasse Livre</h2>
<p>O Repasse Livre é um <strong>agregador de anúncios</strong> de veículos que destaca ofertas anunciadas abaixo do valor da tabela FIPE. Parte dos anúncios é coletada de fontes públicas de terceiros (como OLX, Webmotors e Mercado Livre); outra parte é enviada por anunciantes. O Repasse Livre <strong>não vende veículos</strong> e <strong>não é parte</strong> das negociações — atuamos apenas como ponto de descoberta e contato.</p>
<h2>2. Conta e login</h2>
<p>Algumas funções (favoritar e anunciar) exigem conta, criada por e-mail/senha ou login social (Google/Facebook). Você é responsável por manter a confidencialidade do seu acesso e por toda atividade realizada na sua conta, comprometendo-se a fornecer informações verdadeiras e atualizadas.</p>
<h2>3. Regras de uso</h2>
<ul>
<li>Não usar a plataforma para fins ilícitos, fraudulentos ou que violem direitos de terceiros;</li>
<li>Não publicar anúncios falsos, enganosos ou de veículos que você não está autorizado a vender;</li>
<li>Não coletar dados de outros usuários nem tentar burlar mecanismos de segurança da plataforma;</li>
<li>Fornecer informações verídicas nos anúncios e no cadastro.</li>
</ul>
<h2>4. Anúncios e conteúdo de terceiros</h2>
<p>Os valores da FIPE são referência de mercado e podem variar. Os anúncios de terceiros são exibidos no estado em que foram coletados de suas fontes públicas — <strong>não garantimos</strong> a veracidade, disponibilidade, preço ou condição dos veículos, tampouco a idoneidade de anunciantes. A negociação, o pagamento e a transferência ocorrem <strong>diretamente entre as partes</strong>, por sua conta e risco. Recomendamos toda a cautela usual (vistoria, checagem de documentação e de procedência) antes de qualquer transação.</p>
<h2>5. Propriedade intelectual</h2>
<p>A marca, o layout, os textos e os demais elementos próprios do Repasse Livre são protegidos e não podem ser copiados ou reutilizados sem autorização. O conteúdo de anúncios de terceiros pertence às respectivas fontes e anunciantes.</p>
<h2>6. Limitação de responsabilidade</h2>
<p>A plataforma é fornecida "no estado em que se encontra". Na máxima extensão permitida em lei, o Repasse Livre não se responsabiliza por prejuízos decorrentes de negociações entre usuários, da indisponibilidade temporária do serviço ou de informações de anúncios de terceiros.</p>
<h2>7. Suspensão e encerramento</h2>
<p>Podemos suspender ou encerrar contas que violem estes termos. Você pode encerrar a sua conta a qualquer momento — veja a página de <a href="/exclusao-de-dados">Exclusão de dados</a>.</p>
<h2>8. Alterações</h2>
<p>Podemos atualizar estes termos periodicamente; a data no topo indica a versão vigente. O uso continuado após mudanças representa concordância com a nova versão.</p>
<h2>9. Lei aplicável e contato</h2>
<p>Estes termos são regidos pelas leis brasileiras. Dúvidas? Fale conosco pelo e-mail <a href="mailto:contato@repasselivre.com">contato@repasselivre.com</a>. Veja também a nossa <a href="/privacidade">Política de Privacidade</a>.</p>
`.trim();

const PRIVACIDADE = `
<p>Esta Política de Privacidade explica como o <strong>Repasse Livre</strong> ("nós"), acessível em <a href="https://repasselivre.com">repasselivre.com</a>, coleta, usa, compartilha e protege os seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD). Ao usar a plataforma, você concorda com as práticas descritas aqui.</p>
<h2>1. Quem somos</h2>
<p>O Repasse Livre é uma plataforma que reúne e destaca anúncios de veículos anunciados abaixo do valor da tabela FIPE, coletados de fontes públicas (como OLX, Webmotors e Mercado Livre) e também enviados diretamente por anunciantes. Somos os controladores dos dados pessoais tratados na plataforma.</p>
<h2>2. Dados que coletamos</h2>
<p>Coletamos os seguintes dados, conforme a sua interação com a plataforma:</p>
<ul>
<li><strong>Dados de conta e login:</strong> ao criar conta ou entrar com Google, Facebook ou e-mail/senha, coletamos seu <strong>nome</strong>, <strong>e-mail</strong> e, quando disponível, sua foto de perfil. No login social, recebemos esses dados do provedor escolhido apenas para autenticar você — <strong>não publicamos nada</strong> no seu perfil.</li>
<li><strong>Dados de anunciante:</strong> se você anuncia um veículo, coletamos os dados que você informa, como <strong>nome</strong>, <strong>WhatsApp</strong> e as informações do veículo.</li>
<li><strong>Dados de navegação e uso:</strong> páginas visitadas, buscas, favoritos, além de dados técnicos (endereço IP, tipo de dispositivo e navegador) coletados por cookies e ferramentas de análise.</li>
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
<p><strong>Não vendemos</strong> os seus dados. Compartilhamos dados apenas com prestadores de serviço que viabilizam a plataforma — como infraestrutura de nuvem, autenticação, hospedagem e ferramentas de medição de audiência —, sempre limitados ao necessário para operar o serviço. Também compartilhamos com os provedores de login que você escolher usar, para autenticar o seu acesso, e quando exigido por lei ou ordem judicial.</p>
<h2>5. Cookies e rastreamento</h2>
<p>Usamos cookies e tecnologias semelhantes para manter você conectado, lembrar preferências (como o estado selecionado) e medir o uso da plataforma. Você pode gerenciar ou bloquear cookies nas configurações do seu navegador, ciente de que isso pode afetar o funcionamento do site.</p>
<p>Para essa medição, usamos um <strong>identificador anônimo de navegação</strong> (um cookie sem nome, e-mail ou qualquer dado que identifique você pessoalmente), que serve apenas para entender de forma agregada quais modelos e anúncios são mais visualizados. Esses dados alimentam recursos de inteligência de mercado da plataforma e não são usados para identificá-lo individualmente.</p>
<h2>6. Seus direitos (LGPD)</h2>
<p>Você pode, a qualquer momento, solicitar:</p>
<ul>
<li>Confirmação de tratamento e acesso aos seus dados;</li>
<li>Correção de dados incompletos, inexatos ou desatualizados;</li>
<li>Anonimização, bloqueio ou <strong>eliminação</strong> dos dados;</li>
<li>Portabilidade e informação sobre compartilhamento;</li>
<li>Revogação do consentimento.</li>
</ul>
<p>Para exercer esses direitos, escreva para <a href="mailto:contato@repasselivre.com">contato@repasselivre.com</a>. Para apagar sua conta e dados, veja a página de <a href="/exclusao-de-dados">Exclusão de dados</a>.</p>
<h2>7. Retenção e segurança</h2>
<p>Mantemos os seus dados apenas pelo tempo necessário às finalidades desta política ou conforme exigido por lei. Adotamos medidas técnicas e organizacionais razoáveis para proteger os dados contra acesso não autorizado, perda ou alteração indevida.</p>
<h2>8. Alterações desta política</h2>
<p>Podemos atualizar esta política periodicamente. A data de "última atualização" no topo indica a versão vigente. Mudanças relevantes serão sinalizadas na plataforma.</p>
<h2>9. Contato</h2>
<p>Dúvidas sobre esta política ou sobre os seus dados? Fale com o nosso encarregado de dados pelo e-mail <a href="mailto:contato@repasselivre.com">contato@repasselivre.com</a>.</p>
`.trim();

const EXCLUSAO = `
<p>Você pode solicitar, a qualquer momento e sem custo, a exclusão da sua conta e dos dados pessoais que o <strong>Repasse Livre</strong> mantém sobre você, incluindo os obtidos por login com Google ou Facebook.</p>
<h2>Como solicitar</h2>
<p>Envie um e-mail para <a href="mailto:contato@repasselivre.com?subject=Exclusão%20de%20dados">contato@repasselivre.com</a> com o assunto <strong>"Exclusão de dados"</strong>, a partir do e-mail cadastrado na sua conta (ou informando o e-mail usado no login social), pedindo a exclusão. Podemos solicitar uma confirmação simples para verificar que o pedido é realmente seu.</p>
<h2>O que é excluído</h2>
<ul>
<li>A sua conta de acesso;</li>
<li>Os seus dados de perfil (nome, e-mail e foto, quando houver);</li>
<li>Os seus favoritos;</li>
<li>Os anúncios que você enviou diretamente pela plataforma.</li>
</ul>
<p>Alguns registros podem ser mantidos por período limitado quando houver obrigação legal ou necessidade de prevenção a fraudes, sempre de forma restrita e segura.</p>
<h2>Prazo</h2>
<p>Concluímos a exclusão em até <strong>30 dias</strong> a partir da confirmação do pedido, e enviamos um aviso quando finalizado.</p>
<h2>Login com Facebook</h2>
<p>Se você entrou com o Facebook, também pode remover o acesso do aplicativo em <em>Facebook → Configurações e privacidade → Configurações → Apps e sites</em>. Isso desconecta o app, mas para apagar de fato os dados já armazenados no Repasse Livre, faça a solicitação por e-mail acima.</p>
<p>Para saber quais dados tratamos, consulte a nossa <a href="/privacidade">Política de Privacidade</a>.</p>
`.trim();

const PAGINAS = [
  { slug: "termos", titulo: "Termos de Uso", conteudo_html: TERMOS, seo_title: "Termos de Uso", seo_description: "As regras para uso da plataforma Repasse Livre." },
  { slug: "privacidade", titulo: "Política de Privacidade", conteudo_html: PRIVACIDADE, seo_title: "Política de Privacidade", seo_description: "Como o Repasse Livre coleta, usa e protege os seus dados pessoais." },
  { slug: "exclusao-de-dados", titulo: "Exclusão de dados do usuário", conteudo_html: EXCLUSAO, seo_title: "Exclusão de dados", seo_description: "Como solicitar a exclusão dos seus dados e da sua conta no Repasse Livre." },
];

async function main() {
  for (const p of PAGINAS) {
    const { error } = await supabase
      .from("paginas")
      .upsert({ ...p, conteudo_json: null, atualizado_em: DATA_LEGAL }, { onConflict: "slug" });
    if (error) console.error(`[seed-paginas] ${p.slug}: ${error.message}`);
    else console.log(`[seed-paginas] ✓ ${p.slug}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
