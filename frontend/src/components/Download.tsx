import { FunctionComponent, useState } from 'react';
import styles from './Download.module.css';
import { FAQ } from './FAQ';
import DownloadDefault from './DownloadDefault';
import DownloadAuthorizedValid from './DownloadAuthorizedValid';
import DownloadAuthorizedInvalid from './DownloadAuthorizedInvalid';
import DownloadComplete from './DownloadComplete';
import DownloadChecking from './DownloadChecking';
import earthIcon from '../assets/earth.svg';

interface DownloadProps {
  onGoogleSignIn: () => void;
}

type DownloadState = 'checking' | 'default' | 'authorized-valid' | 'authorized-invalid' | 'complete';

const Download: FunctionComponent<DownloadProps> = ({ onGoogleSignIn }) => {
  // 쉬운 상태 변경을 위해 여기서 초기 상태를 설정하세요
  const [downloadState, setDownloadState] = useState<DownloadState>('default');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const handleSignIn = async () => {
    setIsDecrypting(true);
    try {
      // 권한 체크 시뮬레이션 (2초)
      await new Promise(resolve => setTimeout(resolve, 2000));
      // 로그인 로직
      await onGoogleSignIn();
      setDownloadState('authorized-valid'); // 테스트용
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleDownload = () => {
    setDownloadState('complete');
  };

  const handleTryAgain = () => {
    setDownloadState('default');
  };

  const renderContent = () => {
    switch (downloadState) {
      case 'checking':
        return <DownloadChecking />;
      case 'default':
        return <DownloadDefault onSignIn={handleSignIn} isDecrypting={isDecrypting} />;
      case 'authorized-valid':
        return <DownloadAuthorizedValid onDownload={handleDownload} />;
      case 'authorized-invalid':
        return <DownloadAuthorizedInvalid />;
      case 'complete':
        return <DownloadComplete onTryAgain={handleTryAgain} />;
      default:
        return <DownloadChecking />;
    }
  };

  return (
    <div className={styles.downloadContainer}>
      {/* Background Earth */}
      <img src={earthIcon} alt="Earth" className={styles.earthIcon} />
      {/* 개발용 상태 변경 버튼들 */}
      <div className={styles.devControls}>
        <button onClick={() => setDownloadState('checking')}>Checking</button>
        <button onClick={() => setDownloadState('default')}>Default</button>
        <button onClick={() => setDownloadState('authorized-valid')}>Valid</button>
        <button onClick={() => setDownloadState('authorized-invalid')}>Invalid</button>
        <button onClick={() => setDownloadState('complete')}>Complete</button>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.heroSection}>
          <h1 className={styles.title}>The World Sees Nothing.</h1>
          <div className={styles.subtitle}>
            <p>Only authorized receiver can open file.</p>
            <p>Every download is encrypted and verified.</p>
          </div>
        </div>

        {renderContent()}
      </div>

      <FAQ accentColor="#00D4A2" />

      <div className={styles.footer}>
        ©zkFileSend 2025. Powered by Sui.
      </div>
    </div>
  );
};

export default Download;