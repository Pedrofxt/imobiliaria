-- =========================================================
--  ALVAR IMÓVEIS — dados de exemplo (opcional)
--  Rode DEPOIS do schema.sql e DEPOIS de entrar no site com o Google
--  pela primeira vez: os imóveis ficam sob responsabilidade do primeiro
--  administrador. As fotos de exemplo vêm do Unsplash (URLs externas).
-- =========================================================
do $$
declare
  resp uuid := (select id from public.profiles where papel = 'admin' order by created_at limit 1);
  novo uuid;
begin
  insert into public.imoveis (titulo, descricao, tipo, finalidade, status, preco, condominio, iptu, area_m2, quartos, suites, banheiros, vagas, cep, endereco, bairro, cidade, estado, comodidades, destaque, responsavel_id, criado_por)
  values ('Casa contemporânea com piscina e vista para a baía', 'Projeto assinado, com pé-direito duplo, grandes panos de vidro e integração total entre living, cozinha gourmet e área da piscina.

A suíte master tem closet, banheira e varanda voltada para o nascer do sol sobre a baía. Automação de iluminação, energia solar e jardim com paisagismo nativo.', 'casa', 'venda', 'disponivel', 2450000, 0, 4200, 380, 4, 3, 5, 3, '83203-000', 'Rua das Gaivotas, 88', 'Jardim Iguaçu', 'Paranaguá', 'PR', array['Piscina','Churrasqueira','Energia solar','Automação','Jardim','Closet','Lareira']::text[], true, resp, resp)
  returning id into novo;
  insert into public.imovel_fotos (imovel_id, url, ordem) values
    (novo, 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=75', 0),
    (novo, 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=75', 1),
    (novo, 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=75', 2),
    (novo, 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=75', 3),
    (novo, 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1600&q=75', 4);

  insert into public.imoveis (titulo, descricao, tipo, finalidade, status, preco, condominio, iptu, area_m2, quartos, suites, banheiros, vagas, cep, endereco, bairro, cidade, estado, comodidades, destaque, responsavel_id, criado_por)
  values ('Apartamento garden com terraço arborizado', 'Garden de 142 m² com terraço privativo de 60 m², ideal para quem não abre mão de verde. Prédio com academia, salão de festas e bicicletário.', 'apartamento', 'venda', 'disponivel', 890000, 980, 1800, 142, 3, 1, 2, 2, '83203-550', 'Av. Gabriel de Lara, 1500', 'Centro', 'Paranaguá', 'PR', array['Terraço','Academia','Salão de festas','Portaria 24h','Pet friendly']::text[], true, resp, resp)
  returning id into novo;
  insert into public.imovel_fotos (imovel_id, url, ordem) values
    (novo, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=75', 0),
    (novo, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=75', 1),
    (novo, 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1600&q=75', 2),
    (novo, 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1600&q=75', 3);

  insert into public.imoveis (titulo, descricao, tipo, finalidade, status, preco, condominio, iptu, area_m2, quartos, suites, banheiros, vagas, cep, endereco, bairro, cidade, estado, comodidades, destaque, responsavel_id, criado_por)
  values ('Loft industrial mobiliado perto do centro histórico', 'Loft com tijolinho aparente, mezanino e janelas altas. Totalmente mobiliado — é só trazer as malas.', 'apartamento', 'aluguel', 'disponivel', 3200, 450, 90, 68, 1, 1, 1, 1, '83203-010', 'Rua XV de Novembro, 410', 'Centro Histórico', 'Paranaguá', 'PR', array['Mobiliado','Mezanino','Ar-condicionado','Pet friendly']::text[], false, resp, resp)
  returning id into novo;
  insert into public.imovel_fotos (imovel_id, url, ordem) values
    (novo, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=75', 0),
    (novo, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1600&q=75', 1),
    (novo, 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1600&q=75', 2);

  insert into public.imoveis (titulo, descricao, tipo, finalidade, status, preco, condominio, iptu, area_m2, quartos, suites, banheiros, vagas, cep, endereco, bairro, cidade, estado, comodidades, destaque, responsavel_id, criado_por)
  values ('Casa de praia pé na areia em Pontal do Sul', 'Acorde com o som do mar. Varanda ampla com redes, deck de madeira e acesso direto à praia.', 'casa', 'venda', 'reservado', 1290000, 0, 2100, 210, 3, 2, 3, 2, '83255-000', 'Av. Beira-Mar, 2201', 'Pontal do Sul', 'Pontal do Paraná', 'PR', array['Frente para o mar','Varanda','Churrasqueira','Deck']::text[], true, resp, resp)
  returning id into novo;
  insert into public.imovel_fotos (imovel_id, url, ordem) values
    (novo, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=75', 0),
    (novo, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=75', 1),
    (novo, 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=75', 2);

  insert into public.imoveis (titulo, descricao, tipo, finalidade, status, preco, condominio, iptu, area_m2, quartos, suites, banheiros, vagas, cep, endereco, bairro, cidade, estado, comodidades, destaque, responsavel_id, criado_por)
  values ('Cobertura duplex com piscina privativa', 'Duplex no último andar com piscina aquecida, espaço gourmet e vista 270° para o oceano.', 'cobertura', 'venda', 'disponivel', 1890000, 1600, 3300, 260, 4, 4, 5, 3, '83260-000', 'Rua Atlântica, 77', 'Caiobá', 'Matinhos', 'PR', array['Piscina','Vista para o mar','Espaço gourmet','Elevador','Portaria 24h']::text[], false, resp, resp)
  returning id into novo;
  insert into public.imovel_fotos (imovel_id, url, ordem) values
    (novo, 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=75', 0),
    (novo, 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=75', 1),
    (novo, 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=75', 2);

  insert into public.imoveis (titulo, descricao, tipo, finalidade, status, preco, condominio, iptu, area_m2, quartos, suites, banheiros, vagas, cep, endereco, bairro, cidade, estado, comodidades, destaque, responsavel_id, criado_por)
  values ('Sobrado familiar com quintal e edícula', 'Sobrado em rua tranquila, quintal gramado, edícula com churrasqueira e lavanderia independente.', 'casa', 'aluguel', 'disponivel', 4800, 0, 180, 190, 3, 1, 3, 2, '83206-000', 'Rua dos Ipês, 35', 'Estradinha', 'Paranaguá', 'PR', array['Quintal','Edícula','Churrasqueira','Pet friendly']::text[], false, resp, resp)
  returning id into novo;
  insert into public.imovel_fotos (imovel_id, url, ordem) values
    (novo, 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1600&q=75', 0),
    (novo, 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1600&q=75', 1),
    (novo, 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1600&q=75', 2);

  insert into public.imoveis (titulo, descricao, tipo, finalidade, status, preco, condominio, iptu, area_m2, quartos, suites, banheiros, vagas, cep, endereco, bairro, cidade, estado, comodidades, destaque, responsavel_id, criado_por)
  values ('Sala comercial em edifício corporativo', 'Sala pronta para uso, com piso elevado, ar central e recepção compartilhada no térreo.', 'comercial', 'aluguel', 'disponivel', 2900, 620, 140, 54, 0, 0, 1, 1, '83206-300', 'Av. Roque Vernalha, 900', 'Vila Paranaguá', 'Paranaguá', 'PR', array['Ar-condicionado','Recepção','Elevador','Gerador']::text[], false, resp, resp)
  returning id into novo;
  insert into public.imovel_fotos (imovel_id, url, ordem) values
    (novo, 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=75', 0),
    (novo, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=75', 1);

  insert into public.imoveis (titulo, descricao, tipo, finalidade, status, preco, condominio, iptu, area_m2, quartos, suites, banheiros, vagas, cep, endereco, bairro, cidade, estado, comodidades, destaque, responsavel_id, criado_por)
  values ('Terreno plano em condomínio fechado', 'Lote de 450 m², plano e documentado, em condomínio com segurança e área de lazer completa.', 'terreno', 'venda', 'disponivel', 320000, 380, 600, 450, 0, 0, 0, 0, '83209-000', 'Alameda das Bromélias, Lote 14', 'Condomínio Mata Atlântica', 'Paranaguá', 'PR', array['Condomínio fechado','Segurança 24h','Área verde']::text[], false, resp, resp)
  returning id into novo;
  insert into public.imovel_fotos (imovel_id, url, ordem) values
    (novo, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=75', 0);

  insert into public.imoveis (titulo, descricao, tipo, finalidade, status, preco, condominio, iptu, area_m2, quartos, suites, banheiros, vagas, cep, endereco, bairro, cidade, estado, comodidades, destaque, responsavel_id, criado_por)
  values ('Casa térrea moderna com jardim de inverno', 'Térrea, iluminada, com jardim de inverno no coração da casa. Acabamento em porcelanato e esquadrias de alumínio.', 'casa', 'venda', 'disponivel', 760000, 0, 1500, 165, 3, 1, 2, 2, '83203-200', 'Rua Manoel Bonifácio, 260', 'Oceania', 'Paranaguá', 'PR', array['Jardim de inverno','Churrasqueira','Aquecimento a gás']::text[], true, resp, resp)
  returning id into novo;
  insert into public.imovel_fotos (imovel_id, url, ordem) values
    (novo, 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1600&q=75', 0),
    (novo, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=75', 1),
    (novo, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1600&q=75', 2);

end $$;
