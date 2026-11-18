import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, auth, favs, isStaff, corretores, providers } from '../../lib/core.js';
import { Icon, Avatar, Spinner, DbError, useAuth, useToast, useModal, useOnboarding, useStore } from '../../ui/kit.jsx';
import PropertyCard from '../../components/PropertyCard.jsx';

export const TabHead = ({ eyebrow, titulo, children }) => (
  <div className="tab-head"><div><span className="eyebrow">{eyebrow}</span><h2>{titulo}</h2></div>{children}</div>
);

// ---------- Perfil ----------
export function Perfil() {
  const a = useAuth();
  const toast = useToast();
  const onb = useOnboarding();
  const p = a.profile || {};
  const [f, setF] = useState({ nome: p.nome || '', telefone: p.telefone || '', cargo: p.cargo || '', creci: p.creci || '', bio: p.bio || '' });
  const [avatar, setAvatar] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const foto = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try { toast('Enviando foto…'); setAvatar(await api.uploadAvatar(file)); } catch (err) { toast(err.message, 'err'); }
  };
  const salvar = async (e) => {
    e.preventDefault(); setBusy(true);
    const patch = { nome: f.nome, telefone: f.telefone };
    if (isStaff()) Object.assign(patch, { cargo: f.cargo, creci: f.creci, bio: f.bio });
    if (avatar) patch.avatar_url = avatar;
    try { await api.updateProfile(patch); toast('Perfil atualizado!'); } catch (err) { toast(err.message, 'err'); }
    setBusy(false);
  };
  const pedir = async () => {
    const sol = await corretores.minha().catch(() => null);
    if (sol?.status === 'pendente') { toast('Seu pedido já está em análise.'); return; }
    onb('corretor', false);
  };
  return (
    <>
      <TabHead eyebrow="Dados pessoais" titulo="Perfil" />
      <form className="panel form" onSubmit={salvar}>
        <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Avatar p={avatar ? { avatar_url: avatar } : p} size="xl" />
          <div><label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}><Icon name="upload" /> Trocar foto<input type="file" accept="image/*" hidden onChange={foto} /></label><p className="muted" style={{ fontSize: '.8rem', margin: '.5rem 0 0' }}>JPG ou PNG. Redimensionamos automaticamente.</p></div>
        </div>
        <div className="form-row"><div className="field"><label>Nome completo</label><input required value={f.nome} onChange={set('nome')} /></div><div className="field"><label>Telefone / WhatsApp</label><input type="tel" placeholder="(41) 99999-0000" value={f.telefone} onChange={set('telefone')} /></div></div>
        {isStaff() && <>
          <div className="form-row"><div className="field"><label>Cargo</label><input value={f.cargo} onChange={set('cargo')} placeholder="Corretor · Locação" /></div><div className="field"><label>CRECI</label><input value={f.creci} onChange={set('creci')} placeholder="CRECI-PR 00.000" /></div></div>
          <div className="field"><label>Bio (aparece na página da equipe)</label><textarea style={{ minHeight: 100 }} value={f.bio} onChange={set('bio')} /></div>
        </>}
        <div><button className="btn btn-accent" type="submit" disabled={busy}><Icon name="check" /> Salvar perfil</button></div>
      </form>
      {!isStaff() && (
        <div className="panel" style={{ marginTop: '1.2rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div><h3 style={{ fontSize: '1.2rem' }}>Você é corretor?</h3><p className="muted" style={{ margin: '.2rem 0 0', fontSize: '.9rem' }}>Peça acesso para anunciar imóveis. A equipe da Alvar aprova.</p></div>
          <button className="btn btn-ghost btn-sm" onClick={pedir}><Icon name="key" /> Pedir acesso de corretor</button>
        </div>
      )}
    </>
  );
}

// ---------- Favoritos ----------
export function Favoritos() {
  useStore();
  const [all, setAll] = useState(null);
  const [erro, setErro] = useState(null);
  useEffect(() => { api.listImoveis().then(setAll).catch(setErro); }, []);
  const list = (all || []).filter((i) => favs.has(i.id));
  return (
    <>
      <TabHead eyebrow="Sua seleção" titulo="Favoritos" />
      <div className="grid">
        {erro ? <DbError error={erro} /> : !all ? <div className="skeleton" style={{ height: 380 }} />
          : list.length ? list.map((im, i) => <PropertyCard key={im.id} im={im} i={i} />)
          : <div className="empty" style={{ gridColumn: '1/-1' }}><h3>Nenhum favorito ainda</h3><p>Toque no coração dos imóveis que você curtir.</p><Link className="btn" to="/#catalogo" style={{ marginTop: '1rem' }}>Explorar imóveis</Link></div>}
      </div>
    </>
  );
}

// ---------- Área restrita ----------
export function Restrito() {
  const onb = useOnboarding();
  const [sol, setSol] = useState(undefined);
  useEffect(() => { corretores.minha().then(setSol).catch(() => setSol(null)); }, []);
  return (
    <div className="panel" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
      <div style={{ fontSize: '2.6rem', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}><Icon name="shield" /></div>
      <h2 style={{ fontSize: '1.8rem', margin: '.8rem 0 .4rem' }}>Área da equipe</h2>
      <p className="muted" style={{ maxWidth: '44ch', margin: '0 auto' }}>Cadastrar e gerenciar imóveis é exclusivo para corretores aprovados pela equipe.</p>
      {sol?.status === 'pendente'
        ? <button className="btn btn-accent" style={{ marginTop: '1.2rem' }} disabled><Icon name="clock" /> Pedido em análise</button>
        : <button className="btn btn-accent" style={{ marginTop: '1.2rem' }} onClick={() => onb('corretor', false, () => setSol({ status: 'pendente' }))}><Icon name="key" /> Pedir acesso de corretor</button>}
    </div>
  );
}

// ---------- Segurança: senha e exclusão de conta ----------
export function Seguranca() {
  const toast = useToast();
  const modal = useModal();
  const [prov, setProv] = useState(providers());
  const temGoogle = prov.includes('google'), temSenha = prov.includes('email');
  const [s1, setS1] = useState(''), [s2, setS2] = useState('');
  const [busy, setBusy] = useState(false);
  let sc = 0;
  if (s1.length >= 8) sc++; if (s1.length >= 12) sc++; if (/[A-Z]/.test(s1) && /[a-z]/.test(s1)) sc++; if (/\d/.test(s1)) sc++; if (/[^A-Za-z0-9]/.test(s1)) sc++;
  const salvar = async (e) => {
    e.preventDefault();
    if (s1.length < 8) return toast('A senha precisa ter pelo menos 8 caracteres.', 'err');
    if (s1 !== s2) return toast('As senhas não conferem.', 'err');
    setBusy(true);
    try { await api.changePassword(s1); toast(temSenha ? 'Senha alterada!' : 'Senha criada! Agora você também pode entrar com e-mail.'); setS1(''); setS2(''); setProv(providers()); }
    catch (err) { toast(err.message, 'err'); }
    setBusy(false);
  };
  const excluir = () => modal.open((close) => <ExcluirConta close={close} />);
  return (
    <>
      <TabHead eyebrow="Acesso e privacidade" titulo="Segurança" />
      <div className="panel form" style={{ marginBottom: '1.2rem' }}>
        <h3 style={{ fontSize: '1.35rem' }}>Senha</h3>
        {temGoogle && <>
          <p className="muted" style={{ margin: 0 }}>Você entra com o <b>Google</b>, então a senha principal da sua conta é a do Google. Para trocá-la, use a página de segurança do Google.</p>
          <div><a className="btn btn-ghost btn-sm" href="https://myaccount.google.com/signinoptions/password" target="_blank" rel="noopener">Alterar senha do Google ↗</a></div>
          <hr style={{ border: 0, borderTop: '1px solid var(--line)', width: '100%', margin: '.4rem 0' }} />
        </>}
        <div>
          <h4 style={{ fontFamily: 'var(--ff-body)', fontWeight: 700, fontSize: '1rem', marginBottom: '.3rem' }}>{temSenha ? 'Alterar senha do site' : 'Criar senha do site (opcional)'}</h4>
          <p className="muted" style={{ margin: 0, fontSize: '.92rem' }}>{temSenha ? 'Essa senha permite entrar com e-mail e senha, além do Google.' : 'Com uma senha você também pode entrar com seu e-mail, sem depender do Google.'}</p>
        </div>
        <form className="form" onSubmit={salvar}>
          <div className="form-row">
            <div className="field"><label>Nova senha</label><input type="password" minLength={8} required autoComplete="new-password" placeholder="Mínimo de 8 caracteres" value={s1} onChange={(e) => setS1(e.target.value)} /></div>
            <div className="field"><label>Confirmar nova senha</label><input type="password" minLength={8} required autoComplete="new-password" value={s2} onChange={(e) => setS2(e.target.value)} /></div>
          </div>
          <div className="pw-meter" aria-hidden="true"><span style={{ width: `${(sc / 5) * 100}%`, background: sc <= 2 ? 'var(--danger)' : sc <= 3 ? 'var(--warn)' : 'var(--ok)' }} /></div>
          <div><button className="btn" type="submit" disabled={busy}><Icon name="check" /> {temSenha ? 'Alterar senha' : 'Criar senha'}</button></div>
        </form>
      </div>
      <div className="panel form danger-zone">
        <h3 style={{ fontSize: '1.35rem', color: 'var(--danger)' }}>Excluir conta</h3>
        <p className="muted" style={{ margin: 0 }}>Apaga definitivamente seu perfil, foto, favoritos e acesso. {isStaff() && <>Os imóveis sob sua responsabilidade continuam publicados, mas ficam <b>sem responsável</b> até um administrador definir outro. </>}Essa ação não pode ser desfeita.</p>
        <div><button className="btn btn-danger" onClick={excluir}><Icon name="trash" /> Excluir minha conta</button></div>
      </div>
    </>
  );
}
function ExcluirConta({ close }) {
  const toast = useToast();
  const nav = useNavigate();
  const [txt, setTxt] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = txt.trim().toUpperCase() === 'EXCLUIR';
  const go = async () => {
    setBusy(true);
    try { await api.deleteAccount(); close(); toast('Sua conta foi excluída.'); nav('/'); }
    catch (err) { toast(err.message, 'err'); setBusy(false); }
  };
  return (
    <>
      <h3 style={{ fontSize: '1.6rem', marginBottom: '.6rem', color: 'var(--danger)' }}>Excluir conta?</h3>
      <p className="muted">Todos os seus dados serão apagados para sempre. Para confirmar, digite <b>EXCLUIR</b> abaixo.</p>
      <div className="field" style={{ marginTop: '1rem' }}><input autoComplete="off" placeholder="EXCLUIR" value={txt} onChange={(e) => setTxt(e.target.value)} /></div>
      <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'flex-end', marginTop: '1.2rem' }}>
        <button className="btn btn-ghost" onClick={close}>Cancelar</button>
        <button className="btn btn-danger" disabled={!ok || busy} onClick={go}>{busy ? <><Spinner /> Excluindo…</> : 'Excluir definitivamente'}</button>
      </div>
    </>
  );
}
