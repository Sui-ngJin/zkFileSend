import { FunctionComponent } from 'react';
import styles from './Download.module.css';

interface DownloadCompleteProps {
  onTryAgain: () => void;
}

const DownloadComplete: FunctionComponent<DownloadCompleteProps> = ({ onTryAgain }) => {
  return (
    <div className={styles.contentSection}>
      <div className={styles.completeSection}>
        <div className={styles.successIcon}>
          <div className={styles.fileIcon}></div>
        </div>
        <h2>Downloaded complete!</h2>
        <div className={styles.downloadDetails}>
          <div className={styles.downloadItem}>
            <label>Sender</label>
            <span>****@domain.com</span>
          </div>
          <div className={styles.downloadItem}>
            <label>File</label>
            <span>Lil Pudgy #6237.png</span>
            <span className={styles.fileSize}>61.8KB</span>
          </div>
        </div>
        <div className={styles.blockchainLink}>
          • You can view the decryption transaction on the <a href="#" className={styles.link}>blockchain explorer</a>.
        </div>
      </div>

      <button className={styles.tryAgainButton} onClick={onTryAgain}>
        Try to send a file
      </button>
    </div>
  );
};

export default DownloadComplete;