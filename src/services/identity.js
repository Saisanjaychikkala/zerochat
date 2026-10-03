/**
 * ZeroChat Identity Service
 * Cryptographically unique persistent device/client identity & session discriminator.
 * Ephemeral RAM WebRTC compliant: guarantees client uniqueness across tabs without cloud storage.
 */

export function getClientId() {
  if (typeof window === 'undefined') return 'cli_server';
  try {
    let id = localStorage.getItem('zerochat_client_id');
    if (!id) {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        id = `cli_${crypto.randomUUID()}`;
      } else {
        id = `cli_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
      }
      localStorage.setItem('zerochat_client_id', id);
    }
    return id;
  } catch (e) {
    return `cli_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 7)}`;
  }
}

export function getDiscriminatorTag(clientId) {
  const id = clientId || getClientId();
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(4, '0').slice(-4).toUpperCase();
  return `#${hex}`;
}

export function getTabId() {
  if (typeof window === 'undefined') return 'tab_server';
  try {
    let tabId = sessionStorage.getItem('zerochat_tab_id');
    if (!tabId) {
      tabId = `tab_${Math.random().toString(36).substr(2, 7)}`;
      sessionStorage.setItem('zerochat_tab_id', tabId);
    }
    return tabId;
  } catch (e) {
    return `tab_${Math.random().toString(36).substr(2, 7)}`;
  }
}

export function getClientProfile() {
  const clientId = getClientId();
  const discriminator = getDiscriminatorTag(clientId);
  const tabId = getTabId();
  return { clientId, discriminator, tabId };
}
