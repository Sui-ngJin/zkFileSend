import { FunctionComponent } from 'react';
import styles from './Download.module.css';

const DownloadAuthorizedInvalid: FunctionComponent = () => {
  return (
    <div className={styles.contentSection}>
      <div className={styles.transferInfo}>
        <h3>Transfer information</h3>
        <div className={styles.transferDetails}>
          <div className={styles.transferItem}>
            <label>Sender</label>
            <span>****@domain.com</span>
          </div>
          <div className={styles.transferItem}>
            <label>File</label>
            <span>*********.png</span>
            <span className={styles.fileSize}>61.8KB</span>
          </div>
        </div>
        <div className={styles.disclaimer}>
          • zkFileSend does not guarantee the contents of any file. We recommend downloading only when you know and trust the sender or the sender's affiliation.
        </div>
        <div className={styles.verificationNote}>
          Request to verify the sender's affiliation (Coming soon)
        </div>
      </div>

      <button className={styles.unauthorizedButton} disabled>
        ⚠ You're not the authorized receiver
      </button>

      <div className={styles.authNote}>
        Only the authorized receiver can access this file — not us, not Sui/Walrus validators.
      </div>
    </div>
  );
};

export default DownloadAuthorizedInvalid;