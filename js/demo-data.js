// Dados fictícios usados no modo demonstração e no seed.sql
const u = (id, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=75`;

export const DEMO_PROFILES = [
  { id: 'p-helena', nome: 'Helena Caravelas', email: 'helena@alvarimoveis.com.br', telefone: '41999990001', creci: 'CRECI-PR 41.221', cargo: 'Diretora comercial', bio: 'Vinte anos aproximando famílias de casas com alma. Especialista em alto padrão no litoral.', papel: 'admin', avatar_url: null },
  { id: 'p-rafael', nome: 'Rafael Monteverde', email: 'rafael@alvarimoveis.com.br', telefone: '41999990002', creci: 'CRECI-PR 52.890', cargo: 'Corretor · Locação', bio: 'Locação residencial e corporativa. Responde rápido e conhece cada rua de Paranaguá.', papel: 'corretor', avatar_url: null },
  { id: 'p-iara', nome: 'Iara Tavares', email: 'iara@alvarimoveis.com.br', telefone: '41999990003', creci: 'CRECI-PR 60.114', cargo: 'Corretora · Lançamentos', bio: 'Apaixonada por arquitetura contemporânea e plantas inteligentes.', papel: 'corretor', avatar_url: null },
  { id: 'p-otavio', nome: 'Otávio Brandão', email: 'otavio@alvarimoveis.com.br', telefone: '41999990004', creci: 'CRECI-PR 47.302', cargo: 'Corretor · Terrenos e comercial', bio: 'Terrenos, galpões e salas comerciais. Olho de investidor.', papel: 'corretor', avatar_url: null },
];

const fotos = (...ids) => ids.map((id, i) => ({ id: `f-${id.slice(6, 16)}-${i}`, url: u(id), ordem: i }));

export const DEMO_IMOVEIS = [
  {
    id: 'i-01', latitude: -25.5105, longitude: -48.5005, situacao: 'publicado', titulo: 'Casa contemporânea com piscina e vista para a baía', tipo: 'casa', finalidade: 'venda', status: 'disponivel', destaque: true,
    preco: 2450000, condominio: 0, iptu: 4200, area_m2: 380, quartos: 4, suites: 3, banheiros: 5, vagas: 3,
    endereco: 'Rua das Gaivotas, 88', bairro: 'Jardim Iguaçu', cidade: 'Paranaguá', estado: 'PR', cep: '83203-000',
    descricao: 'Projeto assinado, com pé-direito duplo, grandes panos de vidro e integração total entre living, cozinha gourmet e área da piscina.\n\nA suíte master tem closet, banheira e varanda voltada para o nascer do sol sobre a baía. Automação de iluminação, energia solar e jardim com paisagismo nativo.',
    comodidades: ['Piscina', 'Churrasqueira', 'Energia solar', 'Automação', 'Jardim', 'Closet', 'Lareira'],
    responsavel_id: 'p-helena', created_at: '2026-11-10T12:00:00Z',
    imovel_fotos: fotos('photo-1600596542815-ffad4c1539a9', 'photo-1600607687939-ce8a6c25118c', 'photo-1600566753190-17f0baa2a6c3', 'photo-1600210492486-724fe5c67fb0', 'photo-1484154218962-a197022b5858'),
  },
  {
    id: 'i-02', latitude: -25.5205, longitude: -48.5085, situacao: 'publicado', titulo: 'Apartamento garden com terraço arborizado', tipo: 'apartamento', finalidade: 'venda', status: 'disponivel', destaque: true,
    preco: 890000, condominio: 980, iptu: 1800, area_m2: 142, quartos: 3, suites: 1, banheiros: 2, vagas: 2,
    endereco: 'Av. Gabriel de Lara, 1500', bairro: 'Centro', cidade: 'Paranaguá', estado: 'PR', cep: '83203-550',
    descricao: 'Garden de 142 m² com terraço privativo de 60 m², ideal para quem não abre mão de verde. Prédio com academia, salão de festas e bicicletário.',
    comodidades: ['Terraço', 'Academia', 'Salão de festas', 'Portaria 24h', 'Pet friendly'],
    responsavel_id: 'p-iara', created_at: '2026-11-08T12:00:00Z',
    imovel_fotos: fotos('photo-1502672260266-1c1ef2d93688', 'photo-1522708323590-d24dbb6b0267', 'photo-1493809842364-78817add7ffb', 'photo-1505691938895-1758d7feb511'),
  },
  {
    id: 'i-03', latitude: -25.5168, longitude: -48.5225, situacao: 'publicado', titulo: 'Loft industrial mobiliado perto do centro histórico', tipo: 'apartamento', finalidade: 'aluguel', status: 'disponivel', destaque: false,
    preco: 3200, condominio: 450, iptu: 90, area_m2: 68, quartos: 1, suites: 1, banheiros: 1, vagas: 1,
    endereco: 'Rua XV de Novembro, 410', bairro: 'Centro Histórico', cidade: 'Paranaguá', estado: 'PR', cep: '83203-010',
    descricao: 'Loft com tijolinho aparente, mezanino e janelas altas. Totalmente mobiliado — é só trazer as malas.',
    comodidades: ['Mobiliado', 'Mezanino', 'Ar-condicionado', 'Pet friendly'],
    responsavel_id: 'p-rafael', created_at: '2026-11-06T12:00:00Z',
    imovel_fotos: fotos('photo-1560448204-e02f11c3d0e2', 'photo-1556909114-f6e7ad7d3136', 'photo-1505691938895-1758d7feb511'),
  },
  {
    id: 'i-04', latitude: -25.5795, longitude: -48.3552, situacao: 'publicado', titulo: 'Casa de praia pé na areia em Pontal do Sul', tipo: 'casa', finalidade: 'venda', status: 'reservado', destaque: true,
    preco: 1290000, condominio: 0, iptu: 2100, area_m2: 210, quartos: 3, suites: 2, banheiros: 3, vagas: 2,
    endereco: 'Av. Beira-Mar, 2201', bairro: 'Pontal do Sul', cidade: 'Pontal do Paraná', estado: 'PR', cep: '83255-000',
    descricao: 'Acorde com o som do mar. Varanda ampla com redes, deck de madeira e acesso direto à praia.',
    comodidades: ['Frente para o mar', 'Varanda', 'Churrasqueira', 'Deck'],
    responsavel_id: 'p-helena', created_at: '2026-11-03T12:00:00Z',
    imovel_fotos: fotos('photo-1512917774080-9991f1c4c750', 'photo-1600585154340-be6161a56a0c', 'photo-1600210492486-724fe5c67fb0'),
  },
  {
    id: 'i-05', latitude: -25.8205, longitude: -48.5378, situacao: 'publicado', titulo: 'Cobertura duplex com piscina privativa', tipo: 'cobertura', finalidade: 'venda', status: 'disponivel', destaque: false,
    preco: 1890000, condominio: 1600, iptu: 3300, area_m2: 260, quartos: 4, suites: 4, banheiros: 5, vagas: 3,
    endereco: 'Rua Atlântica, 77', bairro: 'Caiobá', cidade: 'Matinhos', estado: 'PR', cep: '83260-000',
    descricao: 'Duplex no último andar com piscina aquecida, espaço gourmet e vista 270° para o oceano.',
    comodidades: ['Piscina', 'Vista para o mar', 'Espaço gourmet', 'Elevador', 'Portaria 24h'],
    responsavel_id: 'p-iara', created_at: '2026-10-30T12:00:00Z',
    imovel_fotos: fotos('photo-1613490493576-7fde63acd811', 'photo-1600607687939-ce8a6c25118c', 'photo-1600566753190-17f0baa2a6c3'),
  },
  {
    id: 'i-06', latitude: -25.5402, longitude: -48.518, situacao: 'publicado', titulo: 'Sobrado familiar com quintal e edícula', tipo: 'casa', finalidade: 'aluguel', status: 'disponivel', destaque: false,
    preco: 4800, condominio: 0, iptu: 180, area_m2: 190, quartos: 3, suites: 1, banheiros: 3, vagas: 2,
    endereco: 'Rua dos Ipês, 35', bairro: 'Estradinha', cidade: 'Paranaguá', estado: 'PR', cep: '83206-000',
    descricao: 'Sobrado em rua tranquila, quintal gramado, edícula com churrasqueira e lavanderia independente.',
    comodidades: ['Quintal', 'Edícula', 'Churrasqueira', 'Pet friendly'],
    responsavel_id: 'p-rafael', created_at: '2026-10-25T12:00:00Z',
    imovel_fotos: fotos('photo-1564013799919-ab600027ffc6', 'photo-1570129477492-45c003edd2be', 'photo-1484154218962-a197022b5858'),
  },
  {
    id: 'i-07', latitude: -25.5312, longitude: -48.513, situacao: 'publicado', titulo: 'Sala comercial em edifício corporativo', tipo: 'comercial', finalidade: 'aluguel', status: 'disponivel', destaque: false,
    preco: 2900, condominio: 620, iptu: 140, area_m2: 54, quartos: 0, suites: 0, banheiros: 1, vagas: 1,
    endereco: 'Av. Roque Vernalha, 900', bairro: 'Vila Paranaguá', cidade: 'Paranaguá', estado: 'PR', cep: '83206-300',
    descricao: 'Sala pronta para uso, com piso elevado, ar central e recepção compartilhada no térreo.',
    comodidades: ['Ar-condicionado', 'Recepção', 'Elevador', 'Gerador'],
    responsavel_id: 'p-otavio', created_at: '2026-10-20T12:00:00Z',
    imovel_fotos: fotos('photo-1497366216548-37526070297c', 'photo-1486406146926-c627a92ad1ab'),
  },
  {
    id: 'i-08', latitude: -25.561, longitude: -48.545, situacao: 'publicado', titulo: 'Terreno plano em condomínio fechado', tipo: 'terreno', finalidade: 'venda', status: 'disponivel', destaque: false,
    preco: 320000, condominio: 380, iptu: 600, area_m2: 450, quartos: 0, suites: 0, banheiros: 0, vagas: 0,
    endereco: 'Alameda das Bromélias, Lote 14', bairro: 'Condomínio Mata Atlântica', cidade: 'Paranaguá', estado: 'PR', cep: '83209-000',
    descricao: 'Lote de 450 m², plano e documentado, em condomínio com segurança e área de lazer completa.',
    comodidades: ['Condomínio fechado', 'Segurança 24h', 'Área verde'],
    responsavel_id: 'p-otavio', created_at: '2026-10-15T12:00:00Z',
    imovel_fotos: fotos('photo-1500382017468-9049fed747ef'),
  },
  {
    id: 'i-09', latitude: -25.5262, longitude: -48.496, situacao: 'publicado', titulo: 'Casa térrea moderna com jardim de inverno', tipo: 'casa', finalidade: 'venda', status: 'disponivel', destaque: true,
    preco: 760000, condominio: 0, iptu: 1500, area_m2: 165, quartos: 3, suites: 1, banheiros: 2, vagas: 2,
    endereco: 'Rua Manoel Bonifácio, 260', bairro: 'Oceania', cidade: 'Paranaguá', estado: 'PR', cep: '83203-200',
    descricao: 'Térrea, iluminada, com jardim de inverno no coração da casa. Acabamento em porcelanato e esquadrias de alumínio.',
    comodidades: ['Jardim de inverno', 'Churrasqueira', 'Aquecimento a gás'],
    responsavel_id: 'p-iara', created_at: '2026-10-10T12:00:00Z',
    imovel_fotos: fotos('photo-1580587771525-78b9dba3b914', 'photo-1600585154340-be6161a56a0c', 'photo-1556909114-f6e7ad7d3136'),
  },
];
