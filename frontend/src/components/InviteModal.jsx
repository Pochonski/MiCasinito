import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const InviteModal = ({ open, roomCode, inviteUrl, hostName, onDismiss, onOpenRoom, strings, opening = false }) => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setCopyError('');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setCopyError('');
      setTimeout(() => setCopied(false), 2200);
    } catch (error) {
      console.warn('Clipboard copy failed', error);
      setCopyError(strings?.copyError || 'Copy not available on this device.');
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="invite-modal-title">
      <div className="modal-panel invite-modal">
        <div className="modal-header">
          <h2 id="invite-modal-title">{strings?.title}</h2>
          <button type="button" className="modal-close" onClick={onDismiss} aria-label={strings?.actions?.close || 'Close'}>
            ×
          </button>
        </div>
        <div className="modal-body invite-body">
          <p className="invite-caption">
            {strings?.description?.replace('{hostName}', hostName || '')}
          </p>
          <div className="invite-code-card">
            <span className="invite-code-label">{strings?.codeLabel}</span>
            <strong className="invite-code-value">{roomCode}</strong>
          </div>
          <div className="invite-link-group">
            <input type="text" value={inviteUrl || ''} readOnly spellCheck={false} />
            <button type="button" className="secondary-button" onClick={handleCopy}>
              {copied ? strings?.actions?.copied : strings?.actions?.copy}
            </button>
          </div>
          {copyError && <p className="modal-error">{copyError}</p>}
          {inviteUrl && (
            <div className="invite-qr">
              <QRCodeSVG value={inviteUrl} size={160} bgColor="transparent" fgColor="#ffffff" />
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onDismiss}>
              {strings?.actions?.dismiss}
            </button>
            <button type="button" className="primary-button" onClick={onOpenRoom} disabled={opening}>
              {opening ? (strings?.actions?.opening || 'Abriendo...') : strings?.actions?.openRoom}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;
