import { FunctionComponent, useState, useCallback } from 'react';
import styles from './FileSent.module.css';
import fileSentImg from '../assets/file-sent-img.svg';
import copyButton from '../assets/copy-button.svg';
import copiedButton from '../assets/copied-button.svg';
import arrowImg from '../assets/arrow.svg'

interface FileSentProps {
  onSendAnother: () => void;
  link: string;
}

const FileSent: FunctionComponent<FileSentProps> = ({ onSendAnother, link }) => {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = useCallback(async () => {
    const url = link;
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  }, [link]);

  return (
    <div className={styles.frameGroup}>
      <div className={styles.rectangleParent}>
        <div className={styles.frameChild} />
        <div className={styles.frameItem} />
        <div className={styles.frameInner} />
        <div className={styles.frameChild1} />
        <div className={styles.iconContainer}>
          <img className={styles.groupIcon} src={fileSentImg} alt="File sent" />
        </div>
      </div>
      <div className={styles.frameContainer}>
        <div className={styles.fileSentParent}>
          <div className={styles.fileSent}>File sent!</div>
          <div className={styles.frameDiv}>
            <div className={styles.frameParent}>
              <div className={styles.lilPudgy6237Parent}>
                <div className={styles.lilPudgy6237}>Lil Pudgy #6237</div>
                <div className={styles.png}>.png</div>
              </div>
              <div className={styles.kbWrapper}>
                <div className={styles.kb}>61.8KB</div>
              </div>
            </div>
            <img className={styles.frameIcon} src={arrowImg} alt="right arrow" />
            <div className={styles.receivergmailcomWrapper}>
              <div className={styles.receivergmailcom}>receiver@gmail.com</div>
            </div>
          </div>
          <div className={styles.theReceiverCanDownloadTheParent}>
            <div className={styles.theReceiverCanContainer}>
              <ul className={styles.theReceiverCanDownloadThe}>
                <li className={styles.theReceiverCan}>The receiver can download the encrypted file from the link below.</li>
                <li>Only the receiver can decrypt the file.</li>
              </ul>
            </div>
            <div className={styles.theReceiverCanContainer}>
              <ul className={styles.theReceiverCanDownloadThe}>
                <li>The link below is needed for the receiver to download the file.</li>
              </ul>
            </div>
            <div className={styles.theReceiverCanContainer}>
              <ul className={styles.theReceiverCanDownloadThe}>
                <li>Please check if the URL is correct before you share the link.</li>
              </ul>
            </div>
            <div className={styles.theReceiverCanContainer}>
              <ul className={styles.theReceiverCanDownloadThe}>
                <li>{`You can see the encrypted transfer transaction on the `}
                  <a className={styles.suiExplorer} href="https://walruscan.com/" target="_blank">
                    <span className={styles.suiExplorerSpan}>Sui explorer</span>
                  </a>.
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className={styles.httpszkfilesendiodownloadParent}>
          <div className={styles.httpszkfilesendiodownload}>
            <span>https://zkfilesend.io</span>
            <span className={styles.downloadqxvnudNtuwv8t6r3bumy}>{link}</span>
          </div>
          <div className={styles.copyWrapper} onClick={copyToClipboard}>
            <img src={isCopied ? copiedButton : copyButton} alt={isCopied ? 'Copied' : 'Copy'} />
          </div>
        </div>
        <div className={styles.sendAnotherFileWrapper} onClick={onSendAnother}>
          <div className={styles.sendAnotherFile}>Send another file</div>
        </div>
      </div>
    </div>
  );
};

export default FileSent;