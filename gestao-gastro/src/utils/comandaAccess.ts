/**
 * Regex: aceita somente origens LAN privadas com protocolo e porta obrigatoria.
 * Aceita: http://192.168.x.x:PORTA, http://10.x.x.x:PORTA, http://172.16-31.x.x:PORTA
 * Rejeita: localhost, 127.x.x.x, IPs publicos e formatos sem IP privado.
 */
const PRIVATE_LAN_ORIGIN_REGEX =
  /^https?:\/\/(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}):\d{2,5}$/;

/** Motivos de rejeicao da origem LAN para feedback ao usuario. */
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

const getFallbackLanParts = (fallbackOrigin?: string) => {
  try {
    const parsed = fallbackOrigin ? new URL(fallbackOrigin) : null;
    return {
      protocol: parsed?.protocol === 'https:' ? 'https' : 'http',
      port: parsed?.port || '3000',
    };
  } catch {
    return { protocol: 'http', port: '3000' };
  }
};

const normalizeLanInput = (raw: string, fallbackOrigin?: string) => {
  const trimmed = raw.trim();
  const fallback = getFallbackLanParts(fallbackOrigin);
  const hasScheme = /^https?:\/\//i.test(trimmed);
  const candidate = hasScheme ? trimmed : `${fallback.protocol}://${trimmed}`;
  const parsed = new URL(candidate);
  const originalPort = parsed.port;

  if (!parsed.port && fallback.port) {
    parsed.port = fallback.port;
  }

  return {
    parsed,
    normalized: parsed.origin,
    inferredProtocol: !hasScheme,
    inferredPort: !originalPort && Boolean(fallback.port),
    hadPath: parsed.pathname !== '/' || Boolean(parsed.search) || Boolean(parsed.hash),
  };
};

/**
 * Valida e normaliza um valor digitado pelo administrador no campo de origem LAN.
 * Aceita IP puro, IP:porta ou URL completa e retorna `protocolo://IP:porta`.
 */
export function validateLanOrigin(raw: string, fallbackOrigin?: string): LanValidationResult {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { valid: false, origin: null, error: 'empty', message: 'Informe um endereco de rede local.' };
  }

  if (/localhost/i.test(trimmed) || /127\.\d+\.\d+\.\d+/.test(trimmed)) {
    return {
      valid: false,
      origin: null,
      error: 'loopback',
      message: 'Nao use localhost ou 127.0.0.1. Informe o IPv4 da maquina na rede Wi-Fi, como 192.168.1.105.',
    };
  }

  let normalized: ReturnType<typeof normalizeLanInput>;
  try {
    normalized = normalizeLanInput(trimmed, fallbackOrigin);
  } catch {
    return {
      valid: false,
      origin: null,
      error: 'invalid_format',
      message: 'Formato invalido. Use 192.168.1.105, 192.168.1.105:3000 ou http://192.168.1.105:3000.',
    };
  }

  if (!normalized.parsed.port) {
    return {
      valid: false,
      origin: null,
      error: 'missing_port',
      message: 'Porta obrigatoria. Use 192.168.1.105:3000 ou http://192.168.1.105:3000.',
    };
  }

  if (!PRIVATE_LAN_ORIGIN_REGEX.test(normalized.normalized)) {
    return {
      valid: false,
      origin: null,
      error: 'invalid_format',
      message: 'O IP nao e de uma rede privada valida. Use 192.168.x.x, 10.x.x.x ou 172.16-31.x.x.',
    };
  }

  const adjustments = [
    normalized.inferredProtocol ? 'protocolo http adicionado' : '',
    normalized.inferredPort ? `porta ${normalized.parsed.port} adicionada` : '',
    normalized.hadPath ? 'caminho removido' : '',
  ].filter(Boolean);

  return {
    valid: true,
    origin: normalized.normalized,
    message: adjustments.length > 0
      ? `Endereco normalizado: ${normalized.normalized} (${adjustments.join(', ')}).`
      : undefined,
  };
}

/**
 * Monta a URL completa de acesso a Comanda Mobile.
 * Em producao (nao-localhost), usa o dominio HTTPS oficial para acesso externo.
 * Em modo local, usa uma origem LAN privada validada.
 */
export const getComandaAccessUrl = (
  windowOrigin: string,
  pathname: string,
  waiterAccessMode: 'local' | 'external' = 'local',
  waiterLocalOrigin?: string,
  localTestOrigin?: string
): string => {
  const isLocal = windowOrigin.includes('localhost') || windowOrigin.includes('127.0.0.1');
  const accessParam = `?access=${waiterAccessMode}`;

  let baseOrigin = 'https://www.sistemasdegestao.tech';

  if (waiterAccessMode === 'local') {
    const targetOrigin = waiterLocalOrigin || localTestOrigin;
    if (targetOrigin) {
      const validation = validateLanOrigin(targetOrigin, windowOrigin);
      if (validation.valid && validation.origin) {
        baseOrigin = validation.origin;
      } else if (isLocal) {
        baseOrigin = windowOrigin;
      }
    } else if (isLocal) {
      baseOrigin = windowOrigin;
    }
  }

  const match = pathname.match(/^\/gestao-gastro\/([^/]+)/);
  if (match) {
    return `${baseOrigin}/gestao-gastro/${match[1]}/comanda${accessParam}`;
  }

  return `${baseOrigin}/comanda${accessParam}`;
};
