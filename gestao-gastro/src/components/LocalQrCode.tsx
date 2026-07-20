import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface LocalQrCodeProps {
  value: string;
  label: string;
  onReady?: (dataUrl: string) => void;
}

export const LocalQrCode = ({ value, label, onReady }: LocalQrCodeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    let active = true;
    setRenderError(false);
    void QRCode.toCanvas(canvasRef.current, value, {
      width: 220,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    }).then(() => {
      if (active && canvasRef.current) onReady?.(canvasRef.current.toDataURL('image/png'));
    }).catch(() => {
      if (active) setRenderError(true);
    });
    return () => { active = false; };
  }, [onReady, value]);

  if (renderError) {
    return <p role="alert" className="p-4 text-xs font-semibold text-red-600">Não foi possível gerar o QR Code neste dispositivo.</p>;
  }

  return <canvas ref={canvasRef} role="img" aria-label={label} className="mx-auto max-w-full" />;
};
