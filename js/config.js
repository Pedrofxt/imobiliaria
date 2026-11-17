// =========================================================
//  CONFIGURAÇÃO DO SUPABASE
//  Cole aqui os dados do seu projeto (Project Settings → API).
//  A chave "anon"/"publishable" é pública por natureza — a segurança
//  vem das políticas RLS definidas em supabase/schema.sql.
//
//  Enquanto os valores abaixo não forem trocados, o site roda em
//  MODO DEMONSTRAÇÃO (dados de exemplo salvos só no navegador).
// =========================================================
export const SUPABASE_URL = 'https://esotkfzgmkncfkqbaiho.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_3vv5Cu_rtoc3ylogst2KrA_4k5y1riY';

// Bucket do Storage onde as fotos são salvas
export const STORAGE_BUCKET = 'imoveis';

export const SITE = {
  nome: 'Alvar',
  slogan: 'Endereços que contam histórias.',
  whatsapp: '5541999990000',
  email: 'contato@alvarimoveis.com.br',
  endereco: 'Rua das Palmeiras, 120 · Centro · Paranaguá – PR',
};
