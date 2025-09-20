import { FunctionComponent, useState } from 'react';
import { ConnectButton, useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import styles from './Header.module.css';
import collapseIcon from '../assets/collapse-button.svg';
import expandIcon from '../assets/expand-button.svg';
import toggleButtonIcon from '../assets/toggle-button.svg';
import pushButtonIcon from '../assets/push-button.svg';

interface HeaderProps {
  currentTab: 'send' | 'download';
  onTabChange: (tab: 'send' | 'download') => void;
}

const Header: FunctionComponent<HeaderProps> = ({ currentTab, onTabChange }) => {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Format address for display (show first 6 and last 4 characters)
  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleSignOut = () => {
    disconnect();
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <div className={styles.header}>
      <div className={styles.zkfilesendParent}>
        <b className={styles.zkfilesend}>zkFileSend</b>
        <div className={styles.pushButton}>
          <div className={styles.label}>beta</div>
        </div>
      </div>
      <div className={styles.signInWrapper}>
        {currentAccount ? (
          <div className={styles.connectedWalletContainer}>
            <div className={styles.connectedWallet} onClick={toggleDropdown}>
              <div className={styles.address}>{formatAddress(currentAccount.address)}</div>
              <div className={styles.disclosureButton}>
                <img
                  src={isDropdownOpen ? collapseIcon : expandIcon}
                  alt={isDropdownOpen ? "Collapse" : "Expand"}
                />
              </div>
            </div>
            {isDropdownOpen && (
              <div className={styles.accountDropdown}>
                <div className={styles.dropdownFrameParent}>
                  <div className={styles.frameGroup}>
                    <div className={styles.toggleButtonParent}>
                      <img src={toggleButtonIcon} alt="Sent" className={styles.toggleButtonImg} />
                      <div className={styles.frameContainer}>
                        <div className={styles.lilPudgy6237Parent}>
                          <div className={styles.ifTheFile}>Lil Pudgy #6237</div>
                          <div className={styles.png}>.png</div>
                        </div>
                        <div className={styles.toParent}>
                          <div className={styles.to}>to</div>
                          <div className={styles.to}>receiver@gmail.com</div>
                          <div className={styles.dropdownDiv}>·</div>
                          <div className={styles.to}>61.8KB</div>
                        </div>
                      </div>
                    </div>
                    <div className={styles.sAgoParent}>
                      <div className={styles.sAgo}>3s ago</div>
                    </div>
                  </div>
                  <div className={styles.frameDiv}>
                    <div className={styles.pushButtonParent}>
                      <img src={pushButtonIcon} alt="Received" className={styles.pushButtonImg} />
                      <div className={styles.frameContainer}>
                        <div className={styles.lilPudgy6237Parent}>
                          <div className={styles.ifTheFile}>If the file name is too long</div>
                          <div className={styles.png}>.pdf</div>
                        </div>
                        <div className={styles.toParent}>
                          <div className={styles.to}>from</div>
                          <div className={styles.to}>0x48eb...cd7e</div>
                          <div className={styles.dropdownDiv}>·</div>
                          <div className={styles.to}>1.4MB</div>
                        </div>
                      </div>
                    </div>
                    <div className={styles.dAgoParent}>
                      <div className={styles.sAgo}>24d ago</div>
                    </div>
                  </div>
                </div>
                <div className={styles.signOut} onClick={handleSignOut}>Sign out</div>
              </div>
            )}
          </div>
        ) : (
          <ConnectButton connectText="Sign in" />
        )}
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