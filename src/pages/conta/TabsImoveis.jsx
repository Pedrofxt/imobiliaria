import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, auth, isAdmin, cover, loc, onlyDigits, geocode, TIPOS, FINALIDADES, STATUS, SITUACOES, COMODIDADES } from '../../lib/core.js';
import { Icon, Img, Price, Spinner, DbError, useToast, useModal } from '../../ui/kit.jsx';
import { MapaSeletor } from '../../components/LeafletMap.jsx';
import { TabHead } from './TabsBasicas.jsx';

const sit = (i) => i.situacao || 'publicado';

// ---------- Meus imóveis (+ aprovação para admin) ----------
export function MeusImoveis({ refreshCounts }) {
  const toast = useToast(); const modal = useModal();
  const [mine, setMine] = useState(null); const [erro, setErro] = useState(null);
  const [fSit, setFSit] = useState(null); const [q, setQ] = useState('');
  const carregar = () => api.listImoveis().then((all) => {
    const l = isAdmin() ? all : all.filter((i) => i.responsavel_id === auth.user.id || i.criado_por === auth.user.id);
    setMine(l);
    setFSit((f) => (f === null ? (isAdmin() && l.some((i) => sit(i) === 'pendente') ? 'pendente' : '') : f));
  }).catch(setErro);
  useEffect(() => { carregar(); }, []);
  const c = (k) => (mine || []).filter((i) => !k || sit(i) === k).length;
  const list = (mine || []).filter((i) => (!fSit || sit(i) === fSit) && (i.titulo + i.bairro + i.cidade).toLowerCase().includes(q.toLowerCase()));

  const excluir = async (im) => {
    if (!(await modal.confirm(`“${im.titulo}” e todas as fotos serão excluídos permanentemente.`, 'Excluir'))) return;
    try { await api.deleteImovel(im); toast('Imóvel excluído'); carregar(); } catch (e) { toast(e.message, 'err'); }
  };
  const aprovar = async (im) => { try { await api.setSituacao(im.id, 'publicado'); toast('Anúncio aprovado e publicado!'); carregar(); refreshCounts(); } catch (e) { toast(e.message, 'err'); } };
  const rejeitar = (im) => modal.open((close) => <Rejeitar close={close} onOk={async (motivo) => {
    try { await api.setSituacao(im.id, 'rejeitado', motivo || null); close(); toast('Anúncio rejeitado'); carregar(); refreshCounts(); } catch (e) { toast(e.message, 'err'); }
  }} />);

  return (
    <>
      <TabHead eyebrow={isAdmin() ? 'Todos os anúncios' : 'Sob sua responsabilidade'} titulo="Imóveis">
        <label className="field-inline" style={{ border: '1px solid var(--line)', minWidth: 240 }}><Icon name="search" /><input placeholder="Filtrar…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      </TabHead>
      {erro ? <DbError error={erro} /> : !mine ? <div className="skeleton" style={{ height: 100 }} /> : <>
        <div className="filter-chips">{[['', 'Todos'], ['pendente', 'Aguardando aprovação'], ['publicado', 'Publicados'], ['rascunho', 'Rascunhos'], ['rejeitado', 'Rejeitados']].filter(([k]) => !k || c(k)).map(([k, l]) => <button key={k} className={`chip ${fSit === k ? 'on' : ''}`} onClick={() => setFSit(k)}>{l}<small>{c(k)}</small></button>)}</div>
        <div className="list">
          {list.length ? list.map((im) => (
            <div className="list-item" key={im.id}>
              <Img src={cover(im)} loading="lazy" />
              <div style={{ minWidth: 0 }}>
                <h4>{im.titulo} <span className={`pill ${sit(im)}`}>{SITUACOES[sit(im)]}</span></h4>
                <div className="meta"><span><Price im={im} /></span><span>{TIPOS[im.tipo] || ''} · {FINALIDADES[im.finalidade] || ''}</span><span className={`status ${im.status}`}>{STATUS[im.status] || ''}</span>{im.destaque && <span style={{ color: 'var(--accent)' }}>★ Destaque</span>}</div>
                <div className="meta"><span><Icon name="pin" /> {loc(im)}</span><span><Icon name="image" /> {im.imovel_fotos?.length || 0}</span><span><Icon name="user" /> {im.responsavel?.nome || '—'}</span>{im.latitude && <span><Icon name="map" /> no mapa</span>}</div>
                {sit(im) === 'rejeitado' && im.motivo_rejeicao && <div className="meta" style={{ color: 'var(--danger)' }}>Motivo: {im.motivo_rejeicao}</div>}
              </div>
              <div className="row-actions">
                {isAdmin() && sit(im) === 'pendente' && <><button className="btn btn-sm" onClick={() => aprovar(im)}><Icon name="check" /> Aprovar</button><button className="btn btn-ghost btn-sm" onClick={() => rejeitar(im)}>Rejeitar</button></>}
                <Link className="btn-icon" to={`/imovel/${encodeURIComponent(im.id)}`} aria-label="Ver"><Icon name="eye" /></Link>
                <Link className="btn-icon" to={`/conta/novo?editar=${encodeURIComponent(im.id)}`} aria-label="Editar"><Icon name="edit" /></Link>
                <button className="btn-icon" aria-label="Excluir" onClick={() => excluir(im)}><Icon name="trash" /></button>
              </div>
            </div>
          )) : <div className="empty"><h3>Nenhum imóvel {fSit ? 'nesta situação' : ''}</h3><p>{fSit ? 'Troque o filtro acima.' : 'Cadastre o primeiro agora mesmo.'}</p>{!fSit && <Link className="btn btn-accent" to="/conta/novo" style={{ marginTop: '1rem' }}><Icon name="plus" /> Cadastrar imóvel</Link>}</div>}
        </div>
      </>}
    </>
  );
}
function Rejeitar({ close, onOk }) {
  const [m, setM] = useState('');
  return (
    <>
      <h3 style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>Rejeitar anúncio</h3>
      <p className="muted" style={{ marginTop: 0 }}>Explique ao corretor o que ajustar. Ele vê o motivo e pode reenviar.</p>
      <div className="field"><textarea style={{ minHeight: 100 }} maxLength={400} placeholder="Ex.: faltam fotos da cozinha e o preço está desatualizado." value={m} onChange={(e) => setM(e.target.value)} /></div>
      <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'flex-end', marginTop: '1rem' }}><button className="btn btn-ghost" onClick={close}>Cancelar</button><button className="btn btn-danger" onClick={() => onOk(m.trim())}>Rejeitar</button></div>
    </>
  );
}

// ---------- Cadastrar / editar imóvel ----------
export function NovoImovel() {
  const [sp] = useSearchParams();
  const editId = sp.get('editar');
  const [dados, setDados] = useState(null); const [erro, setErro] = useState(null);
  useEffect(() => {
    setDados(null);
    Promise.all([api.listEquipe(), editId ? api.getImovel(editId) : null]).then(([equipe, im]) => setDados({ equipe, im })).catch(setErro);
  }, [editId]);
  if (erro) return <DbError error={erro} />;
  if (!dados) return <div className="skeleton" style={{ height: '60vh' }} />;
  return <Formulario key={editId || 'novo'} equipe={dados.equipe} im={dados.im} />;
}

function Formulario({ equipe, im }) {
  const toast = useToast(); const nav = useNavigate();
  const v0 = im || { finalidade: 'venda', tipo: 'casa', status: 'disponivel', estado: 'PR', responsavel_id: equipe.some((p) => p.id === auth.user.id) ? auth.user.id : (equipe[0]?.id || ''), comodidades: [] };
  const str = (x) => (x === null || x === undefined ? '' : String(x));
  const [f, setF] = useState({
    titulo: str(v0.titulo), finalidade: v0.finalidade, tipo: v0.tipo, status: v0.status, preco: str(v0.preco), condominio: str(v0.condominio), iptu: str(v0.iptu), destaque: !!v0.destaque,
    area_m2: str(v0.area_m2), quartos: str(v0.quartos), suites: str(v0.suites), banheiros: str(v0.banheiros), vagas: str(v0.vagas), descricao: str(v0.descricao),
    cep: str(v0.cep), endereco: str(v0.endereco), bairro: str(v0.bairro), cidade: str(v0.cidade), estado: str(v0.estado),
    responsavel_id: equipe.some((p) => p.id === v0.responsavel_id) ? v0.responsavel_id : '',
    latitude: v0.latitude || null, longitude: v0.longitude || null,
  });
  const [coms, setComs] = useState(new Set((v0.comodidades || []).filter((c) => COMODIDADES.includes(c))));
  const [extra, setExtra] = useState((v0.comodidades || []).filter((c) => !COMODIDADES.includes(c)).join(', '));
  const [fotos, setFotos] = useState((im?.imovel_fotos || []).map((x) => ({ ...x, preview: x.url })));
  const removidas = useRef([]);
  const [busy, setBusy] = useState(null); // texto do botão enquanto salva
  const [geoBusy, setGeoBusy] = useState(false);
  const [over, setOver] = useState(false);
  const dragFrom = useRef(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const setPos = (lat, lng, pan = true) => { setF((x) => ({ ...x, latitude: +lat.toFixed(6), longitude: +lng.toFixed(6) })); if (pan) MapaSeletor.pan?.(lat, lng); };
  const localizar = async (silencioso = false, base = f) => {
    if (!base.cidade.trim()) { if (!silencioso) toast('Preencha ao menos a cidade.', 'err'); return; }
    setGeoBusy(true);
    try {
      let r = await geocode([base.endereco, base.bairro, base.cidade, base.estado, 'Brasil'].filter((x) => x && x.trim()).join(', '));
      if (!r) r = await geocode([base.bairro, base.cidade, base.estado, 'Brasil'].filter(Boolean).join(', '));
      if (r) { setPos(r.lat, r.lng); if (!silencioso) toast('Posição encontrada — ajuste o marcador se precisar.'); }
      else if (!silencioso) toast('Endereço não encontrado. Clique no mapa para marcar.', 'err');
    } catch { if (!silencioso) toast('Busca de endereço indisponível agora.', 'err'); }
    setGeoBusy(false);
  };
  // ViaCEP
  const cepBlur = async () => {
    const c = onlyDigits(f.cep); if (c.length !== 8) return;
    const cepFmt = c.replace(/(\d{5})(\d{3})/, '$1-$2');
    try {
      const r = await (await fetch(`https://viacep.com.br/ws/${c}/json/`)).json();
      if (r.erro) { setF((x) => ({ ...x, cep: cepFmt })); return; }
      const next = { ...f, cep: cepFmt, endereco: f.endereco || (r.logradouro ? r.logradouro + ', ' : ''), bairro: r.bairro || f.bairro, cidade: r.localidade || f.cidade, estado: r.uf || f.estado };
      setF(next); toast('Endereço preenchido pelo CEP');
      if (!f.latitude) localizar(true, next);
    } catch { setF((x) => ({ ...x, cep: cepFmt })); }
  };

  // fotos
  const addFiles = (list) => {
    const imgs = [...list].filter((x) => x.type.startsWith('image/'));
    if (fotos.length + imgs.length > 30) { toast('Máximo de 30 fotos por imóvel', 'err'); return; }
    setFotos((l) => [...l, ...imgs.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
  };
  const move = (from, to) => setFotos((l) => { if (to < 0 || to >= l.length) return l; const c = [...l]; const [x] = c.splice(from, 1); c.splice(to, 0, x); return c; });
  const remover = (i) => setFotos((l) => { const c = [...l]; const [x] = c.splice(i, 1); if (x.id) removidas.current.push(x); else URL.revokeObjectURL(x.preview); return c; });

  const salvar = async (situacaoBtn) => {
    const n = (k) => (f[k] === '' || f[k] === null ? null : Number(f[k]));
    if (!f.titulo.trim() || !f.cidade.trim() || f.preco === '') { toast('Preencha título, preço e cidade.', 'err'); return; }
    const payload = {
      titulo: f.titulo.trim(), finalidade: f.finalidade, tipo: f.tipo, status: f.status,
      preco: n('preco') || 0, condominio: n('condominio'), iptu: n('iptu'), destaque: f.destaque,
      area_m2: n('area_m2'), quartos: n('quartos') || 0, suites: n('suites') || 0, banheiros: n('banheiros') || 0, vagas: n('vagas') || 0,
      descricao: f.descricao.trim(), comodidades: [...coms, ...extra.split(',').map((s) => s.trim()).filter(Boolean)],
      cep: f.cep.trim(), endereco: f.endereco.trim(), bairro: f.bairro.trim(), cidade: f.cidade.trim(), estado: f.estado.trim().toUpperCase(),
      responsavel_id: f.responsavel_id || null, latitude: f.latitude, longitude: f.longitude,
      situacao: situacaoBtn === 'rascunho' ? 'rascunho' : (isAdmin() ? 'publicado' : (im?.situacao === 'publicado' ? 'publicado' : 'pendente')),
    };
    setBusy({ sit: situacaoBtn, txt: 'Salvando dados…' });
    try {
      const id = await api.saveImovel(payload, im?.id || null);
      await api.saveFotos(id, fotos, removidas.current, (i, tot) => setBusy({ sit: situacaoBtn, txt: `Enviando foto ${i}/${tot}…` }));
      toast(payload.situacao === 'rascunho' ? 'Rascunho salvo.' : payload.situacao === 'pendente' ? 'Enviado para aprovação! Avisaremos quando for publicado.' : (im ? 'Alterações salvas!' : 'Imóvel publicado!'));
      setTimeout(() => nav(`/imovel/${encodeURIComponent(id)}`), 700);
    } catch (err) { console.error(err); toast(err.message || 'Erro ao salvar', 'err'); setBusy(null); }
  };

  const opt = (obj) => Object.entries(obj).map(([k, l]) => <option key={k} value={k}>{l}</option>);
  const principal = isAdmin() ? (im && im.situacao === 'publicado' ? 'Salvar alterações' : 'Publicar imóvel') : (im && im.situacao === 'publicado' ? 'Salvar alterações' : 'Enviar para aprovação');
  return (
    <>
      <TabHead eyebrow={im ? 'Editar anúncio' : 'Novo anúncio'} titulo={im ? im.titulo : 'Cadastrar imóvel'}>
        {im && <Link className="btn btn-ghost btn-sm" to="/conta/novo"><Icon name="plus" /> Novo em branco</Link>}
      </TabHead>
      {im?.situacao === 'rejeitado' && <div className="draft-banner" style={{ borderColor: 'color-mix(in srgb,var(--danger) 45%,transparent)', background: 'color-mix(in srgb,var(--danger) 10%,transparent)' }}><Icon name="x" /><span><b>Anúncio rejeitado.</b> {im.motivo_rejeicao || 'Ajuste e reenvie para aprovação.'}</span></div>}
      {im?.situacao === 'pendente' && <div className="draft-banner"><Icon name="clock" /><span>Este anúncio está <b>aguardando aprovação</b> de um administrador.</span></div>}
      <form className="form" noValidate onSubmit={(e) => { e.preventDefault(); salvar(e.nativeEvent.submitter?.dataset.sit || 'publicado'); }}>
        <div className="panel form">
          <h3 style={{ fontSize: '1.3rem' }}>Informações principais</h3>
          <div className="field"><label>Título do anúncio *</label><input required maxLength={120} value={f.titulo} onChange={set('titulo')} placeholder="Ex.: Casa com piscina e vista para a baía" /></div>
          <div className="form-row" style={{ '--cols': 3 }}>
            <div className="field"><label>Finalidade</label><select value={f.finalidade} onChange={set('finalidade')}>{opt(FINALIDADES)}</select></div>
            <div className="field"><label>Tipo</label><select value={f.tipo} onChange={set('tipo')}>{opt(TIPOS)}</select></div>
            <div className="field"><label>Status</label><select value={f.status} onChange={set('status')}>{opt(STATUS)}</select></div>
          </div>
          <div className="form-row" style={{ '--cols': 3 }}>
            <div className="field"><label>{f.finalidade === 'aluguel' ? 'Aluguel mensal (R$) *' : 'Preço de venda (R$) *'}</label><input type="number" min="0" step="1" required value={f.preco} onChange={set('preco')} /></div>
            <div className="field"><label>Condomínio (R$)</label><input type="number" min="0" value={f.condominio} onChange={set('condominio')} /></div>
            <div className="field"><label>IPTU (R$)</label><input type="number" min="0" value={f.iptu} onChange={set('iptu')} /></div>
          </div>
          <label className="switch"><input type="checkbox" checked={f.destaque} onChange={(e) => setF({ ...f, destaque: e.target.checked })} /> Exibir nos destaques da página inicial</label>
        </div>

        <div className="panel form">
          <h3 style={{ fontSize: '1.3rem' }}>Dados do imóvel</h3>
          <div className="form-row" style={{ '--cols': 5 }}>
            {[['area_m2', 'Área (m²)'], ['quartos', 'Quartos'], ['suites', 'Suítes'], ['banheiros', 'Banheiros'], ['vagas', 'Vagas']].map(([k, l]) => <div className="field" key={k}><label>{l}</label><input type="number" min="0" value={f[k]} onChange={set(k)} /></div>)}
          </div>
          <div className="field"><label>Descrição</label><textarea placeholder="Conte a história do imóvel: ambientes, acabamentos, vizinhança…" value={f.descricao} onChange={set('descricao')} /></div>
          <div className="field"><label>Comodidades</label>
            <div className="check-chips">{COMODIDADES.map((c) => <label key={c}><input type="checkbox" checked={coms.has(c)} onChange={(e) => setComs((s) => { const n = new Set(s); e.target.checked ? n.add(c) : n.delete(c); return n; })} /><span>{c}</span></label>)}</div>
            <input placeholder="Outras, separadas por vírgula" value={extra} onChange={(e) => setExtra(e.target.value)} style={{ marginTop: '.5rem' }} />
          </div>
        </div>

        <div className="panel form">
          <h3 style={{ fontSize: '1.3rem' }}>Endereço</h3>
          <div className="form-row" style={{ '--cols': 3 }}>
            <div className="field"><label>CEP</label><input inputMode="numeric" placeholder="00000-000" value={f.cep} onChange={set('cep')} onBlur={cepBlur} /></div>
            <div className="field" style={{ gridColumn: 'span 2' }}><label>Endereço</label><input value={f.endereco} onChange={set('endereco')} placeholder="Rua, número" /></div>
          </div>
          <div className="form-row" style={{ '--cols': 3 }}>
            <div className="field"><label>Bairro</label><input value={f.bairro} onChange={set('bairro')} /></div>
            <div className="field"><label>Cidade *</label><input required value={f.cidade} onChange={set('cidade')} onBlur={() => { if (!f.latitude) localizar(true); }} /></div>
            <div className="field"><label>UF</label><input maxLength={2} value={f.estado} onChange={set('estado')} /></div>
          </div>
          <div className="field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: '.6rem', flexWrap: 'wrap' }}>
              <label>Posição no mapa <span style={{ fontWeight: 400 }}>{f.latitude ? '· definida' : '· não definida'}</span></label>
              <button type="button" className="btn btn-ghost btn-sm" disabled={geoBusy} onClick={() => localizar(false)}><Icon name="pin" /> Localizar pelo endereço</button>
            </div>
            <MapaSeletor lat={f.latitude} lng={f.longitude} onChange={setPos} />
            <p className="muted" style={{ fontSize: '.8rem', margin: '.2rem 0 0' }}>Clique no mapa ou arraste o marcador para ajustar. É o que aparece na busca por mapa.</p>
          </div>
        </div>

        <div className="panel form">
          <h3 style={{ fontSize: '1.3rem' }}>Fotos</h3>
          <label className={`dropzone ${over ? 'over' : ''}`}
            onDragEnter={(e) => { if (dragFrom.current !== null) return; e.preventDefault(); setOver(true); }}
            onDragOver={(e) => { if (dragFrom.current !== null) return; e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { setOver(false); if (dragFrom.current !== null) return; e.preventDefault(); addFiles(e.dataTransfer.files); }}>
            <Icon name="upload" /><strong>Arraste as fotos aqui</strong><br /><span className="muted" style={{ fontSize: '.88rem' }}>ou clique para escolher · a primeira é a capa · arraste para reordenar</span>
            <input type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          </label>
          <div className="thumbs">
            {fotos.map((x, i) => (
              <div key={x.id || x.preview} className="thumb" draggable
                onDragStart={(e) => { dragFrom.current = i; e.currentTarget.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; }}
                onDragEnd={(e) => { dragFrom.current = null; e.currentTarget.classList.remove('dragging'); }}
                onDragOver={(e) => { if (dragFrom.current !== null) e.preventDefault(); }}
                onDrop={(e) => { if (dragFrom.current === null) return; e.preventDefault(); e.stopPropagation(); move(dragFrom.current, i); }}>
                <img src={x.preview} alt="" />
                {i === 0 && <span className="tag accent cover-tag">Capa</span>}
                <div className="tools">
                  <button type="button" aria-label="Mover para a esquerda" onClick={() => move(i, i - 1)}><Icon name="left" /></button>
                  {i > 0 && <button type="button" aria-label="Tornar capa" onClick={() => move(i, 0)}><Icon name="star" /></button>}
                  <button type="button" aria-label="Mover para a direita" onClick={() => move(i, i + 1)}><Icon name="right" /></button>
                  <button type="button" aria-label="Remover" onClick={() => remover(i)}><Icon name="trash" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel form">
          <h3 style={{ fontSize: '1.3rem' }}>Responsável pelo imóvel</h3>
          <div className="field"><label>Corretor responsável</label>
            <select value={f.responsavel_id} onChange={set('responsavel_id')}>
              {equipe.map((p) => <option key={p.id} value={p.id}>{p.nome || p.email}{p.creci ? ' — ' + p.creci : ''}</option>)}
              <option value="">Sem corretor definido (contato geral da Alvar)</option>
            </select>
          </div>
          {!equipe.length && <p className="notice" style={{ margin: 0, fontSize: '.86rem' }}>Ainda não há corretores aprovados. Aprove um em <b>Aprovações</b> ou mude o papel de alguém em <b>Equipe</b>.</p>}
          <p className="muted" style={{ fontSize: '.85rem', margin: 0 }}>Ele aparece na página do imóvel e recebe os interessados.</p>
        </div>

        <div className="form-actions">
          <Link className="btn btn-ghost" to="/conta/imoveis" style={{ background: 'var(--surface)' }}>Cancelar</Link>
          <button className="btn btn-ghost" type="submit" data-sit="rascunho" style={{ background: 'var(--surface)' }} disabled={!!busy}>{busy?.sit === 'rascunho' ? <><Spinner /> {busy.txt}</> : 'Salvar rascunho'}</button>
          <button className="btn btn-accent" type="submit" data-sit="publicado" disabled={!!busy}>{busy?.sit === 'publicado' ? <><Spinner /> {busy.txt}</> : <><Icon name="check" /> {principal}</>}</button>
        </div>
      </form>
    </>
  );
}
