const configuredLicenseApiUrl = import.meta.env.VITE_LICENSE_API_URL?.trim();

const licenseApiUrl = configuredLicenseApiUrl || '/api_licenca_ml.php';

export const getLicenseApiUrl = (action: string): string => {
  const separator = licenseApiUrl.includes('?') ? '&' : '?';
  return `${licenseApiUrl}${separator}action=${encodeURIComponent(action)}`;
};
