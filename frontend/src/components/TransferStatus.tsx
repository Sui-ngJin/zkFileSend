import { FunctionComponent } from 'react';
import styles from './TransferStatus.module.css';
import spinnerIcon from '../assets/spinner-10.svg';

interface TransferStatusProps {
  isChecking?: boolean;
  checkingStep?: 'checking' | 'verified' | 'error';
}

const TransferStatus: FunctionComponent<TransferStatusProps> = ({
  isChecking = true,
  checkingStep = 'checking'
}) => {
  const getStatusText = () => {
    switch (checkingStep) {
      case 'checking':
        return 'Checking the encrypted file';
      case 'verified':
        return 'File verified successfully';
      case 'error':
        return 'Verification failed';
      default:
        return 'Checking the encrypted file';
    }
  };

  const getStatusIcon = () => {
    switch (checkingStep) {
      case 'checking':
        return (
          <div className={styles.spinnerContainer}>
            <img src={spinnerIcon} alt="Checking" className={styles.spinner} />
          </div>
        );
      case 'verified':
        return <div className={styles.checkIcon}>✓</div>;
      case 'error':
        return <div className={styles.errorIcon}>✗</div>;
      default:
        return <div className={styles.frameChild} />;
    }
  };

  return (
    <div className={styles.frameParent}>
      <div className={styles.transferInformationParent}>
        <div className={styles.transferInformation}>Transfer information</div>
        <div className={styles.frameWrapper}>
          <div className={`${styles.checkingTheEncryptedFileParent} ${checkingStep === 'error' ? styles.errorState : ''}`}>
            <div className={styles.checkingTheEncrypted}>{getStatusText()}</div>
            {getStatusIcon()}
          </div>
        </div>
      </div>
      <div className={styles.frameItem} />
      <div className={styles.onlyTheAuthorizedReceiverCWrapper}>
        <div className={styles.onlyTheAuthorized}>
          Only the authorized receiver can access this file — not us, not Sui/Walrus validators.
        </div>
      </div>
    </div>
  );
};

export default TransferStatus;