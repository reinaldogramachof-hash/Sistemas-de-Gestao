/**
 * Regex: aceita somente origens LAN privadas com protocolo e porta obrigatória.
 * Aceita: http://192.168.x.x:PORTA, http://10.x.x.x:PORTA, http://172.16-31.x.x:PORTA
 * Rejeita: localhost, 127.x.x.x, IPs públicos, caminhos, query, hash, porta ausente.
 */
const PRIVATE_LAN_ORIGIN_REGEX =
  /^https?:\/\/(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}):\d{2,5}$/;

/** Motivos de rejeição da origem LAN (para feedback ao usuário). */
export type LanValidationError =
  | 'empty'
  | 'has_path'
  | 'localhost'
  | 'loopback'
  | 'missing_port'
  | 'invalid_format';

export interface LanValidationResult {
  valid: boolean;
  origin: string | null;
  error?: LanValidationError;
  message?: string;
}

/**
 * Valida e normaliza um valor digitado pelo administrador no campo de origem LAN.
 * Extrai somente `protocolo://IP:porta`, descartando qualquer caminho, query ou hash.
 */
export function validateLanOrigin(raw: string): LanValidationResult {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { valid: false, origin: null, error: 'empty', message: 'Informe um endereço de rede local.' };
  }

  // Se contiver localhost ou 127.x, rejeitar
  if (/localhost/i.test(trimmed) || /127\.\d+\.\d+\.\d+/.test(trimmed)) {
    return {
      valid: false,
      origin: null,
      error: 'loopback',
      message: 'Não é permitido usar "localhost" ou "127.0.0.1". Informe o IP da sua máquina na rede Wi-Fi (ex: 192.168.0.10).'
    };
  }

  // Tenta extrair protocolo + host (descartando caminhos)
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      origin: null,
      error: 'invalid_format',
      message: 'Formato inválido. Use: http://192.168.0.10:3000'
    };
  }

  const originOnly = parsed.origin; // "http://192.168.0.10:3000"

  // Se o valor original tinha caminho/query, avisar que será descartado
  const hasPath = parsed.pathname !== '/' || !!parsed.search || !!parsed.hash;

  // Porta obrigatória
  if (!parsed.port) {
    return {
      valid: false,
      origin: null,
      error: 'missing_port',
      message: 'Porta obrigatória. Use: http://192.168.0.10:3000'
    };
  }

  // Valida contra regex de rede privada
  if (!PRIVATE_LAN_ORIGIN_REGEX.test(originOnly)) {
    return {
      valid: false,
      origin: null,
      error: 'invalid_format',
      message: 'O IP não é de uma rede privada válida (192.168.x.x, 10.x.x.x ou 172.16-31.x.x). Verifique e tente novamente.'
    };
  }

  return {
    valid: true,
    origin: originOnly,
    // Avisa se houve caminho descartado (para feedback suave, sem bloquear)
    message: hasPath
      ? `Caminho removido automaticamente. Origem salva: ${originOnly}`
      : undefined
  };
}

/**
 * Monta a URL completa de acesso à Comanda Mobile.
 * Em produção (não-localhost), sempre usa o domínio HTTPS oficial.
 * Em desenvolvimento, usa localTestOrigin se válido.
 */
export const getComandaAccessUrl = (
  windowOrigin: string,
  pathname: string,
  waiterAccessMode: 'local' | 'external' = 'local',
  waiterLocalOrigin?: string,
  localTestOrigin?: string // Fallback antigo
): string => {
  const isLocal = windowOrigin.includes('localhost') || windowOrigin.includes('127.0.0.1');

  let baseOrigin: string = 'https://www.sistemasdegestao.tech';

  if (waiterAccessMode === 'local') {
    const targetOrigin = waiterLocalOrigin || localTestOrigin;
    if (targetOrigin) {
      const validation = validateLanOrigin(targetOrigin);
      if (validation.valid && validation.origin) {
        baseOrigin = validation.origin;
      } else if (isLocal) {
        baseOrigin = windowOrigin;
      }
    } else if (isLocal) {
      baseOrigin = windowOrigin;
    }
  }

  // Extrai o slug do pathname (/gestao-gastro/<slug>/...)
  const match = pathname.match(/^\/gestao-gastro\/([^/]+)/);
  if (match) {
    return `${baseOrigin}/gestao-gastro/${match[1]}/comanda`;
  }

  return `${baseOrigin}/comanda`;
};

export const getComandaQrImageUrl = (accessUrl: string): string => {
  const data = encodeURIComponent(accessUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=12&data=${data}`;
};
