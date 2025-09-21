import { FunctionComponent } from 'react';
import styles from './Download.module.css';
import spinnerIcon from '../assets/spinner-10.svg';

const DownloadChecking: FunctionComponent = () => {
  return (
    <div className={styles.frameParent}>
      <div className={styles.transferInformationParent}>
        <div className={styles.transferInformation}>Transfer information</div>
        <div className={styles.frameWrapper}>
          <div className={styles.signInToVerifyAndDownloadWrapper}>
            <div className={styles.signInTo}>Sign in to verify and download your confidential files.</div>
          </div>
          <div className={styles.checkingSpinnerContainer}>
            <img src={spinnerIcon} alt="Loading" className={styles.checkingSpinner} />
            <div className={styles.checkingText}>Checking the encrypted file</div>
          </div>
        </div>
      </div>
      <div className={styles.frameChild} />
      <div className={styles.onlyTheAuthorizedReceiverCWrapper}>
        <div className={styles.onlyTheAuthorized}>Only the authorized receiver can access this file — not us, not Sui/Walrus validators.</div>
      </div>
    </div>);
};

export default DownloadChecking;