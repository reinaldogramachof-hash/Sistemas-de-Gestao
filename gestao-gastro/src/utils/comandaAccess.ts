export const getComandaAccessUrl = (origin: string, pathname: string): string => {
  const match = pathname.match(/^\/gestao-gastro\/([^/]+)/);
  if (match) {
    return `${origin}/gestao-gastro/${match[1]}/comanda`;
  }

  return `${origin}/comanda`;
};

export const getComandaQrImageUrl = (accessUrl: string): string => {
  const data = encodeURIComponent(accessUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=12&data=${data}`;
};
