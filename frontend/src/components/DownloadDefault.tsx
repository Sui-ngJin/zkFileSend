import { FunctionComponent } from 'react';
import styles from './Download.module.css';

interface DownloadDefaultProps {
  onSignIn: () => void;
  isDecrypting?: boolean;
}

const DownloadDefault: FunctionComponent<DownloadDefaultProps> = ({ onSignIn, isDecrypting = false }) => {
  return (
    <div className={styles.frameParent}>
      <div className={styles.transferInformationParent}>
        <div className={styles.transferInformation}>Transfer information</div>
        <div className={styles.frameGroup}>
          <div className={styles.frameContainer}>
            <div className={styles.frameWrapper}>
              <div className={styles.senderParent}>
                <div className={styles.sender}>Sender</div>
                <div className={styles.xc377fd6a}>0xc377...fd6a</div>
              </div>
            </div>
            <div className={styles.frameWrapper}>
              <div className={styles.fileParent}>
                <div className={styles.sender}>File</div>
                <div className={styles.frameParent2}>
                  <div className={styles.parent}>
                    <div className={styles.div}>********</div>
                    <div className={styles.png}>.png</div>
                  </div>
                  <div className={styles.kbWrapper}>
                    <div className={styles.kb}>61.8KB</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.zkfilesendDoesNotGuaranteeParent}>
            <div className={styles.zkfilesendDoesNotContainer}>
              <ul className={styles.zkfilesendDoesNotGuarantee}>
                <li>zkFileSend does not guarantee the contents of any file. We recommend downloading only when you know and trust the sender or the sender's affiliation.</li>
              </ul>
            </div>
            <div className={styles.youCanViewContainer}>
              <ul className={styles.zkfilesendDoesNotGuarantee}>
                <li>{`You can view the decryption transaction on the `}
                  <span className={styles.blockchainExplorer}>blockchain explorer</span>.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.frameChild} />
      <div className={styles.frameParent3}>
        <div className={styles.descryptAndDownloadWrapper} onClick={onSignIn}>
          <div className={styles.sender}>{isDecrypting ? 'Decrypting...' : 'Decrypt and download'}</div>
        </div>
        <div className={styles.onlyTheAuthorized}>Only the authorized receiver can access this file — not us, not Sui/Walrus validators.</div>
      </div>
    </div>
  );
};

export default DownloadDefault;