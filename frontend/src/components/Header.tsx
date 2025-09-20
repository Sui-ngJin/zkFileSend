import { FunctionComponent } from 'react';
import { ConnectButton } from '@mysten/dapp-kit';
import styles from './Header.module.css';

interface HeaderProps {
  currentTab: 'send' | 'download';
  onTabChange: (tab: 'send' | 'download') => void;
}

const Header: FunctionComponent<HeaderProps> = ({ currentTab, onTabChange }) => {
  return (
    <div className={styles.header}>
      <div className={styles.zkfilesendParent}>
        <b className={styles.zkfilesend}>zkFileSend</b>
        <div className={styles.pushButton}>
          <div className={styles.label}>beta</div>
        </div>
      </div>
      <div className={styles.signInWrapper}>
        <ConnectButton connectText="Sign in" />
      </div>
      <div className={styles.frameParent}>
        <div
          className={currentTab === 'send' ? styles.sendWrapper : styles.sendWrapperInactive}
          onClick={(e) => {
            e.preventDefault();
            onTabChange('send');
          }}
        >
          <div className={styles.signIn}>Send</div>
        </div>
        <div
          className={currentTab === 'download' ? styles.downloadWrapperActive : styles.downloadWrapper}
          onClick={(e) => {
            e.preventDefault();
            onTabChange('download');
          }}
        >
          <div className={styles.signIn}>Download</div>
        </div>
      </div>
    </div>
  );
};

export default Header;