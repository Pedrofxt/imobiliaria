// =========================================================
//  ALVAR IMÓVEIS — Edge Function "notificar"
//  Envia e-mails (pelo Gmail ou pela Resend) quando acontece algo no banco:
//   • nova mensagem no chat        → para o outro participante
//   • novo interessado             → para o corretor responsável
//   • visita pedida / respondida   → corretor / interessado
//   • anúncio aguardando aprovação → administradores
//   • anúncio publicado            → dono do anúncio + buscas salvas que combinam
//   • pedido de acesso de corretor → quem pode aprovar; decisão → quem pediu
//
//  Segredos (Edge Functions → Secrets):
//   WEBHOOK_SECRET      o mesmo valor usado em supabase/notificacoes.sql
//   — Opção 1, Gmail (sem domínio):
//   GMAIL_USER          seu endereço Gmail
//   GMAIL_APP_PASSWORD  senha de app de 16 letras (Conta Google → Segurança → Senhas de app)
//   — Opção 2, Resend (exige domínio verificado para enviar a qualquer pessoa):
//   RESEND_API_KEY      chave da Resend
//   EMAIL_FROM          opcional — ex.: "Alvar Imóveis <avisos@seudominio.com>"
//   SITE_URL            opcional — padrão https://pedrofxt.github.io/imobiliaria
//  (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem automaticamente.)
// =========================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6";

const SITE = (Deno.env.get("SITE_URL") || "https://pedrofxt.github.io/imobiliaria").replace(/\/$/, "");
const FROM = Deno.env.get("EMAIL_FROM") || "Alvar Imóveis <onboarding@resend.dev>";
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const GMAIL_USER = Deno.env.get("GMAIL_USER") || "";
const GMAIL_PASS = (Deno.env.get("GMAIL_APP_PASSWORD") || "").replace(/\s/g, "");
// Gmail pela porta 465 (as Edge Functions bloqueiam as portas 25 e 587)
const gmail = GMAIL_USER && GMAIL_PASS
  ? nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: GMAIL_USER, pass: GMAIL_PASS } })
  : null;
const SECRET = Deno.env.get("WEBHOOK_SECRET") || "";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const brl = (n: unknown) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(n) || 0);
const quando = (d: string) =>
  new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function layout(titulo: string, corpo: string, botao?: { texto: string; url: string }) {
  return `<!doctype html><html><body style="margin:0;background:#F6F2EC;font-family:Arial,Helvetica,sans-serif;color:#1C2421">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #E4DCD0">
      <tr><td style="padding:22px 28px;border-bottom:1px solid #E4DCD0">
        <span style="font-family:Georgia,serif;font-size:22px;color:#1C2421">Alvar</span>
        <span style="font-size:10px;letter-spacing:3px;color:#6B726E;margin-left:6px">IMÓVEIS</span>
      </td></tr>
      <tr><td style="padding:28px">
        <h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 14px">${titulo}</h1>
        <div style="font-size:15px;line-height:1.6;color:#33403B">${corpo}</div>
        ${botao ? `<p style="margin:26px 0 4px"><a href="${botao.url}" style="background:#B8552F;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;display:inline-block">${botao.texto}</a></p>` : ""}
      </td></tr>
      <tr><td style="padding:16px 28px;background:#FBF8F4;font-size:12px;color:#6B726E">
        Você recebeu este aviso porque tem uma conta na Alvar Imóveis (marca fictícia).
        <a href="${SITE}/conta/buscas" style="color:#6B726E">Gerenciar alertas</a>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

async function enviar(para: string | string[], assunto: string, html: string) {
  const to = [...new Set((Array.isArray(para) ? para : [para]).filter(Boolean))];
  if (!to.length) return;
  if (gmail) {
    // um envio por destinatário, para ninguém ver o e-mail dos outros
    for (const dest of to) {
      try { await gmail.sendMail({ from: `"Alvar Imóveis" <${GMAIL_USER}>`, to: dest, subject: assunto, html }); }
      catch (e) { console.error("Gmail:", e); }
    }
    return;
  }
  if (!RESEND) { console.warn("Nenhum provedor de e-mail configurado"); return; }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject: assunto, html }),
  });
  if (!r.ok) console.error("Resend:", r.status, await r.text());
}

async function perfil(id: string | null) {
  if (!id) return null;
  const { data } = await db.from("profiles").select("id,nome,email").eq("id", id).maybeSingle();
  return data;
}
const primeiroNome = (p: { nome?: string } | null) => (p?.nome || "").split(" ")[0] || "Olá";

// ---------------------------------------------------------
async function onMensagem(id: string) {
  const { data: m } = await db.from("mensagens").select("*, conversa:conversas(*, imovel:imoveis(id,titulo))").eq("id", id).maybeSingle();
  if (!m?.conversa) return;
  const c = m.conversa;
  // no máximo um e-mail a cada 15 min por conversa
  if (c.notificado_em && Date.now() - new Date(c.notificado_em).getTime() < 15 * 60_000) return;
  const destinoId = m.autor_id === c.cliente_id ? c.corretor_id : c.cliente_id;
  const [autor, destino] = await Promise.all([perfil(m.autor_id), perfil(destinoId)]);
  if (!destino?.email) return;
  await db.from("conversas").update({ notificado_em: new Date().toISOString() }).eq("id", c.id);
  await enviar(destino.email, `Nova mensagem de ${autor?.nome || "alguém"} — ${c.imovel?.titulo || "Alvar Imóveis"}`,
    layout(`${esc(primeiroNome(destino))}, você tem uma nova mensagem`,
      `<p><b>${esc(autor?.nome || "Alguém")}</b> escreveu sobre <b>${esc(c.imovel?.titulo || "um imóvel")}</b>:</p>
       <blockquote style="margin:14px 0;padding:12px 16px;background:#F6F2EC;border-left:3px solid #B8552F;border-radius:6px">${esc(m.texto).slice(0, 600)}</blockquote>`,
      { texto: "Responder no chat", url: `${SITE}/conta/chat?c=${c.id}` }));
}

async function onLead(id: string) {
  const { data: l } = await db.from("leads").select("*, imovel:imoveis(id,titulo,responsavel_id)").eq("id", id).maybeSingle();
  if (!l?.imovel) return;
  const resp = await perfil(l.imovel.responsavel_id);
  if (!resp?.email) return;
  await enviar(resp.email, `Novo interessado: ${l.imovel.titulo}`,
    layout("Novo interessado em um imóvel seu",
      `<p><b>${esc(l.nome)}</b> quer saber mais sobre <b>${esc(l.imovel.titulo)}</b>.</p>
       <p>E-mail: ${esc(l.email)}${l.telefone ? `<br>Telefone: ${esc(l.telefone)}` : ""}</p>
       ${l.mensagem ? `<blockquote style="margin:14px 0;padding:12px 16px;background:#F6F2EC;border-left:3px solid #B8552F;border-radius:6px">${esc(l.mensagem)}</blockquote>` : ""}`,
      { texto: "Ver interessados", url: `${SITE}/conta/leads` }));
}

async function onVisita(id: string, evento: string) {
  const { data: v } = await db.from("visitas").select("*, imovel:imoveis(id,titulo,endereco,bairro,cidade)").eq("id", id).maybeSingle();
  if (!v) return;
  const [cli, cor] = await Promise.all([perfil(v.cliente_id), perfil(v.corretor_id)]);
  const im = v.imovel?.titulo || "imóvel";
  if (evento === "INSERT" && cor?.email) {
    await enviar(cor.email, `Pedido de visita: ${im}`,
      layout("Novo pedido de visita",
        `<p><b>${esc(cli?.nome || "Um interessado")}</b> quer visitar <b>${esc(im)}</b> em <b>${quando(v.data_hora)}</b>.</p>${v.observacao ? `<p>Observação: “${esc(v.observacao)}”</p>` : ""}`,
        { texto: "Confirmar ou recusar", url: `${SITE}/conta/visitas` }));
  }
  if (evento === "UPDATE" && ["confirmada", "recusada"].includes(v.status) && cli?.email) {
    const ok = v.status === "confirmada";
    await enviar(cli.email, `Visita ${ok ? "confirmada" : "não confirmada"}: ${im}`,
      layout(ok ? "Sua visita está confirmada" : "Sua visita não pôde ser confirmada",
        ok
          ? `<p>${esc(primeiroNome(cli))}, ${esc(cor?.nome || "o corretor")} confirmou sua visita a <b>${esc(im)}</b> em <b>${quando(v.data_hora)}</b>.</p><p>Endereço: ${esc([v.imovel?.endereco, v.imovel?.bairro, v.imovel?.cidade].filter(Boolean).join(", "))}</p>`
          : `<p>${esc(primeiroNome(cli))}, o horário de ${quando(v.data_hora)} para <b>${esc(im)}</b> não está disponível. Escolha outro horário na página do imóvel.</p>`,
        { texto: ok ? "Ver minhas visitas" : "Escolher outro horário", url: ok ? `${SITE}/conta/visitas` : `${SITE}/imovel/${v.imovel_id}#agendar` }));
  }
  if (evento === "UPDATE" && v.status === "cancelada") {
    const alvo = cor; // avisa o corretor quando o interessado cancela
    if (alvo?.email) await enviar(alvo.email, `Visita cancelada: ${im}`, layout("Visita cancelada", `<p>A visita de ${quando(v.data_hora)} para <b>${esc(im)}</b> foi cancelada.</p>`, { texto: "Ver agenda", url: `${SITE}/conta/visitas` }));
  }
}

async function onImovel(id: string, evento: string, anterior?: string) {
  const { data: im } = await db.from("imoveis").select("*, imovel_fotos(url,ordem)").eq("id", id).maybeSingle();
  if (!im) return;
  const link = `${SITE}/imovel/${im.id}`;
  if (im.situacao === "pendente" && anterior !== "pendente") {
    const { data: admins } = await db.from("profiles").select("email").eq("papel", "admin");
    await enviar((admins || []).map((a) => a.email), `Anúncio aguardando aprovação: ${im.titulo}`,
      layout("Um anúncio aguarda sua aprovação", `<p><b>${esc(im.titulo)}</b> — ${esc(im.cidade)} · ${brl(im.preco)}</p>`,
        { texto: "Revisar anúncios", url: `${SITE}/conta/imoveis` }));
  }
  if (im.situacao === "rejeitado" && anterior !== "rejeitado") {
    const dono = await perfil(im.criado_por || im.responsavel_id);
    if (dono?.email) await enviar(dono.email, `Anúncio precisa de ajustes: ${im.titulo}`,
      layout("Seu anúncio precisa de ajustes", `<p><b>${esc(im.titulo)}</b> não foi aprovado ainda.</p>${im.motivo_rejeicao ? `<p>Motivo: “${esc(im.motivo_rejeicao)}”</p>` : ""}`,
        { texto: "Editar anúncio", url: `${SITE}/conta/novo?editar=${im.id}` }));
  }
  if (im.situacao === "publicado" && (evento === "INSERT" || anterior !== "publicado")) {
    if (anterior === "pendente") {
      const dono = await perfil(im.criado_por || im.responsavel_id);
      if (dono?.email) await enviar(dono.email, `Anúncio publicado: ${im.titulo}`,
        layout("Seu anúncio foi aprovado 🎉", `<p><b>${esc(im.titulo)}</b> já está no ar.</p>`, { texto: "Ver anúncio", url: link }));
    }
    // alertas de buscas salvas
    const { data: buscas } = await db.from("buscas_salvas").select("id,nome,filtros,user_id").eq("alerta_email", true);
    if (!buscas?.length) return;
    const combina = buscas.filter((b) => combinaFiltros(b.filtros || {}, im));
    const porUsuario = new Map<string, string[]>();
    combina.forEach((b) => porUsuario.set(b.user_id, [...(porUsuario.get(b.user_id) || []), b.nome]));
    const foto = [...(im.imovel_fotos || [])].sort((a: any, b: any) => a.ordem - b.ordem)[0]?.url;
    for (const [uid, nomes] of porUsuario) {
      const u = await perfil(uid);
      if (!u?.email) continue;
      await enviar(u.email, `Novo imóvel para sua busca “${nomes[0]}”`,
        layout("Encontramos um imóvel para você",
          `${foto ? `<img src="${esc(foto)}" alt="" style="width:100%;border-radius:10px;margin-bottom:14px">` : ""}
           <p style="font-size:18px;margin:0"><b>${brl(im.preco)}${im.finalidade === "aluguel" ? "/mês" : ""}</b></p>
           <p style="margin:4px 0 0">${esc(im.titulo)}<br><span style="color:#6B726E">${esc([im.bairro, im.cidade].filter(Boolean).join(", "))}</span></p>
           <p style="color:#6B726E;font-size:13px">Combina com: ${nomes.map(esc).join(", ")}</p>`,
          { texto: "Ver imóvel", url: link }));
    }
  }
}


async function onSolicitacao(id: string) {
  const { data: s } = await db.from("solicitacoes_corretor").select("*").eq("id", id).maybeSingle();
  if (!s) return;
  const pessoa = await perfil(s.user_id);
  if (s.status === "pendente") {
    const { data: cfg } = await db.from("configuracoes").select("quem_aprova").eq("id", 1).maybeSingle();
    const papeis = cfg?.quem_aprova === "admin" ? ["admin"] : ["admin", "corretor"];
    const { data: aprovadores } = await db.from("profiles").select("email").in("papel", papeis).neq("id", s.user_id);
    await enviar((aprovadores || []).map((a) => a.email), `Pedido de acesso de corretor: ${pessoa?.nome || "novo usuário"}`,
      layout("Novo pedido de acesso de corretor",
        `<p><b>${esc(pessoa?.nome || "Alguém")}</b> (${esc(pessoa?.email || "")}) quer anunciar imóveis na Alvar.</p>
         <p>CRECI: ${esc(s.creci)}${s.telefone ? `<br>Telefone: ${esc(s.telefone)}` : ""}</p>
         ${s.mensagem ? `<blockquote style="margin:14px 0;padding:12px 16px;background:#F6F2EC;border-left:3px solid #B8552F;border-radius:6px">${esc(s.mensagem)}</blockquote>` : ""}`,
        { texto: "Aprovar ou recusar", url: `${SITE}/conta/aprovacoes` }));
  } else if (pessoa?.email) {
    const ok = s.status === "aprovada";
    await enviar(pessoa.email, ok ? "Seu acesso de corretor foi aprovado" : "Sobre seu pedido de acesso de corretor",
      layout(ok ? "Bem-vindo à equipe Alvar 🎉" : "Seu pedido não foi aprovado",
        ok ? `<p>${esc(primeiroNome(pessoa))}, seu acesso de corretor está liberado. Você já pode cadastrar imóveis.</p>`
           : `<p>${esc(primeiroNome(pessoa))}, a equipe não aprovou seu acesso de corretor desta vez. Você pode revisar os dados e pedir novamente na sua conta.</p>`,
        { texto: ok ? "Cadastrar imóvel" : "Ver minha conta", url: ok ? `${SITE}/conta/novo` : `${SITE}/conta/perfil` }));
  }
}

const norm = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function combinaFiltros(f: any, i: any) {
  const q = norm(f.q);
  return (!f.fin || i.finalidade === f.fin) && (!f.tipo || i.tipo === f.tipo) &&
    (i.quartos || 0) >= (Number(f.quartos) || 0) && (!f.preco || Number(i.preco) <= Number(f.preco)) &&
    (!q || norm(`${i.titulo} ${i.bairro} ${i.cidade} ${i.descricao} ${(i.comodidades || []).join(" ")}`).includes(q));
}

// ---------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  if (!SECRET || req.headers.get("x-webhook-secret") !== SECRET) return new Response("unauthorized", { status: 401 });
  try {
    const { tabela, evento, id, anterior } = await req.json();
    if (tabela === "mensagens") await onMensagem(id);
    else if (tabela === "leads") await onLead(id);
    else if (tabela === "visitas") await onVisita(id, evento);
    else if (tabela === "imoveis") await onImovel(id, evento, anterior);
    else if (tabela === "solicitacoes_corretor") await onSolicitacao(id);
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
